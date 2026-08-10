import { supabase } from "./supabase";

export const STUDIO_BACKGROUND_REMOVAL_CONFIGURED = true;

const FUNCTION_NAME = "remove-studio-photo-background";
const MAX_PHOTO_SIZE = 20 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const profileCutoutCache = new Map();
const SIGNED_URL_REFRESH_BUFFER = 5 * 60 * 1000;

const validatePhoto = (file) => {
  if (!file) {
    throw new Error("Choose a photo before removing its background.");
  }

  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    throw new Error("Choose a JPG, PNG or WEBP image.");
  }

  if (file.size <= 0 || file.size > MAX_PHOTO_SIZE) {
    throw new Error("Choose an image between 1 byte and 20 MB.");
  }
};

const readFunctionError = async (error, fallback) => {
  const response = error?.context;

  if (response instanceof Response) {
    try {
      const body = await response.clone().json();
      return body?.message || fallback;
    } catch {
      return fallback;
    }
  }

  return error?.message || fallback;
};

export async function removeStudioPhotoBackground(file) {
  validatePhoto(file);

  const formData = new FormData();
  formData.append("image_file", file, file.name || "studio-photo");
  formData.append("mode", "temporary");

  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: formData,
    timeout: 60_000,
  });

  if (error) {
    throw new Error(
      await readFunctionError(
        error,
        "Background removal failed. Try again.",
      ),
    );
  }

  if (!(data instanceof Blob) || data.size === 0) {
    throw new Error("Background removal returned an empty image.");
  }

  return new File([data], "studio-cutout.png", { type: "image/png" });
}

async function requestProfileCutout(sourcePath) {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: {
      mode: "profile",
      sourcePath,
    },
    timeout: 60_000,
  });

  if (error) {
    throw new Error(
      await readFunctionError(
        error,
        "Your profile cutout could not be prepared.",
      ),
    );
  }

  if (!data?.signedUrl || data?.sourcePath !== sourcePath) {
    throw new Error("Your profile cutout response was incomplete.");
  }

  return data;
}

export function getStudioProfileCutout(sourcePath, { refresh = false } = {}) {
  if (!sourcePath) {
    return Promise.resolve(null);
  }

  const cached = profileCutoutCache.get(sourcePath);
  const expiresAt = Date.parse(cached?.data?.expiresAt || "");
  const hasFreshUrl =
    cached?.data?.signedUrl &&
    Number.isFinite(expiresAt) &&
    expiresAt - Date.now() > SIGNED_URL_REFRESH_BUFFER;

  if (!refresh && hasFreshUrl) {
    return Promise.resolve(cached.data);
  }

  if (cached?.request) {
    return cached.request;
  }

  const request = requestProfileCutout(sourcePath)
    .then((data) => {
      profileCutoutCache.set(sourcePath, { data });
      return data;
    })
    .catch((error) => {
      profileCutoutCache.delete(sourcePath);
      throw error;
    });

  profileCutoutCache.set(sourcePath, {
    data: cached?.data,
    request,
  });

  return request;
}
