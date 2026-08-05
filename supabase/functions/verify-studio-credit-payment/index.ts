import { type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  getCorsHeaders,
  isOriginAllowed,
} from "../_shared/cors.ts";
import {
  fetchRazorpayPayment,
  getRazorpayApiConfig,
  safeProviderFailure,
  verifyCheckoutSignature,
} from "../_shared/razorpay.ts";
import {
  createStudioPaymentAdminClient,
  getAvailableStudioBalance,
  getRequiredPaymentUser,
  getSupabasePaymentEnvironment,
  jsonPaymentResponse,
  logSafeDatabaseError,
  normalizeStudioPaymentError,
  StudioPaymentRequestError,
} from "../_shared/studio-payment.ts";

const PURCHASE_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ORDER_ID_PATTERN = /^order_[A-Za-z0-9]+$/;
const PAYMENT_ID_PATTERN = /^pay_[A-Za-z0-9]+$/;
const SIGNATURE_PATTERN = /^[a-f0-9]{64}$/i;

type VerificationInput = {
  purchaseId: string;
  paymentId: string;
  checkoutOrderId: string;
  signature: string;
};

type StudioPurchase = {
  id: string;
  user_id: string;
  pack_id: string;
  pack_name_snapshot: string;
  credits_snapshot: number;
  amount_paise_snapshot: number;
  currency_snapshot: string;
  status: string;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
};

function parseVerificationInput(body: unknown): VerificationInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new StudioPaymentRequestError(
      "INVALID_PAYMENT_VERIFICATION_REQUEST",
      "Complete payment verification details are required.",
    );
  }

  const payload = body as Record<string, unknown>;
  const allowedFields = new Set([
    "purchaseId",
    "razorpay_payment_id",
    "razorpay_order_id",
    "razorpay_signature",
  ]);

  if (Object.keys(payload).some((key) => !allowedFields.has(key))) {
    throw new StudioPaymentRequestError(
      "UNTRUSTED_PAYMENT_FIELDS",
      "Unexpected payment verification fields were rejected.",
    );
  }

  const purchaseId = typeof payload.purchaseId === "string"
    ? payload.purchaseId.trim()
    : "";
  const paymentId = typeof payload.razorpay_payment_id === "string"
    ? payload.razorpay_payment_id.trim()
    : "";
  const checkoutOrderId = typeof payload.razorpay_order_id === "string"
    ? payload.razorpay_order_id.trim()
    : "";
  const signature = typeof payload.razorpay_signature === "string"
    ? payload.razorpay_signature.trim()
    : "";

  if (
    !PURCHASE_ID_PATTERN.test(purchaseId) ||
    !PAYMENT_ID_PATTERN.test(paymentId) ||
    !ORDER_ID_PATTERN.test(checkoutOrderId) ||
    !SIGNATURE_PATTERN.test(signature)
  ) {
    throw new StudioPaymentRequestError(
      "INVALID_PAYMENT_VERIFICATION_REQUEST",
      "Complete valid payment verification details are required.",
    );
  }

  return { purchaseId, paymentId, checkoutOrderId, signature };
}

