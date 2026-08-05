import { supabase } from "./supabase";

const FUNCTION_NAME = "generate-studio-design";
const FUNCTION_TIMEOUT_MS = 330_000;

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
};

export class StudioGenerationError extends Error {
  constructor(
    message,
    { code = "GENERATION_FAILED", retryable = false, status = null } = {},
  ) {
    super(message);
    this.name = "StudioGenerationError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
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
    });
  }

  if (error?.name === "FunctionsFetchError") {
    return new StudioGenerationError(
      "The browser could not confirm the generation result. The secure backend may still be processing it; leaving the page or losing the connection does not cancel or refund a paid generation.",
      { code: "GENERATION_STATUS_UNCONFIRMED", retryable: true },
    );
  }

  if (error?.name === "FunctionsRelayError") {
    return new StudioGenerationError(
      "The secure generation service is temporarily unavailable. Please try again shortly.",
      { code: "GENERATION_SERVICE_UNAVAILABLE", retryable: true },
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
      "Generation completed without a downloadable image. Please try again.",
      { code: "MISSING_GENERATION_OUTPUT", retryable: true },
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
    message: "Your design was generated securely and saved to protected storage.",
    generatedAt: data.createdAt || new Date().toISOString(),
    creditsCharged: Number(data.creditsCharged || 0),
    availableCredits: Number(data.availableCredits || 0),
    metadata: data.metadata || {},
  };
}

/**
 * The sole frontend entry point for Studio generation.
 * Photos are sent as multipart data to a Supabase Edge Function. Provider
 * credentials, prompts, generation, and Storage writes remain server-side.
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

  onStatus?.("preparing");

  const formData = new FormData();
  formData.append("styleId", styleId);
  formData.append("ratio", ratio);
  formData.append("photo1", photo1, photo1.name);

  if (photo2) {
    formData.append("photo2", photo2, photo2.name);
  }

  onStatus?.("sending");
  const generatingTimer = window.setTimeout(
    () => onStatus?.("generating"),
    900,
  );
  const finalizingTimer = window.setTimeout(
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

    onStatus?.("finalizing");
    return normalizeGenerationResult(data);
  } catch (error) {
    if (error instanceof StudioGenerationError) {
      throw error;
    }

    throw await readFunctionError(error);
  } finally {
    window.clearTimeout(generatingTimer);
    window.clearTimeout(finalizingTimer);
  }
}
