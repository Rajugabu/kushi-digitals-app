import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Quality Photo Enhance keeps the trusted classic-painting identifier", async () => {
  const source = await readProjectFile("src/config/studioStyles.js");
  const classicBlock = source.match(
    /\{\s*id: "classic-painting",[\s\S]*?isFree: false,\s*\}/,
  )?.[0];

  assert.ok(classicBlock);
  assert.match(classicBlock, /generationPreset: "classic-painting"/);
  assert.match(classicBlock, /name: "Quality Photo Enhance"/);
  assert.match(classicBlock, /category: "Photo Enhancement"/);
  assert.match(classicBlock, /photosRequired: 1/);
  assert.match(classicBlock, /credits: 3/);
  assert.match(classicBlock, /supportedRatios: \["2:3", "3:2"\]/);
  assert.match(
    classicBlock,
    /Restore blur, recover natural detail, and enhance your photo with a crisp professional DSLR-quality finish\./,
  );
  assert.doesNotMatch(source, /Classic Painting/);
});

test("the trusted DSLR prompt reaches OpenAI without client exposure", async () => {
  const [presets, provider, frontend] = await Promise.all([
    readProjectFile("supabase/functions/_shared/style-presets.ts"),
    readProjectFile("supabase/functions/_shared/providers/openai-image.ts"),
    readProjectFile("src/services/studioService.js"),
  ]);
  const preset = presets.match(
    /"classic-painting": \{[\s\S]*?\n  \},/,
  )?.[0];

  assert.ok(preset);
  assert.match(preset, /professional DSLR portrait/);
  assert.match(preset, /100% identity preservation/);
  assert.match(preset, /85mm lens/);
  assert.match(preset, /8K, photorealistic/);
  assert.match(provider, /formData\.append\("prompt", preset\.prompt\)/);
  assert.doesNotMatch(frontend, /100% identity preservation|85mm lens/);
});

test("provider output sizes and timeouts fit the production request window", async () => {
  const [provider, providerFactory, frontend] = await Promise.all([
    readProjectFile("supabase/functions/_shared/providers/openai-image.ts"),
    readProjectFile("supabase/functions/_shared/providers/index.ts"),
    readProjectFile("src/services/studioService.js"),
  ]);

  assert.match(provider, /"2:3": \[1024, 1536\]/);
  assert.match(provider, /"3:2": \[1536, 1024\]/);
  assert.match(provider, /"1:1": \[1024, 1024\]/);
  assert.doesNotMatch(provider, /2336|3504|3840/);
  assert.match(provider, /timeoutMs = 120_000/);
  assert.match(providerFactory, /Math\.min\(Math\.max\(requestedTimeout, 30_000\), 120_000\)/);
  assert.match(frontend, /FUNCTION_TIMEOUT_MS = 145_000/);
});

test("a persisted client UUID makes generation and recovery idempotent", async () => {
  const [frontend, backend] = await Promise.all([
    readProjectFile("src/services/studioService.js"),
    readProjectFile("supabase/functions/generate-studio-design/index.ts"),
  ]);

  assert.match(frontend, /crypto\.randomUUID\(\)/);
  assert.match(frontend, /kushi-studio-pending-generation-v1/);
  assert.match(frontend, /formData\.append\("generationId", generationId\)/);
  assert.match(frontend, /body: \{ action: "recover", generationId \}/);
  assert.match(frontend, /recoverPendingStudioGeneration/);
  assert.match(frontend, /GENERATION_STILL_PROCESSING/);
  assert.match(frontend, /GENERATION_NOT_STARTED/);

  assert.match(backend, /UUID_PATTERN/);
  assert.match(backend, /recoveryRequest\.action !== "recover"/);
  assert.match(backend, /\.eq\("id", generationId\)\s*\.eq\("user_id", userId\)/);
  assert.match(backend, /id: generationId,\s*user_id: user\.id/);
  assert.match(backend, /createError\?\.code === "23505"/);
  assert.match(backend, /reconcile_studio_generation_credits/);
});

test("known provider, storage, database, and credit failures stay explicit", async () => {
  const [provider, backend] = await Promise.all([
    readProjectFile("supabase/functions/_shared/providers/openai-image.ts"),
    readProjectFile("supabase/functions/generate-studio-design/index.ts"),
  ]);

  for (const code of [
    "PROVIDER_TIMEOUT",
    "PROVIDER_RATE_LIMITED",
    "PROVIDER_REJECTED_INPUT",
    "PROVIDER_UNAVAILABLE",
    "PROVIDER_NETWORK_ERROR",
    "PROVIDER_INVALID_RESPONSE",
    "PROVIDER_MISSING_OUTPUT",
  ]) {
    assert.match(provider, new RegExp(code));
  }

  for (const code of [
    "OUTPUT_STORAGE_FAILED",
    "GENERATION_RECORD_FAILED",
    "STUDIO_CREDIT_RESERVATION_FAILED",
    "STUDIO_CREDIT_FINALIZATION_FAILED",
    "STUDIO_CREDIT_REFUND_PENDING",
  ]) {
    assert.match(backend, new RegExp(code));
  }

  const reserve = backend.indexOf("await reserveCredits(");
  const providerCall = backend.indexOf("await provider.generate(", reserve);
  const complete = backend.indexOf('status: "completed"', providerCall);
  const finalize = backend.indexOf("await finalizeCredits(", complete);
  const release = backend.indexOf("await releaseCredits(", finalize);

  assert.ok(reserve < providerCall);
  assert.ok(providerCall < complete);
  assert.ok(complete < finalize);
  assert.ok(finalize < release);
});
