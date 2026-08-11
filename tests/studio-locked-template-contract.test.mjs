import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createBackgrounds,
  getTemplateNameSlot,
  getTemplateFeatherEdges,
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
    assert.match(
      photoSlot.mode,
      /^(normal|circle|rounded|rectangle|feather|cutout)$/,
    );
    assert.equal(nameSlot.enabled, true);
    assert.ok(nameSlot.bottom || nameSlot.top);
  }
});

const getMaskSvg = (photoSlot) => {
  const style = getTemplatePhotoMaskStyle(photoSlot);
  const encodedSvg = style.maskImage.match(
    /^url\("data:image\/svg\+xml,(.*)"\)$/,
  )?.[1];

  assert.ok(encodedSvg);
  return decodeURIComponent(encodedSvg);
};

const getSvgGradient = (svg, id) =>
  svg.match(
    new RegExp(`<linearGradient id="${id}"[^>]*>.*?<\\/linearGradient>`),
  )?.[0] || "";

test("legacy feather strength maps to every directional edge", () => {
  const slot = getTemplatePhotoSlot({
    photoSlot: { mode: "feather", feather: 70 },
  });

  assert.deepEqual(slot.featherEdges, {
    top: 70,
    right: 70,
    bottom: 70,
    left: 70,
  });
});

test("directional feather A keeps the top sharp and fades bottom and sides", () => {
  const slot = getTemplatePhotoSlot({
    photoSlot: {
      mode: "feather",
      featherEdges: { top: 0, right: 20, bottom: 70, left: 20 },
    },
  });
  const svg = getMaskSvg(slot);

  assert.deepEqual(getTemplateFeatherEdges(slot), {
    top: 0,
    right: 20,
    bottom: 70,
    left: 20,
  });
  assert.doesNotMatch(getSvgGradient(svg, "top"), /stop-opacity="0"/);
  assert.match(getSvgGradient(svg, "right"), /offset="0\.9100"/);
  assert.match(getSvgGradient(svg, "bottom"), /offset="0\.6850"/);
  assert.match(getSvgGradient(svg, "left"), /offset="0\.0900"/);
  assert.doesNotMatch(svg, /radialGradient|blur|mask-composite/i);
});

test("directional feather B fades only the bottom edge", () => {
  const slot = getTemplatePhotoSlot({
    photoSlot: {
      mode: "feather",
      featherEdges: { top: 0, right: 0, bottom: 80, left: 0 },
    },
  });
  const svg = getMaskSvg(slot);

  assert.doesNotMatch(getSvgGradient(svg, "top"), /stop-opacity="0"/);
  assert.doesNotMatch(getSvgGradient(svg, "right"), /stop-opacity="0"/);
  assert.match(getSvgGradient(svg, "bottom"), /offset="0\.6400"/);
  assert.doesNotMatch(getSvgGradient(svg, "left"), /stop-opacity="0"/);
});

test("directional feather C fades only the left edge", () => {
  const slot = getTemplatePhotoSlot({
    photoSlot: {
      mode: "feather",
      featherEdges: { top: 0, right: 0, bottom: 0, left: 70 },
    },
  });
  const svg = getMaskSvg(slot);

  assert.doesNotMatch(getSvgGradient(svg, "top"), /stop-opacity="0"/);
  assert.doesNotMatch(getSvgGradient(svg, "right"), /stop-opacity="0"/);
  assert.doesNotMatch(getSvgGradient(svg, "bottom"), /stop-opacity="0"/);
  assert.match(getSvgGradient(svg, "left"), /offset="0\.3150"/);
});

test("normal photo mode has square unmasked placement geometry", () => {
  const slot = getTemplatePhotoSlot({
    photoSlot: { mode: "normal" },
  });

  assert.equal(slot.mode, "normal");
  assert.equal(slot.borderRadius, "0px");
  assert.deepEqual(getTemplatePhotoMaskStyle(slot), {});
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
  const artwork = await readSource(
    "../src/components/studio/templates/TemplateArtwork.jsx",
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
  assert.doesNotMatch(preview, /showSelectionUi/);
  assert.match(artwork, /showSelectionUi && isAdjusting/);
  assert.match(artwork, /showSelectionUi && slotEditing/);
});
