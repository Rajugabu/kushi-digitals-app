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

async function createSignature(
  payload: string,
  secret: string,
) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function signaturesMatch(
  expected: string,
  received: string,
) {
  if (expected.length !== received.length) {
    return false;
  }

  let difference = 0;

  for (let index = 0; index < expected.length; index += 1) {
    difference |=
      expected.charCodeAt(index) ^
      received.charCodeAt(index);
  }

  return difference === 0;
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
    const razorpayPaymentId =
      typeof body?.razorpay_payment_id === "string"
        ? body.razorpay_payment_id
        : "";
    const razorpayOrderId =
      typeof body?.razorpay_order_id === "string"
        ? body.razorpay_order_id
        : "";
    const razorpaySignature =
      typeof body?.razorpay_signature === "string"
        ? body.razorpay_signature
        : "";

    if (
      !orderId ||
      !razorpayPaymentId ||
      !razorpayOrderId ||
      !razorpaySignature
    ) {
      return jsonResponse(
        {
          error:
            "Complete payment verification details are required.",
        },
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
          "id, user_id, payment_status, payment_method, payment_reference, estimated_price, final_price, razorpay_order_id, razorpay_payment_id",
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

    if (
      order.payment_status === "paid" &&
      order.razorpay_order_id ===
        razorpayOrderId &&
      order.razorpay_payment_id ===
        razorpayPaymentId
    ) {
      return jsonResponse({
        verified: true,
        amountPaid: Number(
          order.final_price ??
            order.estimated_price ??
            0,
        ),
      });
    }

    if (
      order.payment_method !== "razorpay" ||
      !order.razorpay_order_id ||
      order.razorpay_order_id !== razorpayOrderId
    ) {
      return jsonResponse(
        {
          error:
            "Payment verification does not match this order.",
        },
        409,
      );
    }

    const expectedSignature = await createSignature(
      `${order.razorpay_order_id}|${razorpayPaymentId}`,
      razorpayKeySecret,
    );

    if (
      !signaturesMatch(
        expectedSignature,
        razorpaySignature,
      )
    ) {
      return jsonResponse(
        { error: "Payment signature is invalid." },
        400,
      );
    }

    const trustedRupeeAmount = Number(
      order.final_price ?? order.estimated_price,
    );
    const expectedAmount = Math.round(
      trustedRupeeAmount * 100,
    );
    const paymentResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(
        razorpayPaymentId,
      )}`,
      {
        headers: {
          Authorization: `Basic ${btoa(
            `${razorpayKeyId}:${razorpayKeySecret}`,
          )}`,
        },
      },
    );
    const payment = await paymentResponse.json();

    if (
      !paymentResponse.ok ||
      payment?.order_id !==
        order.razorpay_order_id ||
      payment?.currency !== "INR" ||
      payment?.status !== "captured" ||
      payment?.amount !== expectedAmount
    ) {
      return jsonResponse(
        {
          error:
            "The payment could not be confirmed with Razorpay.",
        },
        409,
      );
    }

    const amountPaid = payment.amount / 100;
    const { data: updatedOrder, error: updateError } =
      await adminClient
        .from("orders")
        .update({
          payment_status: "paid",
          amount_paid: amountPaid,
          payment_method: "razorpay",
          payment_reference: razorpayPaymentId,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
        })
        .eq("id", order.id)
        .eq("user_id", user.id)
        .eq("payment_status", "pending")
        .select(
          "id, payment_status, amount_paid, razorpay_payment_id",
        )
        .maybeSingle();

    if (updateError) {
      return jsonResponse(
        {
          error:
            "The verified payment could not be saved.",
        },
        500,
      );
    }

    if (!updatedOrder) {
      const { data: currentOrder } =
        await adminClient
          .from("orders")
          .select(
            "payment_status, amount_paid, razorpay_order_id, razorpay_payment_id",
          )
          .eq("id", order.id)
          .eq("user_id", user.id)
          .maybeSingle();

      if (
        currentOrder?.payment_status === "paid" &&
        currentOrder.razorpay_order_id ===
          razorpayOrderId &&
        currentOrder.razorpay_payment_id ===
          razorpayPaymentId
      ) {
        return jsonResponse({
          verified: true,
          amountPaid: Number(
            currentOrder.amount_paid,
          ),
        });
      }

      return jsonResponse(
        {
          error:
            "The payment state changed before verification completed.",
        },
        409,
      );
    }

    return jsonResponse({
      verified: true,
      amountPaid: Number(updatedOrder.amount_paid),
    });
  } catch {
    return jsonResponse(
      {
        error:
          "The secure payment verification could not be processed.",
      },
      500,
    );
  }
});
