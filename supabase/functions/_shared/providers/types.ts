import type { StudioStylePreset } from "../style-presets.ts";

export type ImageProviderRequest = {
  images: File[];
  preset: StudioStylePreset;
  ratio: string;
};

export type ImageProviderResult = {
  bytes: Uint8Array;
  mimeType: "image/png" | "image/jpeg" | "image/webp";
  format: "png" | "jpeg" | "webp";
  width: number;
  height: number;
  provider: string;
  model: string;
  providerJobId: string | null;
  usage: Record<string, unknown> | null;
};

export interface ImageProvider {
  generate(request: ImageProviderRequest): Promise<ImageProviderResult>;
}

export class ImageProviderError extends Error {
  code: string;
  status: number;
  retryable: boolean;

  constructor(
    code: string,
    message: string,
    status = 502,
    retryable = false,
  ) {
    super(message);
    this.name = "ImageProviderError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
  }
}
