import { supabase } from "./supabase";

const FUNCTION_NAME = "generate-studio-design";
// Supabase can terminate an idle Edge Function request at roughly 150 seconds.
// Leave a small browser-side margin while the provider is capped at 120 seconds.
const FUNCTION_TIMEOUT_MS = 145_000;
const RECOVERY_REQUEST_TIMEOUT_MS = 15_000;
const RECOVERY_POLL_TIMEOUT_MS = 24_000;
const RECOVERY_POLL_INTERVAL_MS = 2_500;
const PENDING_GENERATION_KEY = "kushi-studio-pending-generation-v1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function getStudioCreditBalance() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      isAuthenticated: false,
      user: null,
      availableCredits: 0,
      reservedCredits: 0,
      lifetimePurchased: 0,
      lifetimeUsed: 0,
    };
  }

  const { data, error } = await supabase
    .from("studio_credit_accounts")
    .select(
      "available_credits, reserved_credits, lifetime_purchased, lifetime_used, updated_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new StudioGenerationError(
      "Your Studio credit balance could not be loaded.",
      { code: "STUDIO_CREDIT_BALANCE_FAILED", retryable: true },
    );
  }

  return {
    isAuthenticated: true,
    user,
    availableCredits: Number(data?.available_credits || 0),
    reservedCredits: Number(data?.reserved_credits || 0),
    lifetimePurchased: Number(data?.lifetime_purchased || 0),
    lifetimeUsed: Number(data?.lifetime_used || 0),
    updatedAt: data?.updated_at || null,
  };
}

export const STUDIO_GENERATION_STAGES = {
  preparing: {
    title: "Preparing your photos...",
    description: "Checking the files and preparing a secure upload.",
  },
  sending: {
    title: "Sending secure request...",
    description: "Uploading your photos directly to the protected generation service.",
  },
  generating: {
    title: "Generating your artwork...",
    description: "The AI provider is creating your selected Studio design.",
  },
  finalizing: {
    title: "Finalizing your result...",
    description: "Saving the generated image and preparing secure preview and download links.",
  },
  recovering: {
    title: "Checking your generation...",
    description: "Confirming the saved result and credit status without starting another generation.",
  },
};

export class StudioGenerationError extends Error {
  constructor(
    message,
    {
      code = "GENERATION_FAILED",
      retryable = false,
      status = null,
      generationId = null,
      creditStatus = null,
      refundPending = false,
    } = {},
  ) {
    super(message);
    this.name = "StudioGenerationError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
    this.generationId = generationId;
    this.creditStatus = creditStatus;
    this.refundPending = refundPending;
  }
}

const validateGenerationRequest = ({ styleId, ratio, photo1, photo2 }) => {
  if (!styleId) {
    throw new StudioGenerationError(
      "Choose a style before generating your design.",
      { code: "MISSING_STYLE" },
    );
  }

  if (!ratio) {
    throw new StudioGenerationError(
      "Choose an output ratio before generating your design.",
      { code: "MISSING_RATIO" },
    );
  }

  if (!(photo1 instanceof File)) {
    throw new StudioGenerationError(
      "Add your main photo before generating your design.",
      { code: "MISSING_PHOTO_1" },
    );
  }

  if (photo2 !== undefined && photo2 !== null && !(photo2 instanceof File)) {
    throw new StudioGenerationError(
      "The secondary photo could not be read. Please add it again.",
      { code: "INVALID_PHOTO_2" },
    );
  }
};

function readPendingGeneration() {
  try {
    const pending = JSON.parse(
      globalThis.localStorage?.getItem(PENDING_GENERATION_KEY) || "null",
    );

    return pending && UUID_PATTERN.test(pending.generationId)
      ? pending
      : null;
  } catch {
    return null;
  }
}

function rememberPendingGeneration(pending) {
  try {
    globalThis.localStorage?.setItem(
      PENDING_GENERATION_KEY,
      JSON.stringify(pending),
    );
  } catch {
    // Recovery still works during this page session through the request ID.
  }
}

