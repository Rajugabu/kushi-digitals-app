import {
  createClient,
  type SupabaseClient,
  type User,
} from "npm:@supabase/supabase-js@2";
import {
  getCorsHeaders,
  isOriginAllowed,
} from "../_shared/cors.ts";

const PHOTOROOM_ENDPOINT = "https://sdk.photoroom.com/v1/segment";
const PROFILE_BUCKET = "profile-photos";
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_REQUEST_SIZE = 21 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

class BackgroundRemovalError extends Error {
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
    this.name = "BackgroundRemovalError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}

function jsonResponse(
  request: Request,
  body: Record<string, unknown>,
  status = 200,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(request),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function readIntegerEnv(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const value = Number(Deno.env.get(name) || fallback);
  return Number.isFinite(value)
    ? Math.min(Math.max(Math.floor(value), minimum), maximum)
    : fallback;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getRequiredUser(
  request: Request,
  supabaseUrl: string,
  supabaseAnonKey: string,
): Promise<User> {
  const authorization = request.headers.get("Authorization");

  if (!authorization?.startsWith("Bearer ")) {
    throw new BackgroundRemovalError(
      "AUTHENTICATION_REQUIRED",
      "Sign in to remove a Studio photo background.",
      401,
    );
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    throw new BackgroundRemovalError(
      "AUTHENTICATION_REQUIRED",
      "Your session is no longer valid. Sign in again.",
      401,
    );
  }

  return user;
}

async function detectImageType(file: Blob) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const isJpeg =
    bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  if (isJpeg) return "image/jpeg";
  if (isPng) return "image/png";
  if (isWebp) return "image/webp";
  return null;
}

async function validateImage(file: Blob, declaredType?: string) {
  const contentType = declaredType || file.type;

  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new BackgroundRemovalError(
      "UNSUPPORTED_FILE_TYPE",
      "Choose a JPG, PNG or WEBP image.",
      415,
    );
  }

  if (file.size <= 0) {
    throw new BackgroundRemovalError(
      "EMPTY_FILE",
      "The selected photo is empty.",
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new BackgroundRemovalError(
      "FILE_TOO_LARGE",
      "The selected photo is larger than the 20 MB limit.",
      413,
    );
  }

  const detectedType = await detectImageType(file);

  if (!detectedType || detectedType !== contentType) {
    throw new BackgroundRemovalError(
      "INVALID_IMAGE_FILE",
      "The selected file is not a valid supported image.",
      415,
    );
  }

  return detectedType;
}

async function callPhotoroom(file: File, apiKey: string) {
  const formData = new FormData();
  formData.append("image_file", file, file.name || "studio-photo");
  formData.append("format", "png");
  formData.append("channels", "rgba");
  formData.append("size", "hd");
  formData.append("crop", "false");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);

  try {
    const response = await fetch(PHOTOROOM_ENDPOINT, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        Accept: "image/png, application/json",
      },
      body: formData,
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new BackgroundRemovalError(
          "PROVIDER_NOT_CONFIGURED",
          "Background removal provider is not configured correctly.",
          503,
        );
      }

      if (response.status === 429) {
        throw new BackgroundRemovalError(
          "PROVIDER_RATE_LIMITED",
          "Background removal is busy. Try again shortly.",
          429,
          true,
        );
      }

      throw new BackgroundRemovalError(
        "PROVIDER_FAILED",
        "Background removal failed. Try again.",
        502,
        response.status >= 500,
      );
    }

    const result = await response.blob();

    if (result.size <= 0 || (await detectImageType(result)) !== "image/png") {
      throw new BackgroundRemovalError(
        "INVALID_PROVIDER_RESULT",
        "Background removal returned an invalid image.",
        502,
        true,
      );
    }

    return result;
  } catch (error) {
    if (error instanceof BackgroundRemovalError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new BackgroundRemovalError(
        "PROVIDER_TIMEOUT",
        "Background removal timed out. Try again.",
        504,
        true,
      );
    }

    throw new BackgroundRemovalError(
      "PROVIDER_UNAVAILABLE",
      "Background removal is temporarily unavailable.",
      503,
      true,
    );
  } finally {
    clearTimeout(timeout);
  }
}

async function cachedObjectExists(
  adminClient: SupabaseClient,
  folder: string,
  filename: string,
) {
  const { data, error } = await adminClient.storage
    .from(PROFILE_BUCKET)
    .list(folder, { limit: 1, search: filename });

  if (error) {
    throw new BackgroundRemovalError(
      "CUTOUT_CACHE_READ_FAILED",
      "The private cutout cache could not be checked.",
      503,
      true,
    );
  }

  return Boolean(data?.some((item) => item.name === filename));
}

async function createSignedCutoutResponse(
  request: Request,
  adminClient: SupabaseClient,
  sourcePath: string,
  cutoutPath: string,
  cached: boolean,
) {
  const signedUrlSeconds = readIntegerEnv(
    "STUDIO_CUTOUT_SIGNED_URL_SECONDS",
    3600,
    60,
    86400,
  );
  const { data, error } = await adminClient.storage
    .from(PROFILE_BUCKET)
    .createSignedUrl(cutoutPath, signedUrlSeconds);

  if (error || !data?.signedUrl) {
    throw new BackgroundRemovalError(
      "CUTOUT_URL_FAILED",
      "The private cutout was prepared but could not be opened securely.",
      503,
      true,
    );
  }

  return jsonResponse(request, {
    success: true,
    cached,
    sourcePath,
    cutoutPath,
    signedUrl: data.signedUrl,
    expiresAt: new Date(Date.now() + signedUrlSeconds * 1000).toISOString(),
  });
}

