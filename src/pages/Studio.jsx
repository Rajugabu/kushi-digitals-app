import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Bookmark,
  Coins,
  Plus,
  Search,
  Sparkles,
  Sun,
  Trash2,
  WandSparkles,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

import GenerationResult from "../components/studio/GenerationResult";
import OutputRatioSelector from "../components/studio/OutputRatioSelector";
import PhotoUploader from "../components/studio/PhotoUploader";
import SelectedStyleSummary from "../components/studio/SelectedStyleSummary";
import StudioCreditPurchase from "../components/studio/StudioCreditPurchase";
import StyleCard from "../components/studio/StyleCard";
import StyleCategories from "../components/studio/StyleCategories";

import TemplateGrid from "../components/studio/templates/TemplateGrid";
import TemplatePreview from "../components/studio/templates/TemplatePreview";
import TemplateSidebar from "../components/studio/templates/TemplateSidebar";
import {
  createBackgrounds,
  filterTemplates,
  getTemplateFilter,
  getTemplatePhotoSlot,
  sampleTemplates,
} from "../components/studio/templates/templateData";

import SEO from "../components/SEO";

import {
  formatStudioPrice,
  getStudioStyleById,
  STUDIO_CATEGORIES,
  studioStyles,
} from "../config/studioStyles";

import {
  generateStudioDesign,
  getStudioCreditBalance,
  STUDIO_GENERATION_STAGES,
} from "../services/studioService";

import { supabase } from "../services/supabase";
import useStudioProfilePhoto from "../hooks/useStudioProfilePhoto";
import {
  getStudioProfileCutout,
  removeStudioPhotoBackground,
} from "../services/studioPhotoBackground";
import { getPublishedStudioTemplates } from "../services/studioTemplates";

const emptyErrors = {
  photo1: "",
  photo2: "",
  form: "",
};

const readPhotoAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("The selected photo could not be read."));
    });
    reader.addEventListener("error", () => {
      reject(new Error("The selected photo could not be read."));
    });
    reader.readAsDataURL(file);
  });

