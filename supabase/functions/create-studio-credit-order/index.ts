import { type SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  getCorsHeaders,
  isOriginAllowed,
} from "../_shared/cors.ts";
import {
  createRazorpayOrder,
  getRazorpayApiConfig,
} from "../_shared/razorpay.ts";
import {
  createStudioPaymentAdminClient,
  getRequiredPaymentUser,
  getSupabasePaymentEnvironment,
  jsonPaymentResponse,
  logSafeDatabaseError,
  normalizeStudioPaymentError,
  StudioPaymentRequestError,
} from "../_shared/studio-payment.ts";

const ORDER_LIMIT = 5;
const ORDER_LIMIT_WINDOW_MINUTES = 10;
const PACK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

type StudioCreditPack = {
  id: string;
  display_name: string;
  description: string;
  credits: number;
  amount_paise: number;
  currency: string;
};

function parsePackId(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new StudioPaymentRequestError(
      "INVALID_PAYMENT_REQUEST",
      "Select a Studio credit pack.",
    );
  }

  const payload = body as Record<string, unknown>;
  const unexpectedFields = Object.keys(payload).filter(
    (key) => key !== "packId",
  );

  if (unexpectedFields.length > 0) {
    throw new StudioPaymentRequestError(
      "UNTRUSTED_PAYMENT_FIELDS",
      "Only a Studio credit pack ID may be submitted.",
    );
  }

  const packId = typeof payload.packId === "string"
    ? payload.packId.trim()
    : "";

  if (!PACK_ID_PATTERN.test(packId) || packId.length > 64) {
    throw new StudioPaymentRequestError(
      "INVALID_STUDIO_CREDIT_PACK",
      "The selected Studio credit pack is invalid.",
    );
  }

  return packId;
}

async function enforceOrderRateLimit(
  adminClient: SupabaseClient,
  userId: string,
) {
  const since = new Date(
    Date.now() - ORDER_LIMIT_WINDOW_MINUTES * 60 * 1000,
  ).toISOString();
  const { data, error } = await adminClient
    .from("studio_credit_purchases")
    .select("id")
    .eq("user_id", userId)
    .gte("created_at", since)
    .limit(ORDER_LIMIT);

  if (error) {
    logSafeDatabaseError("order rate limit query", error);
    throw new StudioPaymentRequestError(
      "STUDIO_PAYMENT_BACKEND_NOT_READY",
      "Studio credit payments are temporarily unavailable.",
      503,
      true,
    );
  }

  if ((data?.length || 0) >= ORDER_LIMIT) {
    throw new StudioPaymentRequestError(
      "STUDIO_PAYMENT_RATE_LIMITED",
      `Too many payment orders were created. Try again in about ${ORDER_LIMIT_WINDOW_MINUTES} minutes.`,
      429,
      true,
    );
  }
}