async function handleProfileCutout(
  request: Request,
  user: User,
  requestedSourcePath: string,
  adminClient: SupabaseClient,
  apiKey: string,
) {
  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("avatar_path")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new BackgroundRemovalError(
      "PROFILE_READ_FAILED",
      "Your profile photo could not be checked.",
      503,
      true,
    );
  }

  const sourcePath = String(profile?.avatar_path || "");

  if (!sourcePath) {
    throw new BackgroundRemovalError(
      "PROFILE_PHOTO_REQUIRED",
      "Add a profile photo before using a cutout template.",
    );
  }

  if (requestedSourcePath !== sourcePath) {
    throw new BackgroundRemovalError(
      "PROFILE_PHOTO_CHANGED",
      "Your profile photo changed. Reload Studio to prepare the latest cutout.",
      409,
      true,
    );
  }

  const sourceHash = await sha256(`photoroom-v1:${sourcePath}`);
  const cacheFolder = `${user.id}/cutouts`;
  const cacheFilename = `${sourceHash}.png`;
  const cutoutPath = `${cacheFolder}/${cacheFilename}`;

  if (await cachedObjectExists(adminClient, cacheFolder, cacheFilename)) {
    return createSignedCutoutResponse(
      request,
      adminClient,
      sourcePath,
      cutoutPath,
      true,
    );
  }

  const { data: original, error: downloadError } = await adminClient.storage
    .from(PROFILE_BUCKET)
    .download(sourcePath);

  if (downloadError || !original) {
    throw new BackgroundRemovalError(
      "PROFILE_PHOTO_DOWNLOAD_FAILED",
      "Your profile photo could not be opened securely.",
      503,
      true,
    );
  }

  const detectedType = await detectImageType(original);
  await validateImage(original, detectedType || undefined);
  const inputFile = new File([original], "profile-photo", {
    type: detectedType || "application/octet-stream",
  });
  const cutout = await callPhotoroom(inputFile, apiKey);
  const { error: uploadError } = await adminClient.storage
    .from(PROFILE_BUCKET)
    .upload(cutoutPath, cutout, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    const createdByConcurrentRequest = await cachedObjectExists(
      adminClient,
      cacheFolder,
      cacheFilename,
    );

    if (!createdByConcurrentRequest) {
      throw new BackgroundRemovalError(
        "CUTOUT_CACHE_WRITE_FAILED",
        "The private cutout could not be cached.",
        503,
        true,
      );
    }
  }

  return createSignedCutoutResponse(
    request,
    adminClient,
    sourcePath,
    cutoutPath,
    false,
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(request) });
  }

  if (!isOriginAllowed(request)) {
    return jsonResponse(request, {
      success: false,
      code: "ORIGIN_NOT_ALLOWED",
      message: "This website origin is not allowed.",
    }, 403);
  }

  if (request.method !== "POST") {
    return jsonResponse(request, {
      success: false,
      code: "METHOD_NOT_ALLOWED",
      message: "Only POST requests are supported.",
    }, 405);
  }

  try {
    const requestSize = Number(request.headers.get("Content-Length") || 0);

    if (requestSize > MAX_REQUEST_SIZE) {
      throw new BackgroundRemovalError(
        "REQUEST_TOO_LARGE",
        "The background-removal request is too large.",
        413,
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
    const photoroomApiKey = Deno.env.get("PHOTOROOM_API_KEY")?.trim();

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new BackgroundRemovalError(
        "SERVER_CONFIGURATION_ERROR",
        "Background removal is not configured on the server.",
        503,
      );
    }

    const user = await getRequiredUser(
      request,
      supabaseUrl,
      supabaseAnonKey,
    );

    if (!photoroomApiKey) {
      throw new BackgroundRemovalError(
        "PROVIDER_NOT_CONFIGURED",
        "Background removal provider is not configured.",
        503,
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const contentType = request.headers.get("Content-Type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const mode = String(formData.get("mode") || "");
      const image = formData.get("image_file");

      if (mode !== "temporary") {
        throw new BackgroundRemovalError(
          "INVALID_MODE",
          "Temporary background removal mode is required for uploaded photos.",
        );
      }

      if (!(image instanceof File)) {
        throw new BackgroundRemovalError(
          "PHOTO_REQUIRED",
          "Choose a photo before removing its background.",
        );
      }

      await validateImage(image);
      const result = await callPhotoroom(image, photoroomApiKey);

      return new Response(result, {
        status: 200,
        headers: {
          ...getCorsHeaders(request),
          "Content-Type": "application/octet-stream",
          "X-Studio-Result-Type": "image/png",
          "Cache-Control": "no-store",
        },
      });
    }

    const body = await request.json().catch(() => ({}));
    const sourcePath = String(body?.sourcePath || "");

    return await handleProfileCutout(
      request,
      user,
      sourcePath,
      adminClient,
      photoroomApiKey,
    );
  } catch (error) {
    const knownError = error instanceof BackgroundRemovalError
      ? error
      : new BackgroundRemovalError(
        "BACKGROUND_REMOVAL_FAILED",
        "Background removal failed. Try again.",
        500,
        true,
      );

    console.error("[studio background removal]", {
      code: knownError.code,
      status: knownError.status,
      retryable: knownError.retryable,
      message: knownError.message,
    });

    return jsonResponse(request, {
      success: false,
      code: knownError.code,
      message: knownError.message,
      retryable: knownError.retryable,
    }, knownError.status);
  }
});
