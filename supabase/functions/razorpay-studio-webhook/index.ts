import {
  getRazorpayWebhookSecret,
  safeProviderFailure,
  sha256Hex,
  verifyWebhookSignature,
} from "../_shared/razorpay.ts";
import {
  createStudioPaymentAdminClient,
  getSupabasePaymentEnvironment,
  jsonPaymentResponse,
  logSafeDatabaseError,
  normalizeStudioPaymentError,
  StudioPaymentRequestError,
} from "../_shared/studio-payment.ts";

type WebhookPayload = {
  event?: string;
  payload?: {
    payment?: { entity?: Record<string, unknown> };
    order?: { entity?: Record<string, unknown> };
    refund?: { entity?: Record<string, unknown> };
    dispute?: { entity?: Record<string, unknown> };
  };
};

const EVENT_ID_PATTERN = /^[A-Za-z0-9_.:-]+$/;
const ORDER_ID_PATTERN = /^order_[A-Za-z0-9]+$/;
const PAYMENT_ID_PATTERN = /^pay_[A-Za-z0-9]+$/;
const CAPTURE_EVENTS = new Set(["payment.captured", "order.paid"]);
const MANUAL_REVIEW_EVENTS = new Set([
  "refund.created",
  "refund.processed",
  "refund.failed",
  "payment.dispute.created",
  "payment.dispute.action_required",
  "payment.dispute.won",
  "payment.dispute.lost",
]);

function safeString(value: unknown, maximum = 100) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function getPaymentEntity(payload: WebhookPayload) {
  return payload.payload?.payment?.entity || {};
}

function getOrderEntity(payload: WebhookPayload) {
  return payload.payload?.order?.entity || {};
}

function getPaymentId(payload: WebhookPayload) {
  const payment = getPaymentEntity(payload);
  const refund = payload.payload?.refund?.entity || {};
  const dispute = payload.payload?.dispute?.entity || {};

  return safeString(payment.id || refund.payment_id || dispute.payment_id);
}

function getOrderId(payload: WebhookPayload) {
  const payment = getPaymentEntity(payload);
  const order = getOrderEntity(payload);

  return safeString(payment.order_id || order.id);
}

