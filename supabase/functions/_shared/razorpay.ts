const RAZORPAY_API_URL = "https://api.razorpay.com/v1";
const DEFAULT_RAZORPAY_API_TIMEOUT_MS = 8_000;
const HEX_SIGNATURE_PATTERN = /^[a-f0-9]{64}$/i;

export type RazorpayOrder = {
  id: string;
  amount: number;
  amount_paid?: number;
  currency: string;
  status: string;
  receipt?: string;
};

export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  error_code?: string | null;
  error_description?: string | null;
};

type RazorpayApiConfig = {
  keyId: string;
  keySecret: string;
};

export class RazorpayServerError extends Error {
  code: string;
  status: number;
  retryable: boolean;

  constructor(
    code: string,
    message: string,
    status = 502,
    retryable = true,
  ) {
    super(message);
    this.name = "RazorpayServerError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function requiredSecret(name: string) {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new RazorpayServerError(
      "RAZORPAY_NOT_CONFIGURED",
      "Razorpay Test Mode is not configured.",
      503,
      false,
    );
  }

  return value;
}

export function getRazorpayApiConfig(): RazorpayApiConfig {
  const keyId = requiredSecret("RAZORPAY_KEY_ID");
  const keySecret = requiredSecret("RAZORPAY_KEY_SECRET");
  const mode = (Deno.env.get("RAZORPAY_MODE") || "test").trim().toLowerCase();

  if (!(["test", "live"].includes(mode))) {
    throw new RazorpayServerError(
      "INVALID_RAZORPAY_MODE",
      "The Razorpay operating mode is invalid.",
      503,
      false,
    );
  }

  if (!keyId.startsWith(`rzp_${mode}_`)) {
    throw new RazorpayServerError(
      "RAZORPAY_MODE_KEY_MISMATCH",
      `Razorpay ${mode === "test" ? "Test" : "Live"} Mode keys are not configured correctly.`,
      503,
      false,
    );
  }

  return { keyId, keySecret };
}

export function getRazorpayWebhookSecret() {
  return requiredSecret("RAZORPAY_WEBHOOK_SECRET");
}

function bytesToHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSha256Hex(payload: string, secret: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );

  return bytesToHex(signature);
}

export function timingSafeHexEqual(expected: string, received: string) {
  const normalizedExpected = expected.trim().toLowerCase();
  const normalizedReceived = received.trim().toLowerCase();

  if (
    !HEX_SIGNATURE_PATTERN.test(normalizedExpected) ||
    !HEX_SIGNATURE_PATTERN.test(normalizedReceived) ||
    normalizedExpected.length !== normalizedReceived.length
  ) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < normalizedExpected.length; index += 1) {
    difference |= normalizedExpected.charCodeAt(index) ^
      normalizedReceived.charCodeAt(index);
  }

  return difference === 0;
}

export async function verifyCheckoutSignature(
  storedOrderId: string,
  paymentId: string,
  receivedSignature: string,
  keySecret: string,
) {
  const expectedSignature = await hmacSha256Hex(
    `${storedOrderId}|${paymentId}`,
    keySecret,
  );
  return timingSafeHexEqual(expectedSignature, receivedSignature);
}

export async function verifyWebhookSignature(
  rawBody: string,
  receivedSignature: string,
  webhookSecret: string,
) {
  const expectedSignature = await hmacSha256Hex(rawBody, webhookSecret);
  return timingSafeHexEqual(expectedSignature, receivedSignature);
}

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return bytesToHex(digest);
}

function normalizeApiError(payload: unknown, fallbackCode: string) {
  const body = payload && typeof payload === "object"
    ? payload as Record<string, unknown>
    : {};
  const providerError = body.error && typeof body.error === "object"
    ? body.error as Record<string, unknown>
    : {};
  const providerCode = typeof providerError.code === "string"
    ? providerError.code.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 60)
    : "";

  return providerCode
    ? `${fallbackCode}_${providerCode.toUpperCase()}`
    : fallbackCode;
}

async function readResponseJson(response: Response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function razorpayApiRequest<T>(
  path: string,
  config: RazorpayApiConfig,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  let payload: unknown;
  const controller = new AbortController();
  const configuredTimeout = Number(
    Deno.env.get("RAZORPAY_API_TIMEOUT_MS") || DEFAULT_RAZORPAY_API_TIMEOUT_MS,
  );
  const timeoutMs = Number.isFinite(configuredTimeout)
    ? Math.min(Math.max(Math.floor(configuredTimeout), 1_000), 30_000)
    : DEFAULT_RAZORPAY_API_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(init.headers);
    headers.set(
      "Authorization",
      `Basic ${btoa(`${config.keyId}:${config.keySecret}`)}`,
    );
    headers.set("Accept", "application/json");

    if (init.body) {
      headers.set("Content-Type", "application/json");
    }

    response = await fetch(`${RAZORPAY_API_URL}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
    payload = await readResponseJson(response);
  } catch {
    if (controller.signal.aborted) {
      throw new RazorpayServerError(
        "RAZORPAY_API_TIMEOUT",
        "The secure payment provider took too long to respond.",
        504,
        true,
      );
    }

    throw new RazorpayServerError(
      "RAZORPAY_API_UNAVAILABLE",
      "The secure payment provider is temporarily unavailable.",
      503,
      true,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    throw new RazorpayServerError(
      normalizeApiError(payload, "RAZORPAY_API_ERROR"),
      "The secure payment provider could not process the request.",
      response.status >= 500 ? 503 : 502,
      response.status >= 500 || response.status === 429,
    );
  }

  if (!payload || typeof payload !== "object") {
    throw new RazorpayServerError(
      "RAZORPAY_INVALID_RESPONSE",
      "The secure payment provider returned an invalid response.",
      502,
      true,
    );
  }

  return payload as T;
}

export async function createRazorpayOrder(
  config: RazorpayApiConfig,
  input: {
    amount: number;
    currency: "INR";
    receipt: string;
    notes: Record<string, string>;
  },
) {
  if (
    !Number.isSafeInteger(input.amount) ||
    input.amount <= 0 ||
    input.currency !== "INR" ||
    input.receipt.length > 40
  ) {
    throw new RazorpayServerError(
      "INVALID_TRUSTED_ORDER_DATA",
      "The trusted Studio pack has invalid payment data.",
      500,
      false,
    );
  }

  return razorpayApiRequest<RazorpayOrder>("/orders", config, {
    method: "POST",
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      partial_payment: false,
      notes: input.notes,
    }),
  });
}

export async function fetchRazorpayPayment(
  config: RazorpayApiConfig,
  paymentId: string,
) {
  if (!/^pay_[A-Za-z0-9]+$/.test(paymentId)) {
    throw new RazorpayServerError(
      "INVALID_RAZORPAY_PAYMENT_ID",
      "The payment reference is invalid.",
      400,
      false,
    );
  }

  return razorpayApiRequest<RazorpayPayment>(
    `/payments/${encodeURIComponent(paymentId)}`,
    config,
  );
}

export function safeProviderFailure(payment: Partial<RazorpayPayment>) {
  const code = typeof payment.error_code === "string"
    ? payment.error_code.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 100)
    : "PAYMENT_FAILED";
  const message = typeof payment.error_description === "string"
    ? payment.error_description.replace(/[\r\n\t]/g, " ").slice(0, 300)
    : "The payment was not completed.";

  return { code, message };
}
