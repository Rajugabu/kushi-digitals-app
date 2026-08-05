import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getStudioPreviewGeometry,
  STUDIO_ASPECT_RATIOS,
} from "../src/utils/studioPreview.js";

const readProjectFile = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("Studio preview geometry maps every output ratio without cropping", () => {
  assert.deepEqual(STUDIO_ASPECT_RATIOS, {
    "2:3": [2, 3],
    "3:2": [3, 2],
    "1:1": [1, 1],
    "4:5": [4, 5],
    "9:16": [9, 16],
    "16:9": [16, 9],
  });

  assert.equal(getStudioPreviewGeometry({ ratio: "2:3" }).aspectRatio, "2 / 3");
  assert.equal(getStudioPreviewGeometry({ ratio: "3:2" }).aspectRatio, "3 / 2");
  assert.equal(getStudioPreviewGeometry({ ratio: "1:1" }).aspectRatio, "1 / 1");
  assert.equal(getStudioPreviewGeometry({ ratio: "4:5" }).aspectRatio, "4 / 5");
  assert.equal(getStudioPreviewGeometry({ ratio: "9:16" }).aspectRatio, "9 / 16");
  assert.equal(getStudioPreviewGeometry({ ratio: "16:9" }).aspectRatio, "16 / 9");
});

test("Studio preview geometry falls back to natural dimensions and prefers result metadata", () => {
  assert.equal(
    getStudioPreviewGeometry({ width: 2336, height: 3504 }).aspectRatio,
    "2336 / 3504",
  );
  assert.equal(
    getStudioPreviewGeometry({
      ratio: "3:2",
      width: 2336,
      height: 3504,
      preferDimensions: true,
    }).aspectRatio,
    "2336 / 3504",
  );
  assert.equal(
    getStudioPreviewGeometry({ ratio: "3:2", width: 2336, height: 3504 }).aspectRatio,
    "3 / 2",
  );
  assert.equal(getStudioPreviewGeometry({ width: 0, height: 0 }), null);
});

test("Studio upload and result components use ratio frames with contained images", async () => {
  const [studioPage, uploader, result, styles] = await Promise.all([
    readProjectFile("src/pages/Studio.jsx"),
    readProjectFile("src/components/studio/PhotoUploader.jsx"),
    readProjectFile("src/components/studio/GenerationResult.jsx"),
    readProjectFile("src/styles/Studio.css"),
  ]);

  assert.equal(
    [...studioPage.matchAll(/outputRatio=\{outputRatio\}/g)].length,
    2,
    "both photo uploaders must receive the selected ratio",
  );
  assert.match(uploader, /getStudioPreviewStyle/);
  assert.match(uploader, /naturalWidth/);
  assert.match(uploader, /naturalHeight/);
  assert.match(result, /preferDimensions: true/);
  assert.match(result, /<dt>Quality<\/dt><dd>Premium High Resolution<\/dd>/);
  assert.doesNotMatch(result, /Upscale|Advanced AI upscaling/);
  assert.match(
    styles,
    /\.studio-upload-preview img \{[\s\S]*?object-fit: contain;[\s\S]*?\}/,
  );
  assert.match(
    styles,
    /\.studio-result-preview img \{[\s\S]*?object-fit: contain;[\s\S]*?\}/,
  );
});

