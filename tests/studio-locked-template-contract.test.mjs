import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createBackgrounds,
  getTemplateNameSlot,
  getTemplatePhotoSlot,
  sampleTemplates,
} from "../src/components/studio/templates/templateData.js";

const readSource = (path) =>
  readFile(new URL(path, import.meta.url), "utf8");

test("ready-made templates expose immutable photo and automatic-name slots", () => {
  assert.ok(sampleTemplates.length > 0);

  for (const template of sampleTemplates) {
    const photoSlot = getTemplatePhotoSlot(template);
    const nameSlot = getTemplateNameSlot(template);

    assert.equal(photoSlot.enabled, true);
    assert.match(photoSlot.mode, /^(circle|rounded|rectangle|feather|cutout)$/);
    assert.equal(nameSlot.enabled, true);
    assert.ok(nameSlot.bottom || nameSlot.top);
  }
});

test("cutout is modeled but safely renders with the feather fallback", () => {
  const slot = getTemplatePhotoSlot({
    photoSlot: { mode: "cutout", feather: 72 },
  });

  assert.equal(slot.mode, "cutout");
  assert.equal(slot.renderMode, "feather");
  assert.equal(slot.isCutoutFallback, true);
});

test("Create backgrounds stay separate and do not expose design text", () => {
  assert.ok(createBackgrounds.length > 0);
  assert.ok(
    createBackgrounds.every(
      (template) =>
        template.experience === "create" && template.showDesignText === false,
    ),
  );
});

test("normal Studio flow does not import or route into TemplateEditor", async () => {
  const studio = await readSource("../src/pages/Studio.jsx");
  const preview = await readSource(
    "../src/components/studio/templates/TemplatePreview.jsx",
  );
  const card = await readSource(
    "../src/components/studio/templates/TemplateCard.jsx",
  );

  assert.doesNotMatch(studio, /import TemplateEditor/);
  assert.doesNotMatch(studio, /<TemplateEditor/);
  assert.match(preview, /Change Photo/);
  assert.match(preview, /Adjust Photo Position/);
  assert.match(preview, /Save to My Creations/);
  assert.match(preview, /import TemplateArtwork/);
  assert.match(card, /import TemplateArtwork/);
});