function clearPendingGeneration(generationId) {
  const pending = readPendingGeneration();

  if (!pending || !generationId || pending.generationId === generationId) {
    try {
      globalThis.localStorage?.removeItem(PENDING_GENERATION_KEY);
    } catch {
      // Storage access can be disabled by browser privacy settings.
    }
  }
}

export function hasPendingStudioGeneration() {
  return Boolean(readPendingGeneration());
}

export function getPendingStudioGeneration() {
  return readPendingGeneration();
}

async function readFunctionError(error) {
  let payload = null;

  if (error?.context instanceof Response) {
    try {
      payload = await error.context.json();
    } catch {
      payload = null;
    }
  }

  if (payload?.message) {
    return new StudioGenerationError(payload.message, {
      code: payload.code,
      retryable: Boolean(payload.retryable),
      status: error.context.status,
      generationId: payload.generationId,
      creditStatus: payload.creditStatus,
      refundPending: Boolean(payload.refundPending),
    });
  }

  if (error?.name === "FunctionsFetchError") {
    return new StudioGenerationError(
      "The browser lost contact while your generation was running. Its server status will be checked before another generation can start.",
      { code: "GENERATION_STATUS_UNCONFIRMED", retryable: true },
    );
  }

  if (error?.name === "FunctionsRelayError") {
    return new StudioGenerationError(
      "The secure generation gateway did not return a result. Its server status will be checked before another generation can start.",
      { code: "GENERATION_STATUS_UNCONFIRMED", retryable: true },
    );
  }

  return new StudioGenerationError(
    "Your design could not be generated. Please try again.",
    { code: "GENERATION_FAILED", retryable: true },
  );
}

function normalizeGenerationResult(data) {
  if (
    !data?.success ||
    data.status !== "completed" ||
    !data.generationId ||
    !data.outputUrl ||
    !data.downloadUrl
  ) {
    throw new StudioGenerationError(
      "Generation completed without a downloadable image. Please check its status again.",
      {
        code: "MISSING_GENERATION_OUTPUT",
        retryable: true,
        generationId: data?.generationId,
        creditStatus: data?.creditStatus,
      },
    );
  }

  return {
    id: data.generationId,
    status: data.status,
    mode: "real",
    resultUrl: data.outputUrl,
    downloadUrl: data.downloadUrl,
    outputPath: data.outputPath,
    outputUrlExpiresAt: data.outputUrlExpiresAt,
    styleId: data.styleId,
    ratio: data.ratio,
    recovered: Boolean(data.recovered),
    message: data.recovered
      ? "Your completed generation was recovered securely without another credit charge."
      : "Your design was generated securely and saved to protected storage.",
    generatedAt: data.createdAt || new Date().toISOString(),
    creditsCharged: Number(data.creditsCharged || 0),
    availableCredits: Number(data.availableCredits || 0),
    metadata: data.metadata || {},
  };
}

const delay = (milliseconds) => new Promise((resolve) => {
  globalThis.setTimeout(resolve, milliseconds);
});

async function getGenerationState(generationId) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action: "recover", generationId },
    timeout: RECOVERY_REQUEST_TIMEOUT_MS,
  });

  if (error) {
    throw await readFunctionError(error);
  }

  return data;
}

