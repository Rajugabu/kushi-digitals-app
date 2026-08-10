import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Clipboard,
  Edit3,
  ImagePlus,
  Layers3,
  Move,
  RefreshCw,
  Save,
  Send,
  Upload,
  X,
} from "lucide-react";

import TemplateArtwork from "../../components/studio/templates/TemplateArtwork";
import { TEMPLATE_FILTERS } from "../../components/studio/templates/templateData";
import useStudioProfilePhoto from "../../hooks/useStudioProfilePhoto";
import {
  getAdminStudioTemplates,
  removeStudioTemplateAssets,
  saveStudioTemplate,
  setStudioTemplateStatus,
  slugifyStudioTemplate,
  uploadStudioTemplateAsset,
  validateStudioTemplateAsset,
} from "../../services/studioTemplates";

const canvasPresets = {
  "1:1": { width: 1080, height: 1080, ratio: "1:1" },
  "4:5": { width: 1080, height: 1350, ratio: "4:5" },
  "9:16": { width: 1080, height: 1920, ratio: "9:16" },
};

const categoryOptions = TEMPLATE_FILTERS.filter(
  (filter) => filter.id !== "all" && !filter.type,
).map((filter) => filter.id);

const defaultPhotoSlot = {
  enabled: true,
  mode: "circle",
  top: "12%",
  left: "20%",
  width: "60%",
  height: "48%",
  borderRadius: "999px",
  feather: 70,
  objectFit: "cover",
  defaultObjectPosition: "50% 50%",
  zIndex: 2,
};

const defaultNameSlot = {
  enabled: true,
  bottom: "3%",
  left: "5%",
  width: "90%",
  textAlign: "center",
  fontFamily: "inherit",
  fontSize: "4%",
  fontWeight: 700,
  color: "#FFFFFF",
  zIndex: 5,
};

const percentValue = (value) => Number.parseFloat(value) || 0;
const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

const isMissingPublishingSchema = (error) =>
  error?.code === "42P01" ||
  error?.code === "PGRST205" ||
  error?.message?.includes("studio_templates");

