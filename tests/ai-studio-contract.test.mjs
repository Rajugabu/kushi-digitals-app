import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

const presetBlock = (source, id) => source.match(
  new RegExp(`"${id}": \\{[\\s\\S]*?\\n  \\},`),
)?.[0];

test("AI Photo Studio supports exact 3:4 output end to end", async () => {
  const [page, presets, provider] = await Promise.all([
    readProjectFile("src/pages/public/AiPhotoStudio.jsx"),
    readProjectFile("supabase/functions/_shared/style-presets.ts"),
    readProjectFile("supabase/functions/_shared/providers/openai-image.ts"),
  ]);
  const aiPhotoPreset = presetBlock(presets, "ai-photo-studio");

  assert.ok(aiPhotoPreset);
  assert.match(page, /"3:4"/);
  assert.match(aiPhotoPreset, /supportedRatios: \["1:1", "4:5", "3:4", "9:16", "2:3", "3:2"\]/);
  assert.match(provider, /"3:4": \[960, 1280\]/);
});

test("AI Photo Studio labels its fixed portrait ratio honestly", async () => {
  const page = await readProjectFile("src/pages/public/AiPhotoStudio.jsx");

  assert.doesNotMatch(page, /aspectRatio === "Original"/);
  assert.match(page, /const ratioOptions = \[\s*"2:3"/);
  assert.match(page, /useState\("2:3"\)/);
  assert.match(page, /ratio: aspectRatio,/);
});

test("Business Studio alone accepts an optional second reference image", async () => {
  const [page, presets, backend, provider] = await Promise.all([
    readProjectFile("src/pages/public/BusinessStudio.jsx"),
    readProjectFile("supabase/functions/_shared/style-presets.ts"),
    readProjectFile("supabase/functions/generate-studio-design/index.ts"),
    readProjectFile("supabase/functions/_shared/providers/openai-image.ts"),
  ]);
  const businessPreset = presetBlock(presets, "business-studio");
  const posterPreset = presetBlock(presets, "poster-studio");
  const aiPhotoPreset = presetBlock(presets, "ai-photo-studio");

  assert.ok(businessPreset);
  assert.ok(posterPreset);
  assert.ok(aiPhotoPreset);
  assert.match(businessPreset, /photosRequired: 1,\s*maxPhotos: 2,/);
  assert.doesNotMatch(posterPreset, /maxPhotos/);
  assert.doesNotMatch(aiPhotoPreset, /maxPhotos/);
  assert.match(backend, /const maxPhotos = preset\.maxPhotos \?\? preset\.photosRequired/);
  assert.match(backend, /if \(maxPhotos === 1 && photo2\)/);
  assert.match(provider, /formData\.append\(\s*"image\[\]"/);
  assert.match(page, /productFile,\s*label: "product photo"/);
  assert.match(page, /businessPhotoFile,\s*label: "business photo"/);
  assert.match(page, /ownerFile,\s*label: "owner photo"/);
  assert.match(page, /photo2: secondaryAsset\?\.file \|\| null/);
  assert.match(page, /image1Role: primaryAsset\.role/);
  assert.match(page, /image2Role: secondaryAsset\.role/);
  assert.match(page, /unusedAssets\.length > 0/);
});

test("AI studio credit prices remain unchanged", async () => {
  const [clientConfig, presets] = await Promise.all([
    readProjectFile("src/config/studioStyles.js"),
    readProjectFile("supabase/functions/_shared/style-presets.ts"),
  ]);

  assert.match(clientConfig, /aiPhoto: 5/);
  assert.match(clientConfig, /poster: 4/);
  assert.match(clientConfig, /business: 6/);
  assert.match(presetBlock(presets, "ai-photo-studio"), /creditCost: 5/);
  assert.match(presetBlock(presets, "poster-studio"), /creditCost: 4/);
  assert.match(presetBlock(presets, "business-studio"), /creditCost: 6/);
});

test("generation authenticates and scopes paid work to the signed-in user", async () => {
  const backend = await readProjectFile(
    "supabase/functions/generate-studio-design/index.ts",
  );
  const originCheck = backend.indexOf("if (!isOriginAllowed(request))");
  const authentication = backend.indexOf("const user = await getRequiredUser(");
  const generationInsert = backend.indexOf('.from("studio_generations")', authentication);
  const reservation = backend.indexOf("await reserveCredits(", generationInsert);
  const providerCall = backend.indexOf("await provider.generate(", reservation);

  assert.ok(originCheck >= 0);
  assert.ok(originCheck < authentication);
  assert.ok(authentication < generationInsert);
  assert.ok(generationInsert < reservation);
  assert.ok(reservation < providerCall);
  assert.match(backend, /request\.headers\.get\("Authorization"\)/);
  assert.match(backend, /await userClient\.auth\.getUser\(\)/);
  assert.match(backend, /user_id: user\.id/);
  assert.match(backend, /reserveCredits\(\s*adminClient,\s*generationId,\s*user\.id,/);
  assert.match(backend, /buildStoragePath\(\s*user\.id,\s*generationId,/);
  assert.match(backend, /\.eq\("user_id", user\.id\)/);
  assert.match(backend, /createSignedUrl\(outputPath/);
  assert.match(backend, /await enforceRateLimit\(adminClient, fingerprint\)/);
});