export async function recoverPendingStudioGeneration(
  { onStatus, timeoutMs = RECOVERY_POLL_TIMEOUT_MS } = {},
) {
  const pending = readPendingGeneration();

  if (!pending) {
    throw new StudioGenerationError(
      "There is no pending Studio generation to check.",
      { code: "NO_PENDING_GENERATION" },
    );
  }

  onStatus?.("recovering");
  const deadline = Date.now() + timeoutMs;
  let reachedServer = false;
  let latestStatus = "unknown";

  do {
    try {
      const state = await getGenerationState(pending.generationId);
      reachedServer = true;
      latestStatus = state?.status || "unknown";

      if (state?.success && state.status === "completed") {
        clearPendingGeneration(pending.generationId);
        return normalizeGenerationResult(state);
      }

      if (state?.status === "failed") {
        const refundPending = state.creditStatus === "refund_pending";

        if (!refundPending) {
          clearPendingGeneration(pending.generationId);
        }

        throw new StudioGenerationError(
          state.message || "This generation failed safely.",
          {
            code: state.code || "GENERATION_FAILED",
            retryable: !refundPending,
            generationId: pending.generationId,
            creditStatus: state.creditStatus,
            refundPending,
          },
        );
      }
    } catch (error) {
      if (
        error instanceof StudioGenerationError &&
        error.code !== "GENERATION_STATUS_UNCONFIRMED"
      ) {
        throw error;
      }
    }

    if (Date.now() < deadline) {
      await delay(RECOVERY_POLL_INTERVAL_MS);
    }
  } while (Date.now() < deadline);

  if (reachedServer && latestStatus === "not_found") {
    clearPendingGeneration(pending.generationId);
    throw new StudioGenerationError(
      "No server generation was started and no credits were reserved. Check your connection and try again.",
      { code: "GENERATION_NOT_STARTED", retryable: true },
    );
  }

  throw new StudioGenerationError(
    latestStatus === "processing"
      ? "Your generation is still processing. Check its status again in a moment; another generation has not been started."
      : "The browser still cannot confirm the server result. Check this generation again before starting another one.",
    {
      code: latestStatus === "processing"
        ? "GENERATION_STILL_PROCESSING"
        : "GENERATION_STATUS_UNCONFIRMED",
      retryable: true,
      generationId: pending.generationId,
      creditStatus: latestStatus === "processing" ? "reserved" : null,
    },
  );
}

/**
 * The sole frontend entry point for Studio generation. A client-generated UUID
 * makes retries idempotent, and its pending record survives page refreshes.
 */
export async function generateStudioDesign(
  { styleId, ratio, photo1, photo2 },
  { onStatus } = {},
) {
  validateGenerationRequest({ styleId, ratio, photo1, photo2 });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new StudioGenerationError(
      "Sign in to use Studio credits and generate a design.",
      { code: "AUTHENTICATION_REQUIRED", status: 401 },
    );
  }

  if (hasPendingStudioGeneration()) {
    return recoverPendingStudioGeneration({ onStatus });
  }

  const generationId = crypto.randomUUID();
  rememberPendingGeneration({
    generationId,
    styleId,
    ratio,
    startedAt: new Date().toISOString(),
  });

  onStatus?.("preparing");
  const formData = new FormData();
  formData.append("generationId", generationId);
  formData.append("styleId", styleId);
  formData.append("ratio", ratio);
  formData.append("photo1", photo1, photo1.name);

  if (photo2) {
    formData.append("photo2", photo2, photo2.name);
  }

  onStatus?.("sending");
  const generatingTimer = globalThis.setTimeout(
    () => onStatus?.("generating"),
    900,
  );
  const finalizingTimer = globalThis.setTimeout(
    () => onStatus?.("finalizing"),
    45_000,
  );

  try {
    const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
      body: formData,
      timeout: FUNCTION_TIMEOUT_MS,
    });

    if (error) {
      throw await readFunctionError(error);
    }

    if (data?.status === "processing") {
      return recoverPendingStudioGeneration({ onStatus });
    }

    onStatus?.("finalizing");
    const result = normalizeGenerationResult(data);
    clearPendingGeneration(generationId);
    return result;
  } catch (error) {
    const normalized = error instanceof StudioGenerationError
      ? error
      : await readFunctionError(error);

    if (
      normalized.creditStatus === "released" ||
      normalized.creditStatus === "not_reserved"
    ) {
      clearPendingGeneration(generationId);
    }

    if (normalized.code === "GENERATION_STATUS_UNCONFIRMED") {
      return recoverPendingStudioGeneration({ onStatus });
    }

    throw normalized;
  } finally {
    globalThis.clearTimeout(generatingTimer);
    globalThis.clearTimeout(finalizingTimer);
  }
}