async function markPurchaseFailed(
  adminClient: SupabaseClient,
  purchaseId: string,
  error: { code?: string; message?: string },
) {
  const { error: updateError } = await adminClient
    .from("studio_credit_purchases")
    .update({
      status: "failed",
      failure_code: String(error.code || "ORDER_CREATION_FAILED").slice(0, 100),
      failure_message: String(
        error.message || "The secure payment order could not be created.",
      ).slice(0, 500),
    })
    .eq("id", purchaseId)
    .neq("status", "credited");

  if (updateError) {
    logSafeDatabaseError("purchase failure update", updateError);
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
      message: "This website origin is not allowed to create Studio payment orders.",
    }, 403);
  }

  if (request.method !== "POST") {
    return jsonPaymentResponse(request, {
      success: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Method not allowed.",
    }, 405);
  }

  let adminClient: SupabaseClient | null = null;
  let purchaseId: string | null = null;

  try {
    const { supabaseUrl, supabaseAnonKey, serviceRoleKey } =
      getSupabasePaymentEnvironment();
    const user = await getRequiredPaymentUser(
      request,
      supabaseUrl,
      supabaseAnonKey,
    );
    const body = await request.json().catch(() => null);
    const packId = parsePackId(body);
    const razorpayConfig = getRazorpayApiConfig();
    adminClient = createStudioPaymentAdminClient(
      supabaseUrl,
      serviceRoleKey,
    );

    await enforceOrderRateLimit(adminClient, user.id);

    const { data: pack, error: packError } = await adminClient
      .from("studio_credit_packs")
      .select(
        "id, display_name, description, credits, amount_paise, currency",
      )
      .eq("id", packId)
      .eq("active", true)
      .maybeSingle<StudioCreditPack>();

    if (packError) {
      logSafeDatabaseError("pack query", packError);
      throw new StudioPaymentRequestError(
        "STUDIO_PAYMENT_BACKEND_NOT_READY",
        "Studio credit packs could not be loaded.",
        503,
        true,
      );
    }

    if (!pack) {
      throw new StudioPaymentRequestError(
        "STUDIO_CREDIT_PACK_NOT_AVAILABLE",
        "The selected Studio credit pack is not available.",
        404,
      );
    }

    const credits = Number(pack.credits);
    const amountPaise = Number(pack.amount_paise);

    if (
      !Number.isSafeInteger(credits) ||
      credits <= 0 ||
      !Number.isSafeInteger(amountPaise) ||
      amountPaise <= 0 ||
      pack.currency !== "INR"
    ) {
      throw new StudioPaymentRequestError(
        "INVALID_TRUSTED_STUDIO_PACK",
        "The selected Studio credit pack is not configured correctly.",
        500,
      );
    }

    const { data: purchase, error: purchaseError } = await adminClient
      .from("studio_credit_purchases")
      .insert({
        user_id: user.id,
        pack_id: pack.id,
        pack_name_snapshot: pack.display_name,
        credits_snapshot: credits,
        amount_paise_snapshot: amountPaise,
        currency_snapshot: pack.currency,
        provider: "razorpay",
        status: "created",
      })
      .select("id")
      .single();

    if (purchaseError || !purchase) {
      logSafeDatabaseError("purchase insert", purchaseError);
      throw new StudioPaymentRequestError(
        "STUDIO_PURCHASE_CREATE_FAILED",
        "The Studio credit purchase could not be prepared.",
        500,
        true,
      );
    }

    purchaseId = purchase.id;
    const receipt = `stcred_${purchase.id.replaceAll("-", "")}`;
    const providerOrder = await createRazorpayOrder(razorpayConfig, {
      amount: amountPaise,
      currency: "INR",
      receipt,
      notes: {
        purchase_id: purchase.id,
        user_id: user.id,
        pack_id: pack.id,
      },
    });

    if (
      !/^order_[A-Za-z0-9]+$/.test(providerOrder.id) ||
      Number(providerOrder.amount) !== amountPaise ||
      providerOrder.currency !== "INR"
    ) {
      throw new StudioPaymentRequestError(
        "RAZORPAY_ORDER_MISMATCH",
        "The secure payment order did not match the selected Studio pack.",
        502,
        true,
      );
    }

    const { data: savedPurchase, error: saveError } = await adminClient
      .from("studio_credit_purchases")
      .update({
        status: "order_created",
        razorpay_order_id: providerOrder.id,
        provider_metadata: {
          receipt,
          order_status: providerOrder.status,
        },
      })
      .eq("id", purchase.id)
      .eq("user_id", user.id)
      .eq("status", "created")
      .select("id")
      .maybeSingle();

    if (saveError || !savedPurchase) {
      logSafeDatabaseError("Razorpay order save", saveError);
      throw new StudioPaymentRequestError(
        "STUDIO_PURCHASE_ORDER_SAVE_FAILED",
        "The secure payment order could not be saved.",
        500,
        true,
      );
    }

    return jsonPaymentResponse(request, {
      success: true,
      purchaseId: purchase.id,
      razorpayOrderId: providerOrder.id,
      keyId: razorpayConfig.keyId,
      amount: amountPaise,
      currency: "INR",
      packId: pack.id,
      packName: pack.display_name,
      description: pack.description,
      credits,
    });
  } catch (error) {
    const normalized = normalizeStudioPaymentError(error);

    if (adminClient && purchaseId) {
      await markPurchaseFailed(adminClient, purchaseId, normalized);
    }

    console.error("[create-studio-credit-order]", {
      code: normalized.code,
      status: normalized.status,
    });

    return jsonPaymentResponse(request, {
      success: false,
      code: normalized.code,
      message: normalized.message,
      retryable: normalized.retryable,
    }, normalized.status);
  }
});