function AdminTemplateFactory() {
  const { profilePhotoUrl, profileFullName } = useStudioProfilePhoto();
  const artworkRef = useRef(null);
  const backgroundObjectUrlRef = useRef("");
  const overlayObjectUrlRef = useRef("");
  const sampleObjectUrlRef = useRef("");
  const slotDragRef = useRef(null);
  const slotResizeRef = useRef(null);

  const [templates, setTemplates] = useState([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [templateId, setTemplateId] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("New Ready-made Template");
  const [category, setCategory] = useState("Good Morning");
  const [templateType, setTemplateType] = useState("photo");
  const [isPremium, setIsPremium] = useState(false);
  const [status, setStatus] = useState("draft");
  const [sortOrder, setSortOrder] = useState(0);
  const [canvas, setCanvas] = useState(canvasPresets["4:5"]);
  const [photoSlot, setPhotoSlot] = useState(defaultPhotoSlot);
  const [nameSlot, setNameSlot] = useState(defaultNameSlot);

  const [backgroundFile, setBackgroundFile] = useState(null);
  const [backgroundPath, setBackgroundPath] = useState("");
  const [backgroundPreview, setBackgroundPreview] = useState("");
  const [overlayFile, setOverlayFile] = useState(null);
  const [foregroundOverlayPath, setForegroundOverlayPath] = useState("");
  const [overlayPreview, setOverlayPreview] = useState("");
  const [removeOverlay, setRemoveOverlay] = useState(false);
  const [samplePhotoUrl, setSamplePhotoUrl] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");

  const revokeObjectUrl = (ref) => {
    if (ref.current) {
      URL.revokeObjectURL(ref.current);
      ref.current = "";
    }
  };

  useEffect(
    () => () => {
      revokeObjectUrl(backgroundObjectUrlRef);
      revokeObjectUrl(overlayObjectUrlRef);
      revokeObjectUrl(sampleObjectUrlRef);
    },
    [],
  );

  const loadTemplates = useCallback(async () => {
    try {
      setIsLoadingTemplates(true);
      setError("");
      setTemplates(await getAdminStudioTemplates());
    } catch (loadError) {
      setError(
        isMissingPublishingSchema(loadError)
          ? "Studio template publishing is not installed yet. Apply the new Supabase migration, then refresh this page."
          : loadError?.message || "Unable to load Studio templates.",
      );
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(loadTemplates, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadTemplates]);

  const draftTemplate = useMemo(
    () => ({
      id: templateId || "admin-template-draft",
      type: templateType,
      title,
      category,
      isPremium,
      canvas,
      backgroundImage: backgroundPreview,
      background: backgroundPreview
        ? undefined
        : {
            type: "gradient",
            value:
              "radial-gradient(circle at 80% 12%, rgba(103,232,249,.28), transparent 28%), linear-gradient(150deg, #312e81, #111827 55%, #05070d)",
          },
      photoSlot,
      foregroundOverlayImage: removeOverlay ? null : overlayPreview || null,
      nameSlot,
      showDesignText: false,
    }),
    [
      backgroundPreview,
      canvas,
      category,
      isPremium,
      nameSlot,
      overlayPreview,
      photoSlot,
      removeOverlay,
      templateId,
      templateType,
      title,
    ],
  );

  const exportConfiguration = useMemo(
    () => ({
      id: templateId || "generated-on-save",
      slug: slug || slugifyStudioTemplate(title),
      type: templateType,
      title,
      category,
      isPremium,
      status,
      canvas,
      backgroundPath: backgroundPath || null,
      photoSlot,
      foregroundOverlayPath:
        removeOverlay ? null : foregroundOverlayPath || null,
      nameSlot,
      sortOrder,
    }),
    [
      backgroundPath,
      canvas,
      category,
      foregroundOverlayPath,
      isPremium,
      nameSlot,
      photoSlot,
      removeOverlay,
      slug,
      sortOrder,
      status,
      templateId,
      templateType,
      title,
    ],
  );

  const updatePhotoPercent = (key, value) => {
    setPhotoSlot((current) => ({ ...current, [key]: `${value}%` }));
  };

  const updateNamePercent = (key, value) => {
    setNameSlot((current) => ({ ...current, [key]: `${value}%` }));
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    window.setTimeout(() => setSuccessMessage(""), 2600);
  };

  const setLocalAsset = (file, type) => {
    validateStudioTemplateAsset(
      file,
      type === "background" ? "Template background" : "Foreground overlay",
    );

    if (type === "background") {
      revokeObjectUrl(backgroundObjectUrlRef);
      backgroundObjectUrlRef.current = URL.createObjectURL(file);
      setBackgroundFile(file);
      setBackgroundPreview(backgroundObjectUrlRef.current);
      return;
    }

    revokeObjectUrl(overlayObjectUrlRef);
    overlayObjectUrlRef.current = URL.createObjectURL(file);
    setOverlayFile(file);
    setOverlayPreview(overlayObjectUrlRef.current);
    setRemoveOverlay(false);
  };

  const handleAssetChange = (event, type) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      setError("");
      setLocalAsset(file, type);
    } catch (assetError) {
      setError(assetError.message);
    }
  };

  const handleSamplePhotoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      validateStudioTemplateAsset(file, "Sample photo");
      revokeObjectUrl(sampleObjectUrlRef);
      sampleObjectUrlRef.current = URL.createObjectURL(file);
      setSamplePhotoUrl(sampleObjectUrlRef.current);
    } catch (sampleError) {
      setError(sampleError.message);
    }
  };

  const resetForm = () => {
    revokeObjectUrl(backgroundObjectUrlRef);
    revokeObjectUrl(overlayObjectUrlRef);
    revokeObjectUrl(sampleObjectUrlRef);
    setTemplateId("");
    setSlug("");
    setTitle("New Ready-made Template");
    setCategory("Good Morning");
    setTemplateType("photo");
    setIsPremium(false);
    setStatus("draft");
    setSortOrder(0);
    setCanvas(canvasPresets["4:5"]);
    setPhotoSlot(defaultPhotoSlot);
    setNameSlot(defaultNameSlot);
    setBackgroundFile(null);
    setBackgroundPath("");
    setBackgroundPreview("");
    setOverlayFile(null);
    setForegroundOverlayPath("");
    setOverlayPreview("");
    setRemoveOverlay(false);
    setSamplePhotoUrl("");
    setError("");
  };

  const editTemplate = (template) => {
    revokeObjectUrl(backgroundObjectUrlRef);
    revokeObjectUrl(overlayObjectUrlRef);
    revokeObjectUrl(sampleObjectUrlRef);
    setTemplateId(template.id);
    setSlug(template.slug);
    setTitle(template.title);
    setCategory(template.category);
    setTemplateType(template.type);
    setIsPremium(template.isPremium);
    setStatus(template.status);
    setSortOrder(template.sortOrder);
    setCanvas(template.canvas);
    setPhotoSlot({ ...defaultPhotoSlot, ...template.photoSlot });
    setNameSlot({ ...defaultNameSlot, ...template.nameSlot });
    setBackgroundFile(null);
    setBackgroundPath(template.backgroundPath);
    setBackgroundPreview(template.backgroundImage);
    setOverlayFile(null);
    setForegroundOverlayPath(template.foregroundOverlayPath);
    setOverlayPreview(template.foregroundOverlayImage);
    setRemoveOverlay(false);
    setSamplePhotoUrl("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateForm = (nextStatus) => {
    if (!title.trim()) {
      throw new Error("Enter a template title.");
    }

    if (!category.trim()) {
      throw new Error("Choose a category.");
    }

    if (nextStatus === "published" && !backgroundFile && !backgroundPath) {
      throw new Error("Upload a finished template background before publishing.");
    }
  };

  const persistTemplate = async (nextStatus) => {
    if (isSaving) {
      return;
    }

    let uploadedBackground = null;
    let uploadedOverlay = null;

    try {
      validateForm(nextStatus);
      setIsSaving(true);
      setError("");

      const nextId = templateId || crypto.randomUUID();

      if (backgroundFile) {
        uploadedBackground = await uploadStudioTemplateAsset(
          backgroundFile,
          nextId,
          "background",
        );
      }

      if (overlayFile && !removeOverlay) {
        uploadedOverlay = await uploadStudioTemplateAsset(
          overlayFile,
          nextId,
          "foreground-overlay",
        );
      }

      const nextBackgroundPath = uploadedBackground?.path || backgroundPath;
      const nextOverlayPath = removeOverlay
        ? ""
        : uploadedOverlay?.path || foregroundOverlayPath;
      const nextSlug =
        slug || `${slugifyStudioTemplate(title)}-${nextId.slice(0, 8)}`;

      const savedTemplate = await saveStudioTemplate({
        id: nextId,
        values: {
          isExisting: Boolean(templateId),
          slug: nextSlug,
          title: title.trim(),
          category,
          type: templateType,
          isPremium,
          status: nextStatus,
          canvas,
          backgroundPath: nextBackgroundPath,
          foregroundOverlayPath: nextOverlayPath,
          photoSlot,
          nameSlot,
          sortOrder: Number(sortOrder) || 0,
        },
      });

      const replacedPaths = [
        uploadedBackground && backgroundPath,
        (uploadedOverlay || removeOverlay) && foregroundOverlayPath,
      ].filter(Boolean);

      if (replacedPaths.length) {
        try {
          await removeStudioTemplateAssets(replacedPaths);
        } catch (cleanupError) {
          console.error("Replaced template assets could not be removed:", cleanupError);
        }
      }

      editTemplate(savedTemplate);
      setStatus(nextStatus);
      setBackgroundFile(null);
      setOverlayFile(null);
      showSuccess(
        nextStatus === "published"
          ? "Template published. It is now eligible for the user feed."
          : templateId
            ? "Template draft updated."
            : "Template draft saved.",
      );
      await loadTemplates();
    } catch (saveError) {
      const orphanedPaths = [uploadedBackground?.path, uploadedOverlay?.path].filter(
        Boolean,
      );

      if (orphanedPaths.length) {
        try {
          await removeStudioTemplateAssets(orphanedPaths);
        } catch (cleanupError) {
          console.error("Unused template assets could not be removed:", cleanupError);
        }
      }

      setError(
        isMissingPublishingSchema(saveError)
          ? "Apply the Studio template publishing migration before saving."
          : saveError?.code === "23505"
            ? "A template with this generated slug already exists."
            : saveError?.message || "Unable to save this template.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const togglePublishedStatus = async (template) => {
    const nextStatus = template.status === "published" ? "draft" : "published";

    if (nextStatus === "published" && !template.backgroundPath) {
      setError("Edit this template and upload a finished background before publishing.");
      return;
    }

    try {
      setActionId(template.id);
      setError("");
      await setStudioTemplateStatus(template, nextStatus);
      showSuccess(
        nextStatus === "published" ? "Template published." : "Template unpublished.",
      );
      await loadTemplates();
    } catch (statusError) {
      setError(statusError?.message || "Unable to update template status.");
    } finally {
      setActionId("");
    }
  };

  const handleSlotPointerDown = (event) => {
    const stage = artworkRef.current;
    if (!stage) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    slotDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      top: percentValue(photoSlot.top),
      left: percentValue(photoSlot.left),
      stageWidth: Math.max(stage.clientWidth, 1),
      stageHeight: Math.max(stage.clientHeight, 1),
      slotWidth: percentValue(photoSlot.width),
      slotHeight: percentValue(photoSlot.height),
    };
  };

  const handleSlotPointerMove = (event) => {
    const drag = slotDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    setPhotoSlot((current) => ({
      ...current,
      top: `${clamp(
        drag.top + ((event.clientY - drag.startY) / drag.stageHeight) * 100,
        0,
        100 - drag.slotHeight,
      ).toFixed(2)}%`,
      left: `${clamp(
        drag.left + ((event.clientX - drag.startX) / drag.stageWidth) * 100,
        0,
        100 - drag.slotWidth,
      ).toFixed(2)}%`,
    }));
  };

  const handleSlotPointerUp = (event) => {
    if (slotDragRef.current?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      slotDragRef.current = null;
    }
  };

  const handleResizePointerDown = (event) => {
    event.stopPropagation();
    const stage = artworkRef.current;
    if (!stage) return;

    event.currentTarget.setPointerCapture?.(event.pointerId);
    slotResizeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: percentValue(photoSlot.width),
      height: percentValue(photoSlot.height),
      left: percentValue(photoSlot.left),
      top: percentValue(photoSlot.top),
      stageWidth: Math.max(stage.clientWidth, 1),
      stageHeight: Math.max(stage.clientHeight, 1),
    };
  };

  const handleResizePointerMove = (event) => {
    event.stopPropagation();
    const resize = slotResizeRef.current;
    if (!resize || resize.pointerId !== event.pointerId) return;

    setPhotoSlot((current) => ({
      ...current,
      width: `${clamp(
        resize.width + ((event.clientX - resize.startX) / resize.stageWidth) * 100,
        10,
        100 - resize.left,
      ).toFixed(2)}%`,
      height: `${clamp(
        resize.height + ((event.clientY - resize.startY) / resize.stageHeight) * 100,
        10,
        100 - resize.top,
      ).toFixed(2)}%`,
    }));
  };

  const handleResizePointerUp = (event) => {
    event.stopPropagation();
    if (slotResizeRef.current?.pointerId === event.pointerId) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      slotResizeRef.current = null;
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(exportConfiguration, null, 2));
    setCopyFeedback("Configuration copied");
    window.setTimeout(() => setCopyFeedback(""), 1800);
  };

  const namePositionKey = nameSlot.top !== undefined ? "top" : "bottom";

  return (
    <section className="admin-template-factory">
      <header className="admin-template-factory__hero">
        <div>
          <span>ADMIN-ONLY TEMPLATE PUBLISHING</span>
          <h1>{templateId ? "Update Template" : "Create Template"}</h1>
          <p>
            Upload finished artwork, define locked dynamic slots, save a draft,
            and publish it directly to the reusable Studio feed.
          </p>
        </div>
        <div className="admin-template-factory__hero-actions">
          {templateId && (
            <button type="button" onClick={resetForm}>
              <X size={17} /> New Template
            </button>
          )}
          <Layers3 size={34} />
        </div>
      </header>

      {error && (
        <div className="admin-order-message error" role="alert">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="admin-order-message success" role="status">
          <Check size={18} /> {successMessage}
        </div>
      )}

      <div className="admin-template-factory__layout">
        <div className="admin-template-factory__controls">
          <fieldset>
            <legend>Template metadata</legend>
            <label>
              Template title
              <input
                value={title}
                maxLength="120"
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <div className="admin-template-factory__field-grid">
              <label>
                Category
                <select value={category} onChange={(event) => setCategory(event.target.value)}>
                  {categoryOptions.map((option) => (
                    <option key={option} value={option}>
                      {TEMPLATE_FILTERS.find((filter) => filter.id === option)?.label || option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Template type
                <select
                  value={templateType}
                  onChange={(event) => setTemplateType(event.target.value)}
                >
                  <option value="photo">Photo</option>
                  <option value="video">Video (architecture only)</option>
                </select>
              </label>
              <label>
                Access
                <select
                  value={isPremium ? "premium" : "free"}
                  onChange={(event) => setIsPremium(event.target.value === "premium")}
                >
                  <option value="free">Free</option>
                  <option value="premium">Premium</option>
                </select>
              </label>
              <label>
                Status
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </label>
              <label>
                Canvas
                <select
                  value={canvas.ratio}
                  onChange={(event) => setCanvas(canvasPresets[event.target.value])}
                >
                  {Object.keys(canvasPresets).map((ratio) => (
                    <option key={ratio} value={ratio}>
                      {ratio}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Sort order
                <input
                  type="number"
                  min="0"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                />
              </label>
            </div>
            {templateType === "video" && (
              <p className="admin-template-factory__notice">
                Video is reserved in the publishing model. This version still
                uploads and renders image artwork only.
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend>Persistent design assets</legend>
            <label className="admin-template-factory__upload">
              <Upload size={17} />
              {backgroundPath || backgroundFile
                ? "Replace finished background"
                : "Upload finished template background"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => handleAssetChange(event, "background")}
              />
            </label>
            {(backgroundPath || backgroundFile) && (
              <small className="admin-template-factory__asset-state">
                Background ready {backgroundFile ? "for upload" : "in Storage"}
              </small>
            )}

            {!removeOverlay && (overlayPreview || foregroundOverlayPath) ? (
              <button
                type="button"
                className="admin-template-factory__remove-asset"
                onClick={() => {
                  setRemoveOverlay(true);
                  setOverlayFile(null);
                  revokeObjectUrl(overlayObjectUrlRef);
                  setOverlayPreview("");
                }}
              >
                <X size={16} /> Remove foreground overlay
              </button>
            ) : (
              <label className="admin-template-factory__upload">
                <Layers3 size={17} /> Optional foreground overlay
                <input
                  type="file"
                  accept="image/png,image/webp"
                  onChange={(event) => handleAssetChange(event, "overlay")}
                />
              </label>
            )}
          </fieldset>

          <fieldset>
            <legend>Locked user-photo slot</legend>
            <p className="admin-template-factory__drag-note">
              <Move size={15} /> Drag the slot in the preview. Drag its gold
              corner handle to resize. Sliders remain available for precision.
            </p>
            <label>
              Mode
              <select
                value={photoSlot.mode}
                onChange={(event) =>
                  setPhotoSlot((current) => ({
                    ...current,
                    mode: event.target.value,
                    borderRadius:
                      event.target.value === "circle"
                        ? "999px"
                        : event.target.value === "rounded"
                          ? "28px"
                          : "0px",
                  }))
                }
              >
                <option value="circle">Circle</option>
                <option value="rounded">Rounded</option>
                <option value="rectangle">Rectangle</option>
                <option value="feather">Feather</option>
                <option value="cutout">Cutout (feather fallback)</option>
              </select>
            </label>
            <div className="admin-template-factory__slider-grid">
              {[
                ["top", "Top"],
                ["left", "Left"],
                ["width", "Width"],
                ["height", "Height"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}: {photoSlot[key]}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={percentValue(photoSlot[key])}
                    onChange={(event) => updatePhotoPercent(key, event.target.value)}
                  />
                </label>
              ))}
            </div>
            {(photoSlot.mode === "feather" || photoSlot.mode === "cutout") && (
              <label>
                Feather: {photoSlot.feather}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={photoSlot.feather}
                  onChange={(event) =>
                    setPhotoSlot((current) => ({
                      ...current,
                      feather: Number(event.target.value),
                    }))
                  }
                />
              </label>
            )}
            {photoSlot.mode === "cutout" && (
              <p className="admin-template-factory__notice">
                No background-removal provider is installed. Cutout is stored
                in the model and safely previews as feather.
              </p>
            )}
          </fieldset>

          <fieldset>
            <legend>Automatic profile name</legend>
            <label className="admin-template-factory__check">
              <input
                type="checkbox"
                checked={nameSlot.enabled}
                onChange={(event) =>
                  setNameSlot((current) => ({
                    ...current,
                    enabled: event.target.checked,
                  }))
                }
              />
              Show profiles.full_name
            </label>
            <div className="admin-template-factory__field-grid">
              <label>
                Position from
                <select
                  value={namePositionKey}
                  onChange={(event) =>
                    setNameSlot((current) => {
                      const next = { ...current };
                      delete next.top;
                      delete next.bottom;
                      next[event.target.value] = "3%";
                      return next;
                    })
                  }
                >
                  <option value="bottom">Bottom</option>
                  <option value="top">Top</option>
                </select>
              </label>
              <label>
                Font weight
                <select
                  value={nameSlot.fontWeight}
                  onChange={(event) =>
                    setNameSlot((current) => ({
                      ...current,
                      fontWeight: Number(event.target.value),
                    }))
                  }
                >
                  {[500, 600, 700, 800, 900].map((weight) => (
                    <option key={weight} value={weight}>
                      {weight}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Alignment
                <select
                  value={nameSlot.textAlign}
                  onChange={(event) =>
                    setNameSlot((current) => ({
                      ...current,
                      textAlign: event.target.value,
                    }))
                  }
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
              <label>
                Name color
                <input
                  type="color"
                  value={nameSlot.color}
                  onChange={(event) =>
                    setNameSlot((current) => ({
                      ...current,
                      color: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <div className="admin-template-factory__slider-grid">
              {[
                [namePositionKey, namePositionKey === "top" ? "Top" : "Bottom"],
                ["left", "Left"],
                ["width", "Width"],
                ["fontSize", "Font size"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}: {nameSlot[key]}
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={percentValue(nameSlot[key])}
                    onChange={(event) => updateNamePercent(key, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <aside className="admin-template-factory__preview">
          <div className="admin-template-factory__preview-heading">
            <div>
              <span>SHARED RENDERER</span>
              <h2>Locked user preview</h2>
            </div>
            <label className="admin-template-factory__sample-upload">
              <ImagePlus size={16} /> Sample Photo
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleSamplePhotoChange}
              />
            </label>
          </div>

          <TemplateArtwork
            template={draftTemplate}
            userPhoto={samplePhotoUrl || profilePhotoUrl}
            userName={profileFullName || "Sample Profile Name"}
            artworkRef={artworkRef}
            interactivePhoto
            isAdjusting
            slotEditing
            onPhotoPointerDown={handleSlotPointerDown}
            onPhotoPointerMove={handleSlotPointerMove}
            onPhotoPointerUp={handleSlotPointerUp}
            onSlotResizePointerDown={handleResizePointerDown}
            onSlotResizePointerMove={handleResizePointerMove}
            onSlotResizePointerUp={handleResizePointerUp}
          />

          <p>
            The sample photo is temporary and is never stored in the published
            template. Real users receive their own profile photo and full name.
          </p>

          <div className="admin-template-factory__save-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={() => persistTemplate("draft")}
              disabled={isSaving}
            >
              <Save size={17} /> {isSaving ? "Saving..." : "Save Draft"}
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => persistTemplate("published")}
              disabled={isSaving}
            >
              <Send size={17} /> {isSaving ? "Publishing..." : "Publish Template"}
            </button>
            {templateId && (
              <button
                type="button"
                className="admin-template-factory__update-button"
                onClick={() => persistTemplate(status)}
                disabled={isSaving}
              >
                <Check size={17} /> Update Template
              </button>
            )}
          </div>

          <details className="admin-template-factory__developer-config">
            <summary>Developer configuration utility</summary>
            <button type="button" onClick={handleCopy}>
              {copyFeedback ? <Check size={17} /> : <Clipboard size={17} />}
              {copyFeedback || "Copy configuration JSON"}
            </button>
            <pre>{JSON.stringify(exportConfiguration, null, 2)}</pre>
          </details>
        </aside>
      </div>

      <section className="admin-template-list">
        <header>
          <div>
            <span>ADMIN LIBRARY</span>
            <h2>My Templates</h2>
          </div>
          <button type="button" onClick={loadTemplates} disabled={isLoadingTemplates}>
            <RefreshCw size={17} /> Refresh
          </button>
        </header>

        {isLoadingTemplates ? (
          <div className="admin-template-list__empty">Loading templates...</div>
        ) : templates.length === 0 ? (
          <div className="admin-template-list__empty">
            No persisted templates yet. Save your first draft above.
          </div>
        ) : (
          <div className="admin-template-list__grid">
            {templates.map((template) => (
              <article key={template.id}>
                <div className="admin-template-list__thumbnail">
                  {template.backgroundImage ? (
                    <img src={template.backgroundImage} alt="" />
                  ) : (
                    <ImagePlus size={28} />
                  )}
                  <span className={template.status}>{template.status}</span>
                </div>
                <div className="admin-template-list__copy">
                  <strong>{template.title}</strong>
                  <span>{template.category}</span>
                  <small>
                    {template.isPremium ? "Premium" : "Free"} · {template.type}
                  </small>
                </div>
                <div className="admin-template-list__actions">
                  <button type="button" onClick={() => editTemplate(template)}>
                    <Edit3 size={15} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePublishedStatus(template)}
                    disabled={actionId === template.id}
                  >
                    {template.status === "published" ? (
                      <><Save size={15} /> Unpublish</>
                    ) : (
                      <><Send size={15} /> Publish</>
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default AdminTemplateFactory;
