import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed." },
      405,
    );
  }

  try {
    const authorization =
      request.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get(
      "SUPABASE_ANON_KEY",
    );
    const serviceRoleKey = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    );
    const razorpayKeyId = Deno.env.get(
      "RAZORPAY_KEY_ID",
    );
    const razorpayKeySecret = Deno.env.get(
      "RAZORPAY_KEY_SECRET",
    );

    if (
      !authorization ||
      !supabaseUrl ||
      !supabaseAnonKey ||
      !serviceRoleKey
    ) {
      return jsonResponse(
        { error: "Authentication is required." },
        401,
      );
    }

    if (
      !razorpayKeyId ||
      !razorpayKeySecret ||
      !razorpayKeyId.startsWith("rzp_test_")
    ) {
      return jsonResponse(
        {
          error:
            "Razorpay Test Mode is not configured.",
        },
        503,
      );
    }

    const userClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        global: {
          headers: {
            Authorization: authorization,
          },
        },
        auth: {
          persistSession: false,
        },
      },
    );
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        { error: "Authentication is required." },
        401,
      );
    }

    const body = await request.json();
    const orderId =
      typeof body?.orderId === "string"
        ? body.orderId
        : "";

    if (!orderId) {
      return jsonResponse(
        { error: "A valid order is required." },
        400,
      );
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
    const { data: order, error: orderError } =
      await adminClient
        .from("orders")
        .select(
          "id, user_id, service, payment_method, payment_status, estimated_price, final_price, razorpay_order_id",
        )
        .eq("id", orderId)
        .eq("user_id", user.id)
        .maybeSingle();

    if (orderError || !order) {
      return jsonResponse(
        { error: "Order was not found." },
        404,
      );
    }

    if (order.payment_method !== "razorpay") {
      return jsonResponse(
        {
          error:
            "Online payment is not selected for this order.",
        },
        409,
      );
    }

    if (order.payment_status === "paid") {
      return jsonResponse(
        { error: "This order is already paid." },
        409,
      );
    }

    const trustedRupeeAmount = Number(
      order.final_price ?? order.estimated_price,
    );
    const amount = Math.round(
      trustedRupeeAmount * 100,
    );

    if (
      !Number.isFinite(trustedRupeeAmount) ||
      trustedRupeeAmount <= 0 ||
      !Number.isSafeInteger(amount)
    ) {
      return jsonResponse(
        {
          error:
            "This order does not have a valid payable amount.",
        },
        409,
      );
    }

    if (order.razorpay_order_id) {
      return jsonResponse({
        keyId: razorpayKeyId,
        razorpayOrderId: order.razorpay_order_id,
        amount,
        currency: "INR",
      });
    }

    const razorpayResponse = await fetch(
      "https://api.razorpay.com/v1/orders",
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(
            `${razorpayKeyId}:${razorpayKeySecret}`,
          )}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency: "INR",
          receipt: order.id,
          notes: {
            kushi_order_id: order.id,
            service: order.service,
            user_id: user.id,
          },
        }),
      },
    );
    const razorpayOrder =
      await razorpayResponse.json();

    if (
      !razorpayResponse.ok ||
      typeof razorpayOrder?.id !== "string"
    ) {
      return jsonResponse(
        {
          error:
            "The secure payment order could not be created.",
        },
        502,
      );
    }

    const { error: saveError } = await adminClient
      .from("orders")
      .update({
        razorpay_order_id: razorpayOrder.id,
      })
      .eq("id", order.id)
      .eq("user_id", user.id);

    if (saveError) {
      return jsonResponse(
        {
          error:
            "The secure payment order could not be saved.",
        },
        500,
      );
    }

    return jsonResponse({
      keyId: razorpayKeyId,
      razorpayOrderId: razorpayOrder.id,
      amount,
      currency: "INR",
    });
  } catch {
    return jsonResponse(
      {
        error:
          "The secure payment request could not be processed.",
      },
      500,
    );
  }
});
