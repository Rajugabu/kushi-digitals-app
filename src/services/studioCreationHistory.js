const STORAGE_KEY = "kushi-personalized-creations";

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
      window.localStorage.getItem(STORAGE_KEY) || "[]",
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

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("kushi-creations-updated"));
  } catch (error) {
    console.error("Unable to save Studio creation history:", error);
  }
}
