export const STUDIO_ASPECT_RATIOS = Object.freeze({
  "2:3": [2, 3],
  "3:2": [3, 2],
  "1:1": [1, 1],
  "4:5": [4, 5],
  "9:16": [9, 16],
  "16:9": [16, 9],
});

function getValidDimensions(width, height) {
  const numericWidth = Number(width);
  const numericHeight = Number(height);

  if (
    !Number.isFinite(numericWidth) ||
    !Number.isFinite(numericHeight) ||
    numericWidth <= 0 ||
    numericHeight <= 0
  ) {
    return null;
  }

  return [numericWidth, numericHeight];
}

export function getStudioPreviewGeometry({
  ratio,
  width,
  height,
  preferDimensions = false,
  maxHeight = 680,
} = {}) {
  const mappedDimensions = STUDIO_ASPECT_RATIOS[ratio] || null;
  const actualDimensions = getValidDimensions(width, height);
  const frameDimensions = preferDimensions
    ? actualDimensions || mappedDimensions
    : mappedDimensions || actualDimensions;

  if (!frameDimensions) {
    return null;
  }

  const [frameWidth, frameHeight] = frameDimensions;
  const safeMaxHeight = Number.isFinite(maxHeight) && maxHeight > 0 ? maxHeight : 680;

  return {
    aspectRatio: `${frameWidth} / ${frameHeight}`,
    maxWidth: `${Math.round(safeMaxHeight * (frameWidth / frameHeight))}px`,
  };
}

export function getStudioPreviewStyle(options) {
  const geometry = getStudioPreviewGeometry(options);

  if (!geometry) {
    return undefined;
  }

  return {
    "--studio-preview-aspect-ratio": geometry.aspectRatio,
    "--studio-preview-max-width": geometry.maxWidth,
  };
}
