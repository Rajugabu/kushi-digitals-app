import { OpenAIImageProvider } from "./openai-image.ts";
import type { ImageProvider } from "./types.ts";
import { ImageProviderError } from "./types.ts";

export function createImageProvider(): ImageProvider {
  const providerName = (
    Deno.env.get("STUDIO_AI_PROVIDER") || "openai"
  ).toLowerCase();

  if (providerName !== "openai") {
    throw new ImageProviderError(
      "PROVIDER_NOT_SUPPORTED",
      "The configured image provider is not supported.",
      503,
    );
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");

  if (!apiKey) {
    throw new ImageProviderError(
      "PROVIDER_NOT_CONFIGURED",
      "Real AI generation is not configured yet. Add the server-side provider secret and try again.",
      503,
    );
  }

  const requestedTimeout = Number(
    Deno.env.get("STUDIO_PROVIDER_TIMEOUT_MS") || 240_000,
  );
  const timeoutMs = Number.isFinite(requestedTimeout)
    ? Math.min(Math.max(requestedTimeout, 30_000), 240_000)
    : 240_000;

  return new OpenAIImageProvider({
    apiKey,
    model: Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-2",
    timeoutMs,
  });
}

export { ImageProviderError } from "./types.ts";
