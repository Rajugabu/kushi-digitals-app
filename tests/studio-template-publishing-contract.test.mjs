import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("template publishing migration is additive and admin-authorized", async () => {
  const migration = await readProjectFile(
    "supabase/migrations/202608100001_studio_template_publishing.sql",
  );

  assert.match(migration, /create table if not exists public\.studio_templates/);
  assert.match(migration, /status in \('draft', 'published'\)/);
  assert.match(migration, /Public can read published studio templates/);
  assert.match(migration, /Admins can read all studio templates/);
  assert.match(migration, /public\.is_referral_admin\(\)/);
  assert.doesNotMatch(migration, /drop table/i);
  assert.doesNotMatch(migration, /truncate/i);
});

test("template assets use a public-read and admin-write bucket", async () => {
  const migration = await readProjectFile(
    "supabase/migrations/202608100001_studio_template_publishing.sql",
  );

  assert.match(migration, /'studio-template-assets'/);
  assert.match(migration, /Public can read studio template assets/);
  assert.match(migration, /Admins can upload studio template assets/);
  assert.match(migration, /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/);
});

test("admin factory persists drafts and published templates through the service", async () => {
  const factory = await readProjectFile(
    "src/pages/admin/AdminTemplateFactory.jsx",
  );
  const service = await readProjectFile("src/services/studioTemplates.js");

  assert.match(factory, /Save Draft/);
  assert.match(factory, /Publish Template/);
  assert.match(factory, /Update Template/);
  assert.match(factory, /My Templates/);
  assert.match(factory, /uploadStudioTemplateAsset/);
  assert.match(service, /\.from\("studio_templates"\)/);
  assert.match(service, /\.from\(STUDIO_TEMPLATE_ASSET_BUCKET\)/);
});

test("public Studio merges published templates with local demos", async () => {
  const studio = await readProjectFile("src/pages/Studio.jsx");

  assert.match(studio, /getPublishedStudioTemplates/);
  assert.match(studio, /\.\.\.publishedTemplates, \.\.\.sampleTemplates/);
  assert.match(studio, /filterTemplates\(readyMadeTemplates, templateCategory\)/);
  assert.match(studio, /availableUserTemplates/);
});
