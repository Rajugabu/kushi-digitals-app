import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createBackgrounds,
  getTemplateNameSlot,
  getTemplatePhotoAdjustment,
  getTemplatePhotoMaskStyle,
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

test("cutout renders as a real transparent-photo mode without a feather mask", () => {
  const slot = getTemplatePhotoSlot({
    photoSlot: { mode: "cutout", feather: 72 },
  });

  assert.equal(slot.mode, "cutout");
  assert.equal(slot.renderMode, "cutout");
  assert.equal(slot.isCutoutFallback, false);
  assert.deepEqual(getTemplatePhotoMaskStyle(slot), {});
});

test("admin crop defaults provide user X, Y and zoom without changing frame geometry", () => {
  const template = {
    photoSlot: {
      mode: "circle",
      top: "12%",
      left: "20%",
      width: "42%",
      height: "33.6%",
      defaultObjectPositionX: 61,
      defaultObjectPositionY: 38,
      defaultZoom: 1.45,
    },
  };

  assert.deepEqual(getTemplatePhotoAdjustment(template), {
    objectPositionX: 61,
    objectPositionY: 38,
    zoom: 1.45,
  });
  assert.deepEqual(
    getTemplatePhotoAdjustment(template, {
      objectPositionX: 44,
      objectPositionY: 52,
      zoom: 2,
    }),
    { objectPositionX: 44, objectPositionY: 52, zoom: 2 },
  );

  const slot = getTemplatePhotoSlot(template);
  assert.equal(slot.top, "12%");
  assert.equal(slot.left, "20%");
  assert.equal(slot.width, "42%");
  assert.equal(slot.height, "33.6%");
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
  assert.match(preview, /Reset Photo Position/);
  assert.match(preview, /currentAdjustment\.zoom/);
  assert.match(preview, /Save to My Creations/);
  assert.match(preview, /import TemplateArtwork/);
  assert.match(card, /import TemplateArtwork/);
});