function validateCaptureEntity(payload: WebhookPayload) {
  const payment = getPaymentEntity(payload);
  const paymentId = safeString(payment.id);
  const orderId = safeString(payment.order_id);
  const amount = payment.amount;
  const currency = safeString(payment.currency, 10);
  const status = safeString(payment.status, 30);

  if (
    !PAYMENT_ID_PATTERN.test(paymentId) ||
    !ORDER_ID_PATTERN.test(orderId) ||
    typeof amount !== "number" ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    currency !== "INR" ||
    status !== "captured"
  ) {
    throw new StudioPaymentRequestError(
      "MALFORMED_CAPTURE_WEBHOOK",
      "The signed capture webhook does not contain a valid captured INR payment.",
      400,
    );
  }

  return {
    paymentId,
    orderId,
    amount,
    currency,
    status,
  };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonPaymentResponse(request, {
      success: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Method not allowed.",
    }, 405, false);
  }

  let eventId = "";

  try {
    const signature = request.headers.get("x-razorpay-signature")?.trim() || "";
    eventId = request.headers.get("x-razorpay-event-id")?.trim() || "";
    const rawBody = await request.text();
    const webhookSecret = getRazorpayWebhookSecret();
    const signatureValid = await verifyWebhookSignature(
      rawBody,
      signature,
      webhookSecret,
    );

    if (!signatureValid) {
      throw new StudioPaymentRequestError(
        "INVALID_WEBHOOK_SIGNATURE",
        "Webhook signature is invalid.",
        401,
      );
    }

    if (
      !eventId ||
      eventId.length > 200 ||
      !EVENT_ID_PATTERN.test(eventId)
    ) {
      throw new StudioPaymentRequestError(
        "INVALID_WEBHOOK_EVENT_ID",
        "A valid Razorpay webhook event ID is required.",
        400,
      );
    }

    let payload: WebhookPayload;

    try {
      payload = JSON.parse(rawBody) as WebhookPayload;
    } catch {
      throw new StudioPaymentRequestError(
        "MALFORMED_WEBHOOK_PAYLOAD",
        "Webhook payload is malformed.",
        400,
      );
    }

    const eventType = safeString(payload.event);

    if (!eventType) {
      throw new StudioPaymentRequestError(
        "MALFORMED_WEBHOOK_PAYLOAD",
        "Webhook event type is missing.",
        400,
      );
    }

    let paymentId = getPaymentId(payload);
    let orderId = getOrderId(payload);
    let amount: number | null = null;
    let currency = "";
    let paymentStatus = "";
    let failureCode = "";
    let failureMessage = "";

    if (CAPTURE_EVENTS.has(eventType)) {
      const capture = validateCaptureEntity(payload);
      paymentId = capture.paymentId;
      orderId = capture.orderId;
      amount = capture.amount;
      currency = capture.currency;
      paymentStatus = capture.status;
    } else if (eventType === "payment.failed") {
      const payment = getPaymentEntity(payload);
      const failure = safeProviderFailure({
        error_code: safeString(payment.error_code),
        error_description: safeString(payment.error_description, 300),
      });

      if (!PAYMENT_ID_PATTERN.test(paymentId) || !ORDER_ID_PATTERN.test(orderId)) {
        throw new StudioPaymentRequestError(
          "MALFORMED_FAILED_PAYMENT_WEBHOOK",
          "The signed failed-payment webhook is missing valid references.",
          400,
        );
      }

      paymentStatus = safeString(payment.status, 30);
      failureCode = failure.code;
      failureMessage = failure.message;
    } else if (MANUAL_REVIEW_EVENTS.has(eventType)) {
      paymentId = PAYMENT_ID_PATTERN.test(paymentId) ? paymentId : "";
      orderId = ORDER_ID_PATTERN.test(orderId) ? orderId : "";
    } else {
      paymentId = PAYMENT_ID_PATTERN.test(paymentId) ? paymentId : "";
      orderId = ORDER_ID_PATTERN.test(orderId) ? orderId : "";
    }

    const payloadHash = await sha256Hex(rawBody);
    const { supabaseUrl, serviceRoleKey } = getSupabasePaymentEnvironment();
    const adminClient = createStudioPaymentAdminClient(
      supabaseUrl,
      serviceRoleKey,
    );
    const { data: result, error: processingError } = await adminClient.rpc(
      "process_studio_razorpay_webhook",
      {
        p_event_id: eventId,
        p_event_type: eventType,
        p_razorpay_order_id: orderId || null,
        p_razorpay_payment_id: paymentId || null,
        p_amount_paise: amount,
        p_currency: currency || null,
        p_payment_status: paymentStatus || null,
        p_payload_sha256: payloadHash,
        p_failure_code: failureCode || null,
        p_failure_message: failureMessage || null,
      },
    );

    if (processingError) {
      logSafeDatabaseError("atomic webhook RPC", processingError);
      const hashConflict = processingError.message?.includes(
        "RAZORPAY_WEBHOOK_EVENT_HASH_CONFLICT",
      );
      throw new StudioPaymentRequestError(
        hashConflict
          ? "RAZORPAY_WEBHOOK_EVENT_HASH_CONFLICT"
          : "WEBHOOK_DATABASE_UNAVAILABLE",
        hashConflict
          ? "The webhook event ID conflicts with an earlier signed payload."
          : "Signed webhook processing is temporarily unavailable.",
        hashConflict ? 409 : 503,
        !hashConflict,
      );
    }

    if (result?.status === "failed") {
      const retryable = Boolean(result.retryable);
      throw new StudioPaymentRequestError(
        safeString(result.error_code) || "WEBHOOK_PROCESSING_FAILED",
        retryable
          ? "Signed webhook processing is temporarily unavailable."
          : "The signed webhook did not match the stored purchase.",
        retryable ? 503 : 409,
        retryable,
      );
    }

    return jsonPaymentResponse(request, {
      success: true,
      status: result?.status || "ignored",
      duplicate: Boolean(result?.duplicate),
    }, 200, false);
  } catch (error) {
    const normalized = normalizeStudioPaymentError(error);

    console.error("[razorpay-studio-webhook]", {
      code: normalized.code,
      status: normalized.status,
      eventId: eventId ? `${eventId.slice(0, 12)}...` : null,
    });

    return jsonPaymentResponse(request, {
      success: false,
      code: normalized.code,
      message: normalized.message,
      retryable: normalized.retryable,
    }, normalized.status, false);
  }
});
