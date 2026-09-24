import type {
  ImageProvider,
  ImageProviderRequest,
  ImageProviderResult,
} from "./types.ts";
import { ImageProviderError } from "./types.ts";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
  usage?: Record<string, unknown>;
  error?: {
    code?: string;
    message?: string;
    type?: string;
  };
};

const OPENAI_IMAGE_ENDPOINT =
  "https://api.openai.com/v1/images/edits";

// Reliable production sizes for gpt-image-2. These preserve each ratio while
// keeping response decoding, function memory, and Storage upload overhead low.
const OUTPUT_SIZES: Record<string, [number, number]> = {
  "1:1": [1024, 1024],
  "2:3": [1024, 1536],
  "3:2": [1536, 1024],
  "3:4": [960, 1280],
  "4:5": [1024, 1280],
  "9:16": [1008, 1792],
  "16:9": [1792, 1008],
};

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function getProviderError(
  status: number,
  payload: OpenAIImageResponse,
) {
  const providerCode = payload.error?.code || payload.error?.type;

  if (status === 401 || status === 403) {
    return new ImageProviderError(
      "PROVIDER_AUTHENTICATION_FAILED",
      "The image provider is not configured correctly.",
      503,
    );
  }

  if (status === 429) {
    return new ImageProviderError(
      "PROVIDER_RATE_LIMITED",
      "The image service is busy. Please wait a moment and try again.",
      429,
      true,
    );
  }

  if (
    providerCode === "content_policy_violation" ||
    providerCode === "image_generation_user_error"
  ) {
    return new ImageProviderError(
      "PROVIDER_REJECTED_INPUT",
      "The provider could not generate this design from the supplied photos. Try different photos or another style.",
      422,
    );
  }

  if (status >= 500) {
    return new ImageProviderError(
      "PROVIDER_UNAVAILABLE",
      "The image provider is temporarily unavailable. Please try again shortly.",
      503,
      true,
    );
  }

  return new ImageProviderError(
    "PROVIDER_REQUEST_FAILED",
    "The image provider could not complete this design.",
    502,
  );
}

export class OpenAIImageProvider implements ImageProvider {
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor({
    apiKey,
    model = "gpt-image-2",
    timeoutMs = 120_000,
  }: {
    apiKey: string;
    model?: string;
    timeoutMs?: number;
  }) {
    this.apiKey = apiKey;
    this.model = model;
    this.timeoutMs = timeoutMs;
  }

  async generate({
    images,
    preset,
    ratio,
  }: ImageProviderRequest): Promise<ImageProviderResult> {
    const [width, height] = OUTPUT_SIZES[ratio] || [];

    if (!width || !height) {
      throw new ImageProviderError(
        "UNSUPPORTED_OUTPUT_RATIO",
        "This output ratio is not supported by the image provider.",
        400,
      );
    }

    const formData = new FormData();
    formData.append("model", this.model);
    formData.append("prompt", preset.prompt);
    formData.append("size", `${width}x${height}`);
    formData.append("quality", preset.quality);
    formData.append("output_format", "png");
    formData.append("n", "1");

    images.forEach((image, index) => {
      const extension = image.type === "image/png"
        ? "png"
        : image.type === "image/webp"
          ? "webp"
          : "jpg";
      formData.append(
        "image[]",
        image,
        `reference-${index + 1}.${extension}`,
      );
    });

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.timeoutMs,
    );

    let response: Response;

    try {
      response = await fetch(OPENAI_IMAGE_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ImageProviderError(
          "PROVIDER_TIMEOUT",
          "Image generation took too long. Please try again.",
          504,
          true,
        );
      }

      throw new ImageProviderError(
        "PROVIDER_NETWORK_ERROR",
        "The secure generation service could not reach the image provider.",
        503,
        true,
      );
    } finally {
      clearTimeout(timeout);
    }

    let payload: OpenAIImageResponse;

    try {
      payload = await response.json();
    } catch {
      throw new ImageProviderError(
        "PROVIDER_INVALID_RESPONSE",
        "The image provider returned an unreadable response.",
        502,
      );
    }

    if (!response.ok) {
      throw getProviderError(response.status, payload);
    }

    const encodedImage = payload.data?.[0]?.b64_json;

    if (!encodedImage) {
      throw new ImageProviderError(
        "PROVIDER_MISSING_OUTPUT",
        "The image provider completed without returning an image.",
        502,
      );
    }

    return {
      bytes: base64ToBytes(encodedImage),
      mimeType: "image/png",
      format: "png",
      width,
      height,
      provider: "openai",
      model: this.model,
      providerJobId: response.headers.get("x-request-id"),
      usage: payload.usage || null,
    };
  }
}
