import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  Bookmark,
  Check,
  Download,
  ImagePlus,
  Move,
  RotateCcw,
  Share2,
} from "lucide-react";

import TemplateArtwork from "./TemplateArtwork";
import {
  getTemplatePhotoAdjustment,
  getTemplatePhotoSlot,
} from "./templateData";

const SAVED_TEMPLATE_KEY = "kushi-saved-templates";
const SAVED_CREATION_KEY = "kushi-personalized-creations";

const readStoredArray = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
};

const isTemplateSaved = (templateId) =>
  Boolean(templateId && readStoredArray(SAVED_TEMPLATE_KEY).includes(templateId));

const clamp = (value) => Math.min(100, Math.max(0, value));
const clampZoom = (value) => Math.min(3, Math.max(1, value));

const TemplatePreview = ({
  template,
  userPhoto = "",
  userCutoutPhoto = "",
  userName = "",
  photoAdjustment = {},
  onPhotoAdjustmentChange,
  onBack,
  onPhotoChange,
  onSaveChange,
}) => {
  const photoInputRef = useRef(null);
  const artworkRef = useRef(null);
  const dragRef = useRef(null);
  const suppressClickRef = useRef(false);
  const [isSaved, setIsSaved] = useState(() => isTemplateSaved(template?.id));
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");
  const [photoFeedback, setPhotoFeedback] = useState("");
  const [saveFeedback, setSaveFeedback] = useState("");

  if (!template) {
    return null;
  }

  const currentAdjustment = getTemplatePhotoAdjustment(
    template,
    photoAdjustment,
  );

  const updatePhotoAdjustment = (nextAdjustment) => {
    onPhotoAdjustmentChange?.({
      ...currentAdjustment,
      ...nextAdjustment,
    });
  };

  const makePreviewPng = async (targetWidth = template.canvas?.width || 1080) => {
    const node = artworkRef.current;

    if (!node) {
      throw new Error("The template preview is not ready yet.");
    }

    const pixelRatio = Math.min(
      4,
      Math.max(1, targetWidth / Math.max(node.offsetWidth, 1)),
    );

    return toPng(node, {
      cacheBust: !String(userPhoto).startsWith("blob:"),
      pixelRatio,
      backgroundColor: "#08080b",
    });
  };

  const handleDownload = async () => {
    if (isDownloading) {
      return;
    }

    setIsDownloading(true);
    setPhotoFeedback("");

    try {
      const dataUrl = await makePreviewPng();
      const link = document.createElement("a");
      const filename = template.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      link.href = dataUrl;
      link.download = `${filename || "kushi-design"}.png`;
      link.click();
    } catch (error) {
      setPhotoFeedback(error?.message || "Download is unavailable right now.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSave = async () => {
    const savedIds = new Set(readStoredArray(SAVED_TEMPLATE_KEY));
    const nextSaved = !savedIds.has(template.id);

    if (nextSaved) {
      savedIds.add(template.id);
    } else {
      savedIds.delete(template.id);
    }

    localStorage.setItem(SAVED_TEMPLATE_KEY, JSON.stringify([...savedIds]));
    setIsSaved(nextSaved);

    const creationId = `locked-${template.id}`;
    const creations = readStoredArray(SAVED_CREATION_KEY).filter(
      (creation) => creation.id !== creationId,
    );

    if (nextSaved) {
      let previewDataUrl = "";

      try {
        previewDataUrl = await makePreviewPng(520);
      } catch {
        // Saving the template selection must still work if image export is blocked.
      }

      creations.unshift({
        id: creationId,
        source: "locked-template",
        templateId: template.id,
        templateTitle: template.title,
        category: template.category,
        name: template.title,
        photoAdjustment: currentAdjustment,
        previewDataUrl,
        savedAt: new Date().toISOString(),
      });
    }

    try {
      localStorage.setItem(SAVED_CREATION_KEY, JSON.stringify(creations));
    } catch {
      const withoutPreview = creations.map((creation) => ({
        ...creation,
        previewDataUrl: "",
      }));
      localStorage.setItem(SAVED_CREATION_KEY, JSON.stringify(withoutPreview));
    }

    window.dispatchEvent(new CustomEvent("kushi-creations-updated"));
    setSaveFeedback(nextSaved ? "Saved" : "Removed");
    onSaveChange?.(nextSaved);
    window.setTimeout(() => setSaveFeedback(""), 1800);
  };

  const handleShare = async () => {
    const shareData = {
      title: `${template.title} · KUSHI AI STUDIO`,
      text: `Check out ${template.title} in KUSHI AI STUDIO.`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareFeedback("Shared");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
        setShareFeedback("Link copied");
      } else {
        setShareFeedback("Share unavailable");
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        setShareFeedback("Share unavailable");
      }
    }

    window.setTimeout(() => setShareFeedback(""), 1800);
  };

  const handlePhotoInputChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

    if (!allowedTypes.has(file.type)) {
      setPhotoFeedback("Choose a JPG, PNG or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPhotoFeedback("Choose an image smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    const isCutout = getTemplatePhotoSlot(template).mode === "cutout";

    setIsUpdatingPhoto(true);
    setPhotoFeedback(
      isCutout ? "Removing the background securely…" : "Updating photo…",
    );

    try {
      await onPhotoChange?.(file);
      setPhotoFeedback(
        isCutout
          ? "Transparent photo updated for this design only."
          : "Photo updated for this design only.",
      );
    } catch (error) {
      setPhotoFeedback(
        error?.message || "The photo could not be updated. Try again.",
      );
    } finally {
      setIsUpdatingPhoto(false);
      event.target.value = "";
    }
  };

  const handlePhotoPointerDown = (event) => {
    if (!userPhoto || !isAdjusting) {
      return;
    }

    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      objectPositionX: currentAdjustment.objectPositionX,
      objectPositionY: currentAdjustment.objectPositionY,
      width: Math.max(event.currentTarget.clientWidth, 1),
      height: Math.max(event.currentTarget.clientHeight, 1),
    };
    suppressClickRef.current = false;
  };

  const handlePhotoPointerMove = (event) => {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (Math.abs(deltaX) + Math.abs(deltaY) > 3) {
      suppressClickRef.current = true;
    }

    updatePhotoAdjustment({
      objectPositionX: clamp(drag.objectPositionX - (deltaX / drag.width) * 100),
      objectPositionY: clamp(drag.objectPositionY - (deltaY / drag.height) * 100),
    });
  };

  const handlePhotoPointerUp = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      dragRef.current = null;
    }
  };

  const handlePhotoClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    if (!userPhoto) {
      photoInputRef.current?.click();
      return;
    }

    setIsAdjusting((current) => !current);
  };

  const handleResetPhotoPosition = () => {
    onPhotoAdjustmentChange?.(getTemplatePhotoAdjustment(template));
  };

  return (
    <section
      className="kushi-template-preview kushi-template-preview--reference"
      style={{
        "--template-accent": template.accentColor || "#D4AF37",
        "--template-accent-soft":
          template.accentSoft || "rgba(212, 175, 55, 0.18)",
      }}
    >
      <header className="kushi-template-preview__reference-header">
        <h2>{template.title}</h2>
        <button
          type="button"
          className="kushi-template-preview__change-template"
          onClick={onBack}
        >
          Back to Templates
        </button>
      </header>

      <div className="kushi-template-preview__reference-body">
        <div className="kushi-template-preview__reference-stage-shell">
          <TemplateArtwork
            template={template}
            userPhoto={userPhoto}
            userCutoutPhoto={userCutoutPhoto}
            userName={userName}
            photoAdjustment={currentAdjustment}
            artworkRef={artworkRef}
            interactivePhoto
            isAdjusting={isAdjusting}
            photoSelected={isAdjusting}
            onPhotoClick={handlePhotoClick}
            onPhotoPointerDown={handlePhotoPointerDown}
            onPhotoPointerMove={handlePhotoPointerMove}
            onPhotoPointerUp={handlePhotoPointerUp}
          />

          {isAdjusting && userPhoto && (
            <p className="kushi-template-preview__adjust-hint" role="status">
              <Move size={15} /> Drag the photo inside its locked frame.
            </p>
          )}
        </div>

        <div className="kushi-template-preview__reference-actions kushi-template-preview__reference-actions--simple">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoInputChange}
            hidden
          />

          <div className="kushi-template-preview__simple-actions">
            <button
              type="button"
              className="kushi-template-preview__simple-share"
              onClick={handleShare}
            >
              <Share2 size={19} />
              {shareFeedback || "Share"}
            </button>

            <button
              type="button"
              className="kushi-template-preview__simple-download"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <Download size={19} />
              {isDownloading ? "Preparing…" : "Download"}
            </button>

            <button
              type="button"
              className="kushi-template-preview__simple-edit"
              onClick={() => photoInputRef.current?.click()}
              disabled={isUpdatingPhoto}
            >
              <ImagePlus size={18} />
              {isUpdatingPhoto ? "Processing…" : "Change Photo"}
            </button>

            <button
              type="button"
              className={`kushi-template-preview__simple-adjust ${
                isAdjusting ? "is-active" : ""
              }`}
              onClick={() => setIsAdjusting((current) => !current)}
              disabled={!userPhoto}
            >
              <Move size={18} />
              {isAdjusting ? "Done Adjusting" : "Adjust Photo Position"}
            </button>
          </div>

          {isAdjusting && userPhoto && (
            <div className="kushi-template-preview__photo-adjustments">
              <label>
                Horizontal: {Math.round(currentAdjustment.objectPositionX)}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentAdjustment.objectPositionX}
                  onChange={(event) =>
                    updatePhotoAdjustment({
                      objectPositionX: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                Vertical: {Math.round(currentAdjustment.objectPositionY)}%
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentAdjustment.objectPositionY}
                  onChange={(event) =>
                    updatePhotoAdjustment({
                      objectPositionY: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label>
                Zoom: {currentAdjustment.zoom.toFixed(2)}×
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={currentAdjustment.zoom}
                  onChange={(event) =>
                    updatePhotoAdjustment({
                      zoom: clampZoom(Number(event.target.value)),
                    })
                  }
                />
              </label>
              <button type="button" onClick={handleResetPhotoPosition}>
                <RotateCcw size={15} /> Reset Photo Position
              </button>
            </div>
          )}

          {photoFeedback && (
            <p className="kushi-template-preview__photo-feedback" role="status">
              {photoFeedback}
            </p>
          )}

          <button
            type="button"
            className={`kushi-template-preview__simple-save ${
              isSaved ? "is-saved" : ""
            }`}
            onClick={handleSave}
          >
            {isSaved ? <Check size={16} /> : <Bookmark size={16} />}
            {saveFeedback ||
              (isSaved ? "Saved to My Creations" : "Save to My Creations")}
          </button>
        </div>
      </div>
    </section>
  );
};

export default TemplatePreview;
