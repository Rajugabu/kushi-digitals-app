export const STUDIO_CREATIONS_STORAGE_KEY =
  "kushi-personalized-creations";

export function getStudioCreations() {
  try {
    const stored = JSON.parse(
      window.localStorage.getItem(
        STUDIO_CREATIONS_STORAGE_KEY,
      ) || "[]",
    );

    return Array.isArray(stored)
      ? stored.sort((first, second) => {
          const firstDate = Date.parse(
            first.createdAt || first.savedAt || 0,
          );
          const secondDate = Date.parse(
            second.createdAt || second.savedAt || 0,
          );

          return secondDate - firstDate;
        })
      : [];
  } catch {
    return [];
  }
}

export function saveStudioCreation({
  result,
  type,
  title,
  category,
}) {
  if (!result?.resultUrl || !result?.id) {
    return;
  }

  try {
    const stored = JSON.parse(
      window.localStorage.getItem(
        STUDIO_CREATIONS_STORAGE_KEY,
      ) || "[]",
    );
    const creations = Array.isArray(stored) ? stored : [];
    const next = [
      {
        id: result.id,
        source: "ai-studio",
        type,
        title,
        category,
        previewUrl: result.resultUrl,
        downloadUrl: result.downloadUrl,
        ratio: result.ratio,
        createdAt: result.generatedAt,
      },
      ...creations.filter((creation) => creation.id !== result.id),
    ].slice(0, 50);

    window.localStorage.setItem(
      STUDIO_CREATIONS_STORAGE_KEY,
      JSON.stringify(next),
    );
    window.dispatchEvent(new CustomEvent("kushi-creations-updated"));
  } catch (error) {
    console.error("Unable to save Studio creation history:", error);
  }
}