function Studio() {
  const [searchParams] = useSearchParams();
  const {
    profilePhotoUrl,
    profileFullName,
    profileAvatarPath,
  } = useStudioProfilePhoto();

  const initialStyle = getStudioStyleById(searchParams.get("style"));

  const stylesSectionRef = useRef(null);
  const uploadSectionRef = useRef(null);
  const resultSectionRef = useRef(null);
  const templatesSectionRef = useRef(null);
  const objectUrlsRef = useRef(new Set());

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [studioExperience, setStudioExperience] = useState("ready");
  const [templateCategory, setTemplateCategory] = useState("all");
  const [showSavedTemplates, setShowSavedTemplates] = useState(false);
  const [savedTemplateIds, setSavedTemplateIds] = useState(() => new Set());
  const [savedCreations, setSavedCreations] = useState([]);
  const [templatePhotoOverrides, setTemplatePhotoOverrides] = useState({});
  const [publishedTemplates, setPublishedTemplates] = useState([]);
  const [profileCutout, setProfileCutout] = useState({
    sourcePath: "",
    signedUrl: "",
  });
  const [templatePhotoAdjustments, setTemplatePhotoAdjustments] = useState(
    () => {
      try {
        const stored = JSON.parse(
          window.localStorage.getItem("kushi-template-photo-adjustments") ||
            "{}",
        );
        return stored && typeof stored === "object" ? stored : {};
      } catch {
        return {};
      }
    },
  );

  const [selectedStyle, setSelectedStyle] = useState(initialStyle);

  const [photos, setPhotos] = useState([null, null]);

  const [outputRatio, setOutputRatio] = useState(
    initialStyle?.supportedRatios[0] || "",
  );

  const [generationStatus, setGenerationStatus] = useState("idle");
  const [generationStage, setGenerationStage] = useState("preparing");
  const [generatedResult, setGeneratedResult] = useState(null);

  const [favorites, setFavorites] = useState(() => new Set());

  const [errors, setErrors] = useState(emptyErrors);

  const [shareFeedback, setShareFeedback] = useState("");

  const [creditAccount, setCreditAccount] = useState({
    isAuthenticated: null,
    availableCredits: 0,
    reservedCredits: 0,
  });

  const [creditBalanceStatus, setCreditBalanceStatus] =
    useState("loading");

  const [creditBalanceError, setCreditBalanceError] = useState("");

  const [isCreditPurchaseOpen, setIsCreditPurchaseOpen] =
    useState(false);

  const isGenerating = generationStatus === "generating";

  const hasInsufficientCredits = Boolean(
    selectedStyle &&
      creditAccount.isAuthenticated &&
      creditAccount.availableCredits < selectedStyle.credits,
  );

  const generationDisabled =
    isGenerating ||
    creditBalanceStatus !== "ready" ||
    !creditAccount.isAuthenticated ||
    hasInsufficientCredits;

  const loadCreditBalance = useCallback(async () => {
    setCreditBalanceStatus("loading");
    setCreditBalanceError("");

    try {
      const account = await getStudioCreditBalance();

      setCreditAccount(account);
      setCreditBalanceStatus("ready");
    } catch (error) {
      setCreditBalanceStatus("error");

      setCreditBalanceError(
        error.message ||
          "Your Studio credit balance could not be loaded.",
      );
    }
  }, []);

  const handleCreditsAdded = useCallback(
    async (result) => {
      setCreditAccount((current) => ({
        ...current,
        isAuthenticated: true,
        availableCredits: result.availableCredits,
      }));

      setCreditBalanceStatus("ready");
      setCreditBalanceError("");

      await loadCreditBalance();
    },
    [loadCreditBalance],
  );

  const loadSavedTemplateIds = useCallback(() => {
    try {
      const stored = JSON.parse(
        window.localStorage.getItem("kushi-saved-templates") || "[]",
      );

      setSavedTemplateIds(
        new Set(Array.isArray(stored) ? stored : []),
      );
    } catch {
      setSavedTemplateIds(new Set());
    }
  }, []);

  const loadSavedCreations = useCallback(() => {
    try {
      const stored = JSON.parse(
        window.localStorage.getItem(
          "kushi-personalized-creations",
        ) || "[]",
      );

      setSavedCreations(
        Array.isArray(stored) ? stored : [],
      );
    } catch {
      setSavedCreations([]);
    }
  }, []);

  const handleSavedTemplatesToggle = () => {
    loadSavedTemplateIds();
    loadSavedCreations();

    setShowSavedTemplates((current) => {
      const next = !current;

      if (next) {
        setTemplateCategory("all");
        setSelectedTemplate(null);
        setStudioExperience("ready");
      }

      return next;
    });
  };

  const handleDeleteSavedCreation = (creationId) => {
    const shouldDelete = window.confirm(
      "Delete this saved creation?",
    );

    if (!shouldDelete) {
      return;
    }

    try {
      const storageKey =
        "kushi-personalized-creations";

      const stored = JSON.parse(
        window.localStorage.getItem(
          storageKey,
        ) || "[]",
      );

      const existingCreations =
        Array.isArray(stored) ? stored : [];

      const nextCreations =
        existingCreations.filter(
          (creation) =>
            creation.id !== creationId,
        );

      window.localStorage.setItem(
        storageKey,
        JSON.stringify(nextCreations),
      );

      setSavedCreations(nextCreations);

      window.dispatchEvent(
        new CustomEvent(
          "kushi-creations-updated",
        ),
      );
    } catch (error) {
      console.error(
        "Delete saved creation failed:",
        error,
      );
    }
  };

  const readyMadeTemplates = useMemo(() => {
    const byId = new Map();

    [...publishedTemplates, ...sampleTemplates].forEach((template) => {
      if (!byId.has(template.id)) {
        byId.set(template.id, template);
      }
    });

    return [...byId.values()];
  }, [publishedTemplates]);

  const hasCutoutTemplates = useMemo(
  () =>
    readyMadeTemplates.some((template) => {
      const mode = getTemplatePhotoSlot(template).mode;

      return mode === "cutout" || mode === "feather";
    }),
  [readyMadeTemplates],
);

  const profileCutoutUrl =
    profileCutout.sourcePath === profileAvatarPath
      ? profileCutout.signedUrl
      : "";

  useEffect(() => {
    if (!profileAvatarPath || !hasCutoutTemplates) {
      return undefined;
    }

    let isActive = true;
    let refreshTimer;

    const prepareTemporaryProfileCutout = async () => {
      const { data: originalPhoto, error: downloadError } =
        await supabase.storage
          .from("profile-photos")
          .download(profileAvatarPath);

      if (downloadError || !originalPhoto) {
        throw new Error(
          downloadError?.message ||
            "Your profile photo could not be opened for background removal.",
        );
      }

      const extension =
        profileAvatarPath.split(".").pop()?.toLowerCase() || "jpg";

      const fallbackTypes = {
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
      };

      const photoType =
        originalPhoto.type ||
        fallbackTypes[extension] ||
        "image/jpeg";

      const profileFile = new File(
        [originalPhoto],
        `profile-photo.${extension}`,
        { type: photoType },
      );

      const cutoutFile =
        await removeStudioPhotoBackground(profileFile);

      return readPhotoAsDataUrl(cutoutFile);
    };

    const loadCutout = async (refresh = false) => {
      try {
        /*
         * Preferred path:
         * use the secure server-side cached profile cutout so the
         * same avatar does not call Photoroom repeatedly.
         */
        const result = await getStudioProfileCutout(
          profileAvatarPath,
          { refresh },
        );

        if (!isActive || !result?.signedUrl) {
          return;
        }

        setProfileCutout({
          sourcePath: profileAvatarPath,
          signedUrl: result.signedUrl,
        });

        const expiresAt = Date.parse(
          result.expiresAt || "",
        );

        if (Number.isFinite(expiresAt)) {
          const refreshDelay = Math.max(
            60_000,
            expiresAt -
              Date.now() -
              5 * 60 * 1000,
          );

          refreshTimer = window.setTimeout(
            () => loadCutout(true),
            refreshDelay,
          );
        }
      } catch (cachedCutoutError) {
        /*
         * Safety fallback:
         * If the cached profile-cutout request fails for any reason,
         * download the authenticated user's own private avatar and run
         * the already-working temporary Photoroom path once for this
         * Studio session. This keeps Feather/Cutout automatic instead of
         * silently showing the original background.
         */
        try {
          const temporaryCutoutUrl =
            await prepareTemporaryProfileCutout();

          if (!isActive) {
            return;
          }

          setProfileCutout({
            sourcePath: profileAvatarPath,
            signedUrl: temporaryCutoutUrl,
          });

          console.warn(
            "Cached profile cutout was unavailable; temporary automatic cutout is being used.",
            cachedCutoutError,
          );
        } catch (fallbackError) {
          if (!isActive) {
            return;
          }

          console.warn(
            "Automatic profile background removal failed.",
            {
              cachedCutoutError,
              fallbackError,
            },
          );

          setProfileCutout({
            sourcePath: profileAvatarPath,
            signedUrl: "",
          });
        }
      }
    };

    loadCutout();

    return () => {
      isActive = false;
      window.clearTimeout(refreshTimer);
    };
  }, [
    hasCutoutTemplates,
    profileAvatarPath,
  ]);

  const availableUserTemplates = useMemo(
    () => [...readyMadeTemplates, ...createBackgrounds],
    [readyMadeTemplates],
  );

  const filteredTemplates = useMemo(() => {
    let nextTemplates =
      studioExperience === "create"
        ? createBackgrounds
        : filterTemplates(readyMadeTemplates, templateCategory);

    if (showSavedTemplates) {
      nextTemplates = availableUserTemplates.filter((template) =>
        savedTemplateIds.has(template.id),
      );
    }

    return nextTemplates;
  }, [
    templateCategory,
    studioExperience,
    showSavedTemplates,
    savedTemplateIds,
    availableUserTemplates,
    readyMadeTemplates,
  ]);

  const templateGalleryLabel = showSavedTemplates
    ? "My Creations"
    : studioExperience === "create"
      ? "Choose a Background"
      : getTemplateFilter(templateCategory).label;

  const standaloneSavedCreations = savedCreations.filter(
    (creation) => creation.source !== "locked-template",
  );

  const templateGalleryCount = showSavedTemplates
    ? standaloneSavedCreations.length + filteredTemplates.length
    : filteredTemplates.length;

  const TemplateGalleryIcon =
    templateCategory === "Good Morning" && !showSavedTemplates
      ? Sun
      : Sparkles;

  const handleTemplateCategorySelect = (category) => {
    setTemplateCategory(category);
    setSelectedTemplate(null);
    setShowSavedTemplates(false);
  };

  const handleStudioExperienceChange = (experience) => {
    setStudioExperience(experience);
    setSelectedTemplate(null);
    setTemplateCategory("all");
    setShowSavedTemplates(false);
  };

  const filteredStyles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return studioStyles.filter((style) => {
      if (!style.isActive) {
        return false;
      }

      const matchesCategory =
        selectedCategory === "All" ||
        style.category === selectedCategory;

      const searchableText = [
        style.name,
        style.category,
        ...style.tags,
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesCategory &&
        (!query || searchableText.includes(query))
      );
    });
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  useEffect(() => {
    loadSavedTemplateIds();
    loadSavedCreations();

    const handleStorage = (event) => {
      if (
        !event.key ||
        event.key === "kushi-saved-templates"
      ) {
        loadSavedTemplateIds();
      }

      if (
        !event.key ||
        event.key === "kushi-personalized-creations"
      ) {
        loadSavedCreations();
      }
    };

    const handleCreationsUpdated = () => {
      loadSavedCreations();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(
      "kushi-creations-updated",
      handleCreationsUpdated,
    );

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        "kushi-creations-updated",
        handleCreationsUpdated,
      );
    };
  }, [loadSavedCreations, loadSavedTemplateIds]);

  useEffect(() => {
    let isMounted = true;

    const loadPublishedTemplates = async () => {
      try {
        const templates = await getPublishedStudioTemplates();

        if (isMounted) {
          setPublishedTemplates(templates);
        }
      } catch (loadError) {
        /*
         * Keep local demo templates available until the additive publishing
         * migration is applied. A missing/temporarily unavailable publishing
         * table must never break the public Studio feed.
         */
        console.warn("Published Studio templates are unavailable:", loadError);
      }
    };

    loadPublishedTemplates();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(
      loadCreditBalance,
      0,
    );

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(loadCreditBalance, 0);
    });

    return () => {
      window.clearTimeout(loadTimer);
      subscription.unsubscribe();
    };
  }, [loadCreditBalance]);

  useEffect(() => {
    if (!shareFeedback) {
      return undefined;
    }

    const timer = window.setTimeout(
      () => setShareFeedback(""),
      2600,
    );

    return () => window.clearTimeout(timer);
  }, [shareFeedback]);

  const releasePhoto = (photo) => {
    if (!photo?.previewUrl) {
      return;
    }

    URL.revokeObjectURL(photo.previewUrl);
    objectUrlsRef.current.delete(photo.previewUrl);
  };

  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
  };

  const handleTemplateBack = () => {
    setSelectedTemplate(null);
  };

  const handleTemplatePhotoChange = async (file) => {
    if (!selectedTemplate || !file) {
      return;
    }

    const templateId = selectedTemplate.id;
    const photoMode = getTemplatePhotoSlot(selectedTemplate).mode;
    const previousUrl = templatePhotoOverrides[templateId];

    if (previousUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previousUrl);
      objectUrlsRef.current.delete(previousUrl);
    }

    const renderedFile =
  photoMode === "cutout" || photoMode === "feather"
    ? await removeStudioPhotoBackground(file)
    : file;
    const dataUrl = await readPhotoAsDataUrl(renderedFile);

    setTemplatePhotoOverrides((current) => ({
      ...current,
      [templateId]: dataUrl,
    }));
  };

  const handleTemplatePhotoAdjustment = (adjustment) => {
    if (!selectedTemplate) {
      return;
    }

    setTemplatePhotoAdjustments((current) => {
      const next = {
        ...current,
        [selectedTemplate.id]: adjustment,
      };

      window.localStorage.setItem(
        "kushi-template-photo-adjustments",
        JSON.stringify(next),
      );

      return next;
    });
  };

  const handleOpenSavedCreation = (creation) => {
    const sourceTemplate = availableUserTemplates.find(
      (template) => template.id === creation.templateId,
    );

    if (!sourceTemplate) {
      return;
    }

    setStudioExperience(
      sourceTemplate.experience === "create" ? "create" : "ready",
    );
    setSelectedTemplate(sourceTemplate);

    if (creation.photoAdjustment) {
      setTemplatePhotoAdjustments((current) => ({
        ...current,
        [sourceTemplate.id]: creation.photoAdjustment,
      }));
    }

    window.setTimeout(() => {
      templatesSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  const handleStyleSelect = (style) => {
    if (isGenerating) {
      return;
    }

    if (selectedStyle?.id !== style.id) {
      setGeneratedResult(null);
      setGenerationStatus("idle");
      setGenerationStage("preparing");
      setErrors(emptyErrors);
    }

    if (style.photosRequired === 1 && photos[1]) {
      releasePhoto(photos[1]);

      setPhotos((current) => [
        current[0],
        null,
      ]);
    }

    setSelectedStyle(style);

    setOutputRatio((current) =>
      style.supportedRatios.includes(current)
        ? current
        : style.supportedRatios[0],
    );

    window.setTimeout(() => {
      uploadSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
  };

  const handlePhoto = (index, file) => {
    if (isGenerating) {
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    objectUrlsRef.current.add(previewUrl);

    setPhotos((current) => {
      releasePhoto(current[index]);

      const next = [...current];

      next[index] = {
        file,
        previewUrl,
      };

      return next;
    });

    setErrors((current) => ({
      ...current,
      [index === 0 ? "photo1" : "photo2"]: "",
      form: "",
    }));

    setGeneratedResult(null);
    setGenerationStatus("idle");
    setGenerationStage("preparing");
  };

  const handleRemovePhoto = (index) => {
    if (isGenerating) {
      return;
    }

    setPhotos((current) => {
      releasePhoto(current[index]);

      const next = [...current];

      next[index] = null;

      return next;
    });

    setGeneratedResult(null);
    setGenerationStatus("idle");
    setGenerationStage("preparing");
  };

  const handleFavorite = (styleId) => {
    setFavorites((current) => {
      const next = new Set(current);

      if (next.has(styleId)) {
        next.delete(styleId);
      } else {
        next.add(styleId);
      }

      return next;
    });
  };

  const handleShare = async (style) => {
    const shareUrl = new URL(
      "/studio",
      window.location.origin,
    );

    shareUrl.searchParams.set("style", style.id);

    const shareData = {
      title: `${style.name} · Kushi Digitals Studio`,
      text: `Explore the ${style.name} style in Kushi Digitals Design Studio.`,
      url: shareUrl.toString(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);

        setShareFeedback(
          "Style shared successfully.",
        );
      } else {
        await navigator.clipboard.writeText(
          shareData.url,
        );

        setShareFeedback(
          "Style link copied to clipboard.",
        );
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setShareFeedback(
          "Unable to share this style right now.",
        );
      }
    }
  };

  const validateRequest = () => {
    const nextErrors = { ...emptyErrors };

    if (!selectedStyle) {
      nextErrors.form =
        "Choose a style before generating your design.";
    }

    if (!photos[0]) {
      nextErrors.photo1 =
        "Add your main photo to continue.";
    }

    if (
      selectedStyle?.photosRequired === 2 &&
      !photos[1]
    ) {
      nextErrors.photo2 =
        "This style needs a secondary photo.";
    }

    if (!outputRatio) {
      nextErrors.form =
        "Choose an output ratio to continue.";
    }

    setErrors(nextErrors);

    return !Object.values(nextErrors).some(Boolean);
  };

  const handleGenerate = async () => {
    if (isGenerating) {
      return;
    }

    if (!creditAccount.isAuthenticated) {
      setErrors((current) => ({
        ...current,
        form:
          "Sign in before generating a Studio design.",
      }));

      return;
    }

    if (hasInsufficientCredits) {
      setErrors((current) => ({
        ...current,
        form: `INSUFFICIENT_STUDIO_CREDITS: This style needs ${selectedStyle.credits} credits, but your balance is ${creditAccount.availableCredits}.`,
      }));

      return;
    }

    if (!validateRequest()) {
      return;
    }

    setGenerationStatus("generating");
    setGenerationStage("preparing");
    setGeneratedResult(null);
    setErrors(emptyErrors);

    window.setTimeout(() => {
      resultSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 60);

    try {
      const result = await generateStudioDesign(
        {
          styleId: selectedStyle.id,
          ratio: outputRatio,
          photo1: photos[0].file,
          photo2: photos[1]?.file,
        },
        {
          onStatus: setGenerationStage,
        },
      );

      setGeneratedResult(result);
      setGenerationStatus("complete");

      setCreditAccount((current) => ({
        ...current,
        availableCredits:
          result.availableCredits,
      }));
    } catch (error) {
      setGenerationStatus("error");

      loadCreditBalance();

      setErrors((current) => ({
        ...current,
        form:
          error.message ||
          "We could not prepare your design. Check your connection and try again.",
      }));
    }
  };

  const handleStartOver = () => {
    photos.forEach(releasePhoto);

    setPhotos([null, null]);
    setSelectedStyle(null);
    setOutputRatio("");
    setGeneratedResult(null);
    setGenerationStatus("idle");
    setGenerationStage("preparing");
    setErrors(emptyErrors);

    window.setTimeout(() => {
      stylesSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 50);
  };

  const generateLabel = !selectedStyle
    ? "Generate"
    : `Generate · ${formatStudioPrice(
        selectedStyle,
      )}`;

  return (
    <div className="studio-page">
      <SEO
        title="AI Photo Design Studio | Kushi Digitals"
        description="Choose a creative style, upload your photos and prepare a premium AI-assisted design with Kushi Digitals."
      />

      <section className="studio-hero" hidden>
        <div
          className="studio-hero-orb studio-hero-orb-one"
          aria-hidden="true"
        />

        <div
          className="studio-hero-orb studio-hero-orb-two"
          aria-hidden="true"
        />

        <div className="container studio-hero-content">
          <span className="studio-hero-badge">
            <WandSparkles size={15} />
            Creative workspace
          </span>

          <h1>
            Design <span>Studio</span>
          </h1>

          <p>
            Upload your photo, choose a style, and
            create beautiful artwork.
          </p>

          <div className="studio-credit-actions">
            <div
              className="studio-credit-balance"
              aria-live="polite"
            >
              <Coins size={18} />

              {creditBalanceStatus ===
              "loading" ? (
                <span>
                  Loading Studio credits…
                </span>
              ) : creditAccount.isAuthenticated ? (
                <span>
                  Studio balance{" "}
                  <strong>
                    {
                      creditAccount.availableCredits
                    }{" "}
                    Credits
                  </strong>
                </span>
              ) : (
                <span>
                  <Link
                    to="/login"
                    state={{ from: "/studio" }}
                  >
                    Sign in
                  </Link>{" "}
                  to view and use Studio credits
                </span>
              )}
            </div>

            {creditAccount.isAuthenticated && (
              <button
                type="button"
                className="studio-buy-credits"
                onClick={() =>
                  setIsCreditPurchaseOpen(true)
                }
              >
                <Plus size={17} />
                Buy Credits
              </button>
            )}
          </div>

        </div>
      </section>

      <section
        className="studio-template-showcase is-template-browser"
        ref={templatesSectionRef}
      >
        <div className="container studio-template-browser-shell">
          {selectedTemplate ? (
            <div className="studio-simple-template-shell">
              <TemplatePreview
                template={selectedTemplate}
                userPhoto={
                  templatePhotoOverrides[selectedTemplate.id] || profilePhotoUrl
                }
                userCutoutPhoto={
                  templatePhotoOverrides[selectedTemplate.id]
                    ? ""
                    : profileCutoutUrl
                }
                userName={profileFullName}
                photoAdjustment={
                  templatePhotoAdjustments[selectedTemplate.id]
                }
                onPhotoAdjustmentChange={handleTemplatePhotoAdjustment}
                onBack={handleTemplateBack}
                onPhotoChange={handleTemplatePhotoChange}
                onSaveChange={() => {
                  loadSavedTemplateIds();
                  loadSavedCreations();
                }}
              />
            </div>
          ) : (
            <>
              <div className="studio-template-experience-bar">
                <button
                  type="button"
                  className={`studio-create-mode-button ${
                    studioExperience === "create" ? "is-active" : ""
                  }`}
                  onClick={() =>
                    handleStudioExperienceChange(
                      studioExperience === "create" ? "ready" : "create",
                    )
                  }
                >
                  <Plus size={17} />
                  {studioExperience === "create"
                    ? "Ready-made Templates"
                    : "Create"}
                </button>

                <button
                  type="button"
                  className={`studio-my-creations-button ${
                    showSavedTemplates ? "is-active" : ""
                  }`}
                  onClick={handleSavedTemplatesToggle}
                >
                  <Bookmark size={15} />
                  {showSavedTemplates ? "All Templates" : "My Creations"}
                </button>
              </div>

              <div
                className={`kushi-template-browser ${
                  studioExperience === "create" || showSavedTemplates
                    ? "is-without-sidebar"
                    : ""
                }`}
              >
                {studioExperience === "ready" && !showSavedTemplates && (
                  <TemplateSidebar
                    selectedCategory={templateCategory}
                    onSelectCategory={handleTemplateCategorySelect}
                  />
                )}

                <div className="kushi-template-browser__main">
                  <div className="studio-template-feed-toolbar">
                    <span className="studio-style-count">
                      {showSavedTemplates
                        ? `${templateGalleryCount} saved`
                        : studioExperience === "create"
                          ? `${filteredTemplates.length} backgrounds`
                          : `${filteredTemplates.length} templates`}
                    </span>
                  </div>

                  <div className="kushi-template-workspace">
                    <div className="kushi-template-workspace__gallery">
                      <header className="kushi-template-gallery__heading">
                        <div>
                          <span className="kushi-template-gallery__heading-icon">
                            <TemplateGalleryIcon size={21} />
                          </span>
                          <h3>{templateGalleryLabel}</h3>
                        </div>

                        <span className="kushi-template-gallery__count">
                          {templateGalleryCount}
                        </span>
                      </header>

                      {showSavedTemplates &&
                        standaloneSavedCreations.length > 0 && (
                          <div className="studio-saved-creation-section">
                            <div
                              className="kushi-template-grid"
                              aria-label="Personalized creations"
                            >
                              {standaloneSavedCreations.map((creation) => {
                                const sourceTemplate = availableUserTemplates.find(
                                  (template) =>
                                    template.id === creation.templateId,
                                );
                                const previewSource =
                                  creation.previewDataUrl ||
                                  sourceTemplate?.thumbnail ||
                                  "";

                                return (
                                  <article
                                    key={creation.id}
                                    className="kushi-template-card kushi-saved-creation-card"
                                  >
                                    <div className="kushi-template-card__preview">
                                      {previewSource ? (
                                        <img
                                          src={previewSource}
                                          alt={
                                            creation.name ||
                                            creation.templateTitle ||
                                            "Saved creation"
                                          }
                                          className="kushi-template-card__thumbnail"
                                        />
                                      ) : (
                                        <div className="kushi-saved-creation-card__empty">
                                          Saved Creation
                                        </div>
                                      )}

                                      <span className="kushi-template-card__badge">
                                        Saved Creation
                                      </span>
                                    </div>

                                    <div className="kushi-template-card__footer">
                                      <div className="kushi-template-card__footer-copy">
                                        <strong>
                                          {creation.name ||
                                            creation.templateTitle ||
                                            "My Creation"}
                                        </strong>
                                        <span>
                                          {creation.category ||
                                            "Personalized design"}
                                        </span>
                                      </div>

                                      <div className="kushi-saved-creation-card__actions">
                                        <button
                                          type="button"
                                          className="kushi-template-card__action"
                                          onClick={() =>
                                            handleOpenSavedCreation(creation)
                                          }
                                        >
                                          Open
                                        </button>
                                        <button
                                          type="button"
                                          className="kushi-template-card__action"
                                          onClick={() =>
                                            handleDeleteSavedCreation(creation.id)
                                          }
                                        >
                                          <Trash2 size={14} /> Delete
                                        </button>
                                      </div>
                                    </div>
                                  </article>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      {showSavedTemplates && templateGalleryCount === 0 ? (
                        <div className="kushi-template-empty">
                          <p>
                            No saved creations yet. Open a design and choose
                            Save to My Creations.
                          </p>
                        </div>
                      ) : (
                        <TemplateGrid
                          templates={filteredTemplates}
                          onSelectTemplate={handleTemplateSelect}
                          selectedTemplateId={selectedTemplate?.id}
                          profilePhotoUrl={profilePhotoUrl}
                          profileCutoutUrl={profileCutoutUrl}
                          profileFullName={profileFullName}
                          photoOverrides={templatePhotoOverrides}
                          photoAdjustments={templatePhotoAdjustments}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      <section
        className="studio-catalog-section"
        ref={stylesSectionRef}
      >
        <div className="container">
          <div className="studio-section-heading studio-catalog-heading">
            <div>
              <span className="studio-kicker">
                Step 1 · Find your look
              </span>

              <h2>
                Choose a signature style
              </h2>

              <p>
                Explore curated creative
                directions built for portraits,
                couples and celebrations.
              </p>
            </div>

            <div className="studio-ai-credit-actions">
              <span aria-live="polite">
                <Coins size={16} />
                {creditBalanceStatus === "loading"
                  ? "Loading credits…"
                  : creditAccount.isAuthenticated
                    ? `${creditAccount.availableCredits} credits`
                    : "AI credits require sign in"}
              </span>

              <span className="studio-style-count">
                {filteredStyles.length} styles
              </span>

              {creditAccount.isAuthenticated && (
                <button
                  type="button"
                  className="studio-buy-credits"
                  onClick={() => setIsCreditPurchaseOpen(true)}
                >
                  <Plus size={16} />
                  Buy Credits
                </button>
              )}
            </div>
          </div>

          <div className="studio-search-wrap">
            <Search
              size={20}
              aria-hidden="true"
            />

            <label
              htmlFor="studio-search"
              className="sr-only"
            >
              Search styles
            </label>

            <input
              id="studio-search"
              type="search"
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value,
                )
              }
              placeholder="Search styles..."
              autoComplete="off"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() =>
                  setSearchQuery("")
                }
              >
                Clear
              </button>
            )}
          </div>

          <StyleCategories
            categories={STUDIO_CATEGORIES}
            selectedCategory={
              selectedCategory
            }
            onSelect={setSelectedCategory}
          />

          {filteredStyles.length > 0 ? (
            <div className="studio-grid">
              {filteredStyles.map((style) => (
                <StyleCard
                  key={style.id}
                  style={style}
                  isSelected={
                    selectedStyle?.id ===
                    style.id
                  }
                  isFavorite={favorites.has(
                    style.id,
                  )}
                  onSelect={
                    handleStyleSelect
                  }
                  onFavorite={
                    handleFavorite
                  }
                  onShare={handleShare}
                />
              ))}
            </div>
          ) : (
            <div className="studio-empty-state">
              <span>
                <Search size={27} />
              </span>

              <h3>No matching styles</h3>

              <p>
                Try another search phrase or
                switch to a different category.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                }}
              >
                Show all styles
              </button>
            </div>
          )}
        </div>
      </section>

      {selectedStyle && (
        <section
          className="studio-compose-section"
          ref={uploadSectionRef}
        >
          <div className="container">
            <div className="studio-section-heading">
              <div>
                <span className="studio-kicker">
                  Step 2 · Add your photos
                </span>

                <h2>
                  Prepare your design
                </h2>

                <p>
                  Your original files stay
                  unchanged and every preview
                  shows the complete photo.
                </p>
              </div>
            </div>

            <SelectedStyleSummary
              style={selectedStyle}
              onChangeStyle={() =>
                stylesSectionRef.current?.scrollIntoView(
                  {
                    behavior: "smooth",
                  },
                )
              }
            />

            {selectedStyle.photosRequired ===
              2 && (
              <div className="studio-photo-guidance">
                <Sparkles size={17} />
                This style works best with 2
                photos. Add a clear main photo
                and a secondary photo.
              </div>
            )}

            <div className="studio-composer-grid">
              <div
                className={`studio-upload-grid ${
                  selectedStyle.photosRequired ===
                  1
                    ? "single"
                    : ""
                }`}
              >
                <PhotoUploader
                  label="Photo 1 — Main"
                  helperText="Use your clearest primary photo"
                  photo={photos[0]}
                  outputRatio={outputRatio}
                  onFile={(file) =>
                    handlePhoto(0, file)
                  }
                  onRemove={() =>
                    handleRemovePhoto(0)
                  }
                  error={errors.photo1}
                  onError={(message) =>
                    setErrors((current) => ({
                      ...current,
                      photo1: message,
                    }))
                  }
                />

                {selectedStyle.photosRequired ===
                  2 && (
                  <PhotoUploader
                    label="Photo 2 — Secondary"
                    helperText="Use a complementary second photo"
                    photo={photos[1]}
                    outputRatio={outputRatio}
                    onFile={(file) =>
                      handlePhoto(1, file)
                    }
                    onRemove={() =>
                      handleRemovePhoto(1)
                    }
                    error={errors.photo2}
                    onError={(message) =>
                      setErrors(
                        (current) => ({
                          ...current,
                          photo2: message,
                        }),
                      )
                    }
                  />
                )}
              </div>

              <aside className="studio-settings-card">
                <OutputRatioSelector
                  supportedRatios={
                    selectedStyle.supportedRatios
                  }
                  selectedRatio={
                    outputRatio
                  }
                  onSelect={(ratio) => {
                    if (isGenerating) {
                      return;
                    }

                    setOutputRatio(ratio);
                    setGeneratedResult(
                      null,
                    );
                    setGenerationStatus(
                      "idle",
                    );
                    setGenerationStage(
                      "preparing",
                    );

                    setErrors(
                      (current) => ({
                        ...current,
                        form: "",
                      }),
                    );
                  }}
                />

                <div className="studio-order-summary">
                  <span>
                    Generation summary
                  </span>

                  <div>
                    <small>Style</small>
                    <strong>
                      {selectedStyle.name}
                    </strong>
                  </div>

                  <div>
                    <small>Photos</small>
                    <strong>
                      {
                        selectedStyle.photosRequired
                      }
                    </strong>
                  </div>

                  <div>
                    <small>Price</small>
                    <strong>
                      {formatStudioPrice(
                        selectedStyle,
                      )}
                    </strong>
                  </div>

                  <div>
                    <small>
                      Available balance
                    </small>

                    <strong>
                      {creditAccount.isAuthenticated
                        ? `${creditAccount.availableCredits} Credits`
                        : "Sign in required"}
                    </strong>
                  </div>
                </div>

                {creditBalanceError && (
                  <div
                    className="studio-form-error"
                    role="alert"
                  >
                    <AlertCircle
                      size={18}
                    />
                    {creditBalanceError}
                  </div>
                )}

                {!creditAccount.isAuthenticated &&
                  creditBalanceStatus ===
                    "ready" && (
                    <div className="studio-credit-notice">
                      <AlertCircle
                        size={18}
                      />

                      <span>
                        <Link
                          to="/login"
                          state={{
                            from: "/studio",
                          }}
                        >
                          Sign in
                        </Link>{" "}
                        to generate with Studio
                        credits.
                      </span>
                    </div>
                  )}

                {hasInsufficientCredits && (
                  <div
                    className="studio-credit-notice insufficient"
                    role="alert"
                  >
                    <AlertCircle
                      size={18}
                    />

                    <span>
                      Insufficient credits.
                      This style needs{" "}
                      {
                        selectedStyle.credits
                      }
                      ; your balance is{" "}
                      {
                        creditAccount.availableCredits
                      }
                      .
                    </span>
                  </div>
                )}

                {errors.form && (
                  <div
                    className="studio-form-error"
                    role="alert"
                  >
                    <AlertCircle
                      size={18}
                    />
                    {errors.form}
                  </div>
                )}

                <button
                  type="button"
                  className="studio-generate-button"
                  onClick={handleGenerate}
                  disabled={
                    generationDisabled
                  }
                >
                  {isGenerating ? (
                    <>
                      <span className="studio-button-spinner" />
                      Generating your
                      design...
                    </>
                  ) : (
                    <>
                      <Sparkles size={19} />
                      {generateLabel}
                      <ArrowRight
                        size={18}
                      />
                    </>
                  )}
                </button>

                <p className="studio-secure-note">
                  AI provider and protected
                  Storage operate server-side ·
                  No private keys in your
                  browser
                </p>
              </aside>
            </div>
          </div>
        </section>
      )}

      <div ref={resultSectionRef}>
        {isGenerating && (
          <section
            className="studio-generating-section"
            aria-live="polite"
          >
            <div className="container">
              <div className="studio-generating-card">
                <span className="studio-generation-orbit">
                  <Sparkles size={28} />
                </span>

                <div>
                  <span className="studio-kicker">
                    Step 3 · Creating
                  </span>

                  <h2>
                    {
                      STUDIO_GENERATION_STAGES[
                        generationStage
                      ]?.title
                    }
                  </h2>

                  <p>
                    {
                      STUDIO_GENERATION_STAGES[
                        generationStage
                      ]?.description
                    }
                  </p>
                </div>

                <div
                  className="studio-progress-track"
                  aria-hidden="true"
                >
                  <span />
                </div>
              </div>
            </div>
          </section>
        )}

        {generatedResult &&
          selectedStyle && (
            <div className="container studio-result-container">
              <GenerationResult
                result={generatedResult}
                style={selectedStyle}
                ratio={outputRatio}
                onRegenerate={
                  handleGenerate
                }
                onStartOver={
                  handleStartOver
                }
                isGenerating={
                  isGenerating
                }
                availableCredits={
                  creditAccount.availableCredits
                }
                canRegenerate={Boolean(
                  creditAccount.isAuthenticated &&
                    !hasInsufficientCredits &&
                    creditBalanceStatus ===
                      "ready",
                )}
              />
            </div>
          )}
      </div>

      <div
        className="studio-share-feedback"
        aria-live="polite"
        aria-atomic="true"
      >
        {shareFeedback}
      </div>

      <StudioCreditPurchase
        open={isCreditPurchaseOpen}
        currentBalance={
          creditAccount.availableCredits
        }
        onClose={() =>
          setIsCreditPurchaseOpen(false)
        }
        onCreditsAdded={
          handleCreditsAdded
        }
      />
    </div>
  );
}

export default Studio;
