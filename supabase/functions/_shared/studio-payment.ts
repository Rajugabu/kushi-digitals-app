import {
  createClient,
  type SupabaseClient,
  type User,
} from "npm:@supabase/supabase-js@2";
import { getCorsHeaders } from "./cors.ts";
import { RazorpayServerError } from "./razorpay.ts";

export class StudioPaymentRequestError extends Error {
  code: string;
  status: number;
  retryable: boolean;

  constructor(
    code: string,
    message: string,
    status = 400,
    retryable = false,
  ) {
    super(message);
    this.name = "StudioPaymentRequestError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

export function jsonPaymentResponse(
  request: Request,
  body: Record<string, unknown>,
  status = 200,
  includeCors = true,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...(includeCors ? getCorsHeaders(request) : {}),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export function getSupabasePaymentEnvironment() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    throw new StudioPaymentRequestError(
      "STUDIO_PAYMENT_BACKEND_NOT_CONFIGURED",
      "Studio credit payments are not configured.",
      503,
      false,
    );
  }

  return { supabaseUrl, supabaseAnonKey, serviceRoleKey };
}

export function createStudioPaymentAdminClient(
  supabaseUrl: string,
  serviceRoleKey: string,
) {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function getRequiredPaymentUser(
  request: Request,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<User> {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new StudioPaymentRequestError(
      "AUTHENTICATION_REQUIRED",
      "Sign in to purchase Studio credits.",
      401,
    );
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    throw new StudioPaymentRequestError(
      "AUTHENTICATION_REQUIRED",
      "Your session is no longer valid. Sign in again to purchase Studio credits.",
      401,
    );
  }

  return user;
}

export function normalizeStudioPaymentError(error: unknown) {
  if (
    error instanceof StudioPaymentRequestError ||
    error instanceof RazorpayServerError
  ) {
    return error;
  }

  return new StudioPaymentRequestError(
    "STUDIO_PAYMENT_FAILED",
    "The secure Studio payment request could not be completed.",
    500,
    true,
  );
}

export function logSafeDatabaseError(
  label: string,
  error: {
    code?: string;
    message?: string;
    details?: string;
    hint?: string;
  } | null,
) {
  console.error(`[studio payment ${label}]`, {
    code: error?.code || "UNKNOWN_DATABASE_ERROR",
    message: error?.message || "Database operation failed",
    hint: error?.hint || null,
  });
}

export async function getAvailableStudioBalance(
  adminClient: SupabaseClient,
  userId: string,
) {
  const { data, error } = await adminClient
    .from("studio_credit_accounts")
    .select("available_credits, reserved_credits")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    logSafeDatabaseError("balance query", error);
    throw new StudioPaymentRequestError(
      "STUDIO_CREDIT_BALANCE_FAILED",
      "The updated Studio credit balance could not be loaded.",
      500,
      true,
    );
  }

  return {
    availableCredits: Number(data?.available_credits || 0),
    reservedCredits: Number(data?.reserved_credits || 0),
  };
}
