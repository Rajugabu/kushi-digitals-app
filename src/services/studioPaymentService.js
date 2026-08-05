import { supabase } from "./supabase";

const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const FUNCTION_TIMEOUT_MS = 45_000;

let razorpayScriptPromise;

export class StudioPaymentError extends Error {
  constructor(
    message,
    { code = "STUDIO_PAYMENT_FAILED", retryable = false, status = null } = {},
  ) {
    super(message);
    this.name = "StudioPaymentError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

async function readFunctionError(error, fallbackMessage) {
  let payload = null;

  if (error?.context && typeof error.context.json === "function") {
    try {
      payload = await error.context.json();
    } catch {
      payload = null;
    }
  }

  return new StudioPaymentError(
    payload?.message || fallbackMessage,
    {
      code: payload?.code || error?.name || "STUDIO_PAYMENT_FAILED",
      retryable: Boolean(payload?.retryable),
      status: error?.context?.status || null,
    },
  );
}

function ensureAuthenticatedUser(user, error) {
  if (error || !user) {
    throw new StudioPaymentError(
      "Sign in to purchase Studio credits.",
      { code: "AUTHENTICATION_REQUIRED", status: 401 },
    );
  }
}

export function formatPaise(amountPaise, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amountPaise) / 100);
}

export async function getStudioCreditPacks() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  ensureAuthenticatedUser(user, userError);

  const { data, error } = await supabase
    .from("studio_credit_packs")
    .select(
      "id, display_name, description, credits, amount_paise, currency, display_order",
    )
    .eq("active", true)
    .order("display_order", { ascending: true });

  if (error) {
    throw new StudioPaymentError(
      "Studio credit packs could not be loaded.",
      { code: "STUDIO_PACKS_LOAD_FAILED", retryable: true },
    );
  }

  return (data || []).map((pack) => ({
    id: pack.id,
    name: pack.display_name,
    description: pack.description,
    credits: Number(pack.credits),
    amountPaise: Number(pack.amount_paise),
    currency: pack.currency,
  }));
}

export async function getRecentStudioPurchases(limit = 5) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  ensureAuthenticatedUser(user, userError);

  const safeLimit = Math.min(Math.max(Number(limit) || 5, 1), 10);
  const { data, error } = await supabase
    .from("studio_credit_purchases")
    .select(
      "id, pack_name_snapshot, credits_snapshot, amount_paise_snapshot, currency_snapshot, status, razorpay_payment_id, created_at, credited_at",
    )
    .order("created_at", { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw new StudioPaymentError(
      "Recent Studio purchases could not be loaded.",
      { code: "STUDIO_PURCHASE_HISTORY_FAILED", retryable: true },
    );
  }

  return (data || []).map((purchase) => ({
    id: purchase.id,
    packName: purchase.pack_name_snapshot,
    credits: Number(purchase.credits_snapshot),
    amountPaise: Number(purchase.amount_paise_snapshot),
    currency: purchase.currency_snapshot,
    status: purchase.status,
    paymentId: purchase.razorpay_payment_id,
    createdAt: purchase.created_at,
    creditedAt: purchase.credited_at,
  }));
}

export async function getStudioPurchaseStatus(purchaseId) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  ensureAuthenticatedUser(user, userError);

  const { data, error } = await supabase
    .from("studio_credit_purchases")
    .select(
      "id, status, credits_snapshot, razorpay_payment_id, created_at, credited_at",
    )
    .eq("id", purchaseId)
    .maybeSingle();

  if (error) {
    throw new StudioPaymentError(
      "The Studio purchase status could not be refreshed.",
      { code: "STUDIO_PURCHASE_STATUS_FAILED", retryable: true },
    );
  }

  if (!data) {
    throw new StudioPaymentError(
      "The Studio purchase was not found.",
      { code: "STUDIO_PURCHASE_NOT_FOUND", status: 404 },
    );
  }

  return {
    id: data.id,
    status: data.status,
    credits: Number(data.credits_snapshot),
    paymentId: data.razorpay_payment_id,
    createdAt: data.created_at,
    creditedAt: data.credited_at,
  };
}

export async function getStudioCheckoutCustomer() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  ensureAuthenticatedUser(user, userError);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone")
    .eq("id", user.id)
    .maybeSingle();

  return {
    name: profile?.full_name || user.user_metadata?.full_name || "",
    email: user.email || "",
    contact: profile?.phone || user.user_metadata?.phone || "",
  };
}