async function updateCapturePending(
  adminClient: SupabaseClient,
  purchase: StudioPurchase,
  paymentId: string,
) {
  if (
    purchase.razorpay_payment_id &&
    purchase.razorpay_payment_id !== paymentId
  ) {
    throw new StudioPaymentRequestError(
      "STUDIO_PURCHASE_PAYMENT_CONFLICT",
      "This purchase is already linked to another payment.",
      409,
    );
  }

  const { error } = await adminClient
    .from("studio_credit_purchases")
    .update({
      status: "capture_pending",
      razorpay_payment_id: paymentId,
      failure_code: null,
      failure_message: null,
      provider_metadata: { payment_status: "authorized" },
    })
    .eq("id", purchase.id)
    .eq("user_id", purchase.user_id)
    .neq("status", "credited");

  if (error) {
    logSafeDatabaseError("capture pending update", error);
    throw new StudioPaymentRequestError(
      "CAPTURE_PENDING_SAVE_FAILED",
      "The payment is awaiting capture, but its status could not be saved.",
      500,
      true,
    );
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(request) });
  }

  if (!isOriginAllowed(request)) {
    return jsonPaymentResponse(request, {
      success: false,
      code: "ORIGIN_NOT_ALLOWED",
      message: "This website origin is not allowed to verify Studio payments.",
    }, 403);
  }

  if (request.method !== "POST") {
    return jsonPaymentResponse(request, {
      success: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Method not allowed.",
    }, 405);
  }

  try {
    const { supabaseUrl, supabaseAnonKey, serviceRoleKey } =
      getSupabasePaymentEnvironment();
    const user = await getRequiredPaymentUser(
      request,
      supabaseUrl,
      supabaseAnonKey,
    );
    const input = parseVerificationInput(
      await request.json().catch(() => null),
    );
    const razorpayConfig = getRazorpayApiConfig();
    const adminClient = createStudioPaymentAdminClient(
      supabaseUrl,
      serviceRoleKey,
    );
    const { data: purchase, error: purchaseError } = await adminClient
      .from("studio_credit_purchases")
      .select(
        "id, user_id, pack_id, pack_name_snapshot, credits_snapshot, amount_paise_snapshot, currency_snapshot, status, razorpay_order_id, razorpay_payment_id",
      )
      .eq("id", input.purchaseId)
      .eq("user_id", user.id)
      .maybeSingle<StudioPurchase>();

    if (purchaseError) {
      logSafeDatabaseError("purchase verification query", purchaseError);
      throw new StudioPaymentRequestError(
        "STUDIO_PURCHASE_QUERY_FAILED",
        "The Studio credit purchase could not be verified.",
        500,
        true,
      );
    }

    if (!purchase) {
      throw new StudioPaymentRequestError(
        "STUDIO_PURCHASE_NOT_FOUND",
        "The Studio credit purchase was not found.",
        404,
      );
    }

    if (
      !purchase.razorpay_order_id ||
      input.checkoutOrderId !== purchase.razorpay_order_id
    ) {
      throw new StudioPaymentRequestError(
        "STUDIO_PURCHASE_ORDER_MISMATCH",
        "Payment verification does not match this Studio purchase.",
        409,
      );
    }

    const signatureValid = await verifyCheckoutSignature(
      purchase.razorpay_order_id,
      input.paymentId,
      input.signature,
      razorpayConfig.keySecret,
    );

    if (!signatureValid) {
      throw new StudioPaymentRequestError(
        "INVALID_RAZORPAY_SIGNATURE",
        "The payment signature is invalid.",
        400,
      );
    }

    if (purchase.status === "refund_review") {
      throw new StudioPaymentRequestError(
        "STUDIO_PURCHASE_REFUND_REVIEW",
        "This payment requires administrator review.",
        409,
      );
    }

    if (purchase.status === "credited") {
      if (purchase.razorpay_payment_id !== input.paymentId) {
        throw new StudioPaymentRequestError(
          "STUDIO_PURCHASE_PAYMENT_CONFLICT",
          "This purchase is already linked to another payment.",
          409,
        );
      }

      const balance = await getAvailableStudioBalance(adminClient, user.id);
      return jsonPaymentResponse(request, {
        success: true,
        status: "credited",
        credited: true,
        idempotent: true,
        purchaseId: purchase.id,
        paymentId: input.paymentId,
        creditsAdded: Number(purchase.credits_snapshot),
        availableCredits: balance.availableCredits,
      });
    }

    const payment = await fetchRazorpayPayment(
      razorpayConfig,
      input.paymentId,
    );
    const expectedAmount = Number(purchase.amount_paise_snapshot);

    if (
      payment.id !== input.paymentId ||
      payment.order_id !== purchase.razorpay_order_id
    ) {
      throw new StudioPaymentRequestError(
        "RAZORPAY_PAYMENT_ORDER_MISMATCH",
        "The payment does not belong to this Studio purchase.",
        409,
      );
    }

    if (Number(payment.amount) !== expectedAmount) {
      throw new StudioPaymentRequestError(
        "RAZORPAY_PAYMENT_AMOUNT_MISMATCH",
        "The payment amount does not match this Studio credit pack.",
        409,
      );
    }

    if (
      payment.currency !== purchase.currency_snapshot ||
      payment.currency !== "INR"
    ) {
      throw new StudioPaymentRequestError(
        "RAZORPAY_PAYMENT_CURRENCY_MISMATCH",
        "The payment currency does not match this Studio credit pack.",
        409,
      );
    }

    if (payment.status === "authorized") {
      await updateCapturePending(adminClient, purchase, input.paymentId);
      const balance = await getAvailableStudioBalance(adminClient, user.id);

      return jsonPaymentResponse(request, {
        success: true,
        status: "capture_pending",
        credited: false,
        purchaseId: purchase.id,
        paymentId: input.paymentId,
        creditsAdded: 0,
        availableCredits: balance.availableCredits,
        message: "Payment is authorized and awaiting Razorpay capture. Credits will be added only after capture is confirmed.",
      }, 202);
    }

    if (payment.status !== "captured") {
      const failure = safeProviderFailure(payment);
      const { error: failureUpdateError } = await adminClient
        .from("studio_credit_purchases")
        .update({
          status: "failed",
          failure_code: failure.code,
          failure_message: failure.message,
          provider_metadata: { payment_status: payment.status },
        })
        .eq("id", purchase.id)
        .neq("status", "credited");

      if (failureUpdateError) {
        logSafeDatabaseError("failed payment update", failureUpdateError);
      }

      throw new StudioPaymentRequestError(
        "RAZORPAY_PAYMENT_NOT_CAPTURED",
        "The payment is not captured, so no Studio credits were added.",
        409,
      );
    }

    const { data: fulfillment, error: fulfillmentError } =
      await adminClient.rpc("fulfill_studio_credit_purchase", {
        p_purchase_id: purchase.id,
        p_user_id: user.id,
        p_razorpay_order_id: purchase.razorpay_order_id,
        p_razorpay_payment_id: payment.id,
        p_amount_paise: Number(payment.amount),
        p_currency: payment.currency,
        p_source: "checkout_verification",
      });

    if (fulfillmentError || fulfillment?.status !== "credited") {
      logSafeDatabaseError("purchase fulfillment RPC", fulfillmentError);
      throw new StudioPaymentRequestError(
        "STUDIO_CREDIT_FULFILLMENT_FAILED",
        "Payment was captured, but Studio credit confirmation is pending. Do not pay again; the signed webhook can safely retry fulfilment.",
        503,
        true,
      );
    }

    return jsonPaymentResponse(request, {
      success: true,
      status: "credited",
      credited: true,
      idempotent: Boolean(fulfillment.idempotent),
      purchaseId: purchase.id,
      paymentId: payment.id,
      creditsAdded: Number(fulfillment.credits_added),
      availableCredits: Number(fulfillment.available_credits),
    });
  } catch (error) {
    const normalized = normalizeStudioPaymentError(error);

    console.error("[verify-studio-credit-payment]", {
      code: normalized.code,
      status: normalized.status,
    });

    return jsonPaymentResponse(request, {
      success: false,
      code: normalized.code,
      message: normalized.message,
      retryable: normalized.retryable,
      credited: false,
    }, normalized.status);
  }
});
