import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("Photoroom credentials and calls stay inside the authenticated Edge Function", async () => {
  const edgeFunction = await readProjectFile(
    "supabase/functions/remove-studio-photo-background/index.ts",
  );
  const browserService = await readProjectFile(
    "src/services/studioPhotoBackground.js",
  );
  const config = await readProjectFile("supabase/config.toml");

  assert.match(edgeFunction, /https:\/\/sdk\.photoroom\.com\/v1\/segment/);
  assert.match(edgeFunction, /Deno\.env\.get\("PHOTOROOM_API_KEY"\)/);
  assert.match(edgeFunction, /"x-api-key": apiKey/);
  assert.match(edgeFunction, /formData\.append\("image_file"/);
  assert.match(edgeFunction, /userClient\.auth\.getUser\(\)/);
  assert.match(edgeFunction, /image\/(jpeg|png|webp)/);
  assert.doesNotMatch(browserService, /PHOTOROOM_API_KEY|sdk\.photoroom\.com/);
  assert.match(
    config,
    /\[functions\.remove-studio-photo-background\]\s+verify_jwt = true/,
  );
});

test("profile cutouts use a deterministic private cache and signed URLs", async () => {
  const edgeFunction = await readProjectFile(
    "supabase/functions/remove-studio-photo-background/index.ts",
  );
  const studio = await readProjectFile("src/pages/Studio.jsx");

  assert.match(edgeFunction, /const PROFILE_BUCKET = "profile-photos"/);
  assert.match(edgeFunction, /crypto\.subtle\.digest\(\s*"SHA-256"/);
  assert.match(edgeFunction, /`\$\{user\.id\}\/cutouts`/);
  assert.match(edgeFunction, /createSignedUrl/);
  assert.match(edgeFunction, /\.eq\("avatar_path", sourcePath\)|avatar_path/);
  assert.match(studio, /getTemplatePhotoSlot\(template\)\.mode === "cutout"/);
  assert.match(studio, /getStudioProfileCutout\(profileAvatarPath/);
  assert.match(studio, /removeStudioPhotoBackground\(file\)/);
});

test("temporary background removal remains session-only", async () => {
  const edgeFunction = await readProjectFile(
    "supabase/functions/remove-studio-photo-background/index.ts",
  );
  const service = await readProjectFile(
    "src/services/studioPhotoBackground.js",
  );

  assert.match(service, /formData\.append\("mode", "temporary"\)/);
  assert.match(
    service,
    /return new File\(\s*\[data\],\s*"studio-cutout\.png"/,
  );
  assert.match(edgeFunction, /mode !== "temporary"/);
  assert.match(edgeFunction, /application\/octet-stream/);
});