export async function createStudioCreditOrder(packId) {
  const { data, error } = await supabase.functions.invoke(
    "create-studio-credit-order",
    {
      body: { packId },
      timeout: FUNCTION_TIMEOUT_MS,
    },
  );

  if (error) {
    throw await readFunctionError(
      error,
      "The secure Studio credit order could not be created.",
    );
  }

  if (
    !data?.success ||
    !data.purchaseId ||
    !data.razorpayOrderId ||
    !data.keyId ||
    data.currency !== "INR" ||
    !Number.isSafeInteger(Number(data.amount)) ||
    !Number.isSafeInteger(Number(data.credits))
  ) {
    throw new StudioPaymentError(
      "The secure Studio credit order returned invalid checkout data.",
      { code: "INVALID_STUDIO_CHECKOUT_DATA", retryable: true },
    );
  }

  return {
    purchaseId: data.purchaseId,
    razorpayOrderId: data.razorpayOrderId,
    keyId: data.keyId,
    amount: Number(data.amount),
    currency: data.currency,
    packId: data.packId,
    packName: data.packName,
    description: data.description,
    credits: Number(data.credits),
  };
}

export function loadRazorpayCheckout() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector(
        `script[src="${CHECKOUT_SCRIPT_URL}"]`,
      );
      const script = existingScript || document.createElement("script");
      const timeout = window.setTimeout(() => {
        razorpayScriptPromise = undefined;
        reject(new StudioPaymentError(
          "Secure Razorpay Checkout took too long to load.",
          { code: "CHECKOUT_LOAD_TIMEOUT", retryable: true },
        ));
      }, 15_000);
      const handleLoad = () => {
        window.clearTimeout(timeout);

        if (window.Razorpay) {
          resolve();
        } else {
          razorpayScriptPromise = undefined;
          reject(new StudioPaymentError(
            "Secure Razorpay Checkout did not initialize.",
            { code: "CHECKOUT_INITIALIZATION_FAILED", retryable: true },
          ));
        }
      };

      script.addEventListener("load", handleLoad, { once: true });
      script.addEventListener("error", () => {
        window.clearTimeout(timeout);
        razorpayScriptPromise = undefined;
        reject(new StudioPaymentError(
          "Secure Razorpay Checkout could not be loaded.",
          { code: "CHECKOUT_LOAD_FAILED", retryable: true },
        ));
      }, { once: true });

      if (!existingScript) {
        script.src = CHECKOUT_SCRIPT_URL;
        script.async = true;
        document.head.appendChild(script);
      }
    });
  }

  return razorpayScriptPromise;
}

export function openStudioCreditCheckout(order, customer) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (callback, value) => {
      if (!settled) {
        settled = true;
        callback(value);
      }
    };
    const prefill = {};

    if (customer?.name) prefill.name = customer.name;
    if (customer?.email) prefill.email = customer.email;
    if (customer?.contact) prefill.contact = customer.contact;

    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: "Kushi Digitals",
      description: `${order.packName} · ${order.credits} Studio credits`,
      order_id: order.razorpayOrderId,
      prefill,
      theme: { color: "#8b5cf6" },
      handler: (response) => settle(resolve, response),
      modal: {
        ondismiss: () => settle(
          reject,
          new StudioPaymentError(
            "Razorpay Checkout was closed. No credits were added.",
            { code: "CHECKOUT_DISMISSED", retryable: true },
          ),
        ),
      },
    });

    checkout.on("payment.failed", () => settle(
      reject,
      new StudioPaymentError(
        "The payment was not completed. No credits were added.",
        { code: "PAYMENT_FAILED", retryable: true },
      ),
    ));
    checkout.open();
  });
}

export async function verifyStudioCreditPayment(order, checkoutResponse) {
  const verificationBody = {
    purchaseId: order.purchaseId,
    razorpay_payment_id: checkoutResponse?.razorpay_payment_id,
    razorpay_order_id: checkoutResponse?.razorpay_order_id,
    razorpay_signature: checkoutResponse?.razorpay_signature,
  };
  const { data, error } = await supabase.functions.invoke(
    "verify-studio-credit-payment",
    {
      body: verificationBody,
      timeout: FUNCTION_TIMEOUT_MS,
    },
  );

  if (error) {
    throw await readFunctionError(
      error,
      "Payment verification failed. Do not pay again; retry verification or wait for the signed webhook.",
    );
  }

  if (data?.status === "capture_pending" && !data.credited) {
    return {
      status: "capture_pending",
      credited: false,
      purchaseId: data.purchaseId,
      paymentId: data.paymentId,
      creditsAdded: 0,
      availableCredits: Number(data.availableCredits || 0),
      message: data.message,
    };
  }

  if (!data?.success || !data.credited || data.status !== "credited") {
    throw new StudioPaymentError(
      "Payment was not confirmed as captured. No credits were added.",
      { code: "PAYMENT_NOT_CREDITED", retryable: true },
    );
  }

  return {
    status: "credited",
    credited: true,
    purchaseId: data.purchaseId,
    paymentId: data.paymentId,
    creditsAdded: Number(data.creditsAdded || 0),
    availableCredits: Number(data.availableCredits || 0),
    idempotent: Boolean(data.idempotent),
  };
}