test("every frontend Studio style has the production credit price", async () => {
  const source = await readProjectFile("src/config/studioStyles.js");
  const styleBlocks = [...source.matchAll(/\{\s*id: "[^"]+",[\s\S]*?isActive: true,[\s\S]*?\n  \},/g)]
    .map((match) => match[0]);

  assert.equal(styleBlocks.length, 13, "expected every Studio style to be checked");
  assert.match(source, /STUDIO_CREDIT_INR = 13/);
  assert.doesNotMatch(source, /\bprice:\s*\d+/);
  assert.doesNotMatch(source, /credits:\s*[012]\b/);

  for (const block of styleBlocks) {
    const photoCount = Number(block.match(/photosRequired:\s*(\d)/)?.[1]);
    const credits = Number(block.match(/credits:\s*(\d)/)?.[1]);

    assert.ok(photoCount === 1 || photoCount === 2);
    assert.equal(credits, photoCount === 1 ? 3 : 4);
  }
});

test("trusted Edge presets assign 3 credits to one photo and 4 to two photos", async () => {
  const source = await readProjectFile(
    "supabase/functions/_shared/style-presets.ts",
  );

  assert.match(source, /photosRequired: 1,\s*creditCost: 3,/);
  assert.match(source, /photosRequired: 2,\s*creditCost: 4,/);
  assert.doesNotMatch(source, /creditCost:\s*[012]/);
});

test("migration isolates Studio credits and restricts mutation RPCs", async () => {
  const source = await readProjectFile(
    "supabase/migrations/202608040001_studio_credit_system.sql",
  );

  assert.match(source, /create table if not exists public\.studio_credit_accounts/);
  assert.match(source, /create table if not exists public\.studio_credit_transactions/);
  assert.match(source, /available_credits bigint not null default 0/);
  assert.match(source, /reserved_credits bigint not null default 0/);
  assert.match(source, /lifetime_purchased bigint not null default 0/);
  assert.match(source, /lifetime_used bigint not null default 0/);
  assert.match(source, /for update;/g);
  assert.match(source, /studio_credit_transactions_generation_event_idx/);
  assert.match(source, /revoke all on function public\.reserve_studio_credits\(uuid\)[\s\S]*from public, anon, authenticated/);
  assert.match(source, /grant execute on function public\.reserve_studio_credits\(uuid\)[\s\S]*to service_role/);
  assert.match(source, /create or replace function public\.reconcile_studio_generation_credits/);
  assert.match(source, /revoke all on function public\.reconcile_studio_generation_credits\(uuid\)[\s\S]*from public, anon, authenticated/);
  assert.match(source, /grant execute on function public\.reconcile_studio_generation_credits\(uuid\)[\s\S]*to service_role/);
  assert.match(source, /grant select on table public\.studio_credit_accounts to service_role/);
  assert.match(source, /grant select on table public\.studio_credit_transactions to service_role/);
  assert.doesNotMatch(source, /(?:alter|update|insert into|delete from)\s+(?:table\s+)?public\.wallet_(?:accounts|transactions)/i);
});

test("installed Supabase invoke options are documented and request timeouts are aligned", async () => {
  const functionsPackage = JSON.parse(
    await readProjectFile("node_modules/@supabase/functions-js/package.json"),
  );
  const invokeTypes = await readProjectFile(
    "node_modules/@supabase/functions-js/src/types.ts",
  );
  const studioService = await readProjectFile("src/services/studioService.js");
  const providerFactory = await readProjectFile(
    "supabase/functions/_shared/providers/index.ts",
  );

  assert.equal(functionsPackage.version, "2.110.7");
  assert.match(invokeTypes, /signal\?: AbortSignal/);
  assert.match(invokeTypes, /timeout\?: number/);
  assert.match(studioService, /FUNCTION_TIMEOUT_MS = 330_000/);
  assert.match(studioService, /timeout: FUNCTION_TIMEOUT_MS/);
  assert.doesNotMatch(studioService, /signal,/);
  assert.match(providerFactory, /STUDIO_PROVIDER_TIMEOUT_MS"\) \|\| 240_000/);
});

test("Edge Function authenticates, reserves before OpenAI, and reconciles failures", async () => {
  const source = await readProjectFile(
    "supabase/functions/generate-studio-design/index.ts",
  );

  const authentication = source.indexOf("await getRequiredUser(");
  const generationInsert = source.indexOf('.from("studio_generations")', authentication);
  const reservation = source.indexOf("await reserveCredits(", generationInsert);
  const providerCall = source.indexOf("await provider.generate(", reservation);
  const upload = source.indexOf(".upload(outputPath", providerCall);
  const completion = source.indexOf('status: "completed"', upload);
  const finalization = source.indexOf("await finalizeCredits(", completion);
  const release = source.indexOf("await releaseCredits(", finalization);

  assert.ok(authentication >= 0);
  assert.ok(authentication < generationInsert);
  assert.ok(generationInsert < reservation);
  assert.ok(reservation < providerCall);
  assert.ok(providerCall < upload);
  assert.ok(upload < completion);
  assert.ok(completion < finalization);
  assert.ok(finalization < release);
  assert.match(source, /INSUFFICIENT_STUDIO_CREDITS/);
  assert.match(source, /STUDIO_CREDIT_REFUND_PENDING/);
  assert.match(source, /recoverCompletedGeneration/);
});
