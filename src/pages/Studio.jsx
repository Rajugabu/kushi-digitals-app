import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Coins,
  Plus,
  Search,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import GenerationResult from "../components/studio/GenerationResult";
import OutputRatioSelector from "../components/studio/OutputRatioSelector";
import PhotoUploader from "../components/studio/PhotoUploader";
import SelectedStyleSummary from "../components/studio/SelectedStyleSummary";
import StudioCreditPurchase from "../components/studio/StudioCreditPurchase";
import StudioStepper from "../components/studio/StudioStepper";
import StyleCard from "../components/studio/StyleCard";
import StyleCategories from "../components/studio/StyleCategories";
import TemplateGrid from "../components/studio/templates/TemplateGrid";
import { sampleTemplates } from "../components/studio/templates/templateData";
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
  getPendingStudioGeneration,
  hasPendingStudioGeneration,
  recoverPendingStudioGeneration,
  STUDIO_GENERATION_STAGES,
} from "../services/studioService";
import { supabase } from "../services/supabase";

const emptyErrors = { photo1: "", photo2: "", form: "" };

function Studio() {
  const [searchParams] = useSearchParams();
  const initialStyle = getStudioStyleById(searchParams.get("style"));
  const stylesSectionRef = useRef(null);
  const uploadSectionRef = useRef(null);
  const resultSectionRef = useRef(null);
  const objectUrlsRef = useRef(new Set());
  const recoveryAttemptedRef = useRef(false);

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
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
  const [creditBalanceStatus, setCreditBalanceStatus] = useState("loading");
  const [creditBalanceError, setCreditBalanceError] = useState("");
  const [isCreditPurchaseOpen, setIsCreditPurchaseOpen] = useState(false);

  const isGenerating = ["generating", "recovering"].includes(
    generationStatus,
  );
  const hasUnconfirmedGeneration = generationStatus === "uncertain";
  const isGenerationLocked = isGenerating || hasUnconfirmedGeneration;

  const hasInsufficientCredits = Boolean(
    selectedStyle &&
      creditAccount.isAuthenticated &&
      creditAccount.availableCredits < selectedStyle.credits,
  );

  const generationDisabled =
    isGenerationLocked ||
    creditBalanceStatus !== "ready" ||
    !creditAccount.isAuthenticated ||
    hasInsufficientCredits;

  const currentStep =
    generatedResult || isGenerationLocked ? 3 : selectedStyle ? 2 : 1;

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
        error.message || "Your Studio credit balance could not be loaded.",
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

  const filteredStyles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return studioStyles.filter((style) => {
      if (!style.isActive) {
        return false;
      }

      const matchesCategory =
        selectedCategory === "All" || style.category === selectedCategory;

      const searchableText = [style.name, style.category, ...style.tags]
        .join(" ")
        .toLowerCase();

      return matchesCategory && (!query || searchableText.includes(query));
    });
  }, [searchQuery, selectedCategory]);

  const applyGenerationResult = useCallback((result) => {
    const resultStyle = getStudioStyleById(result.styleId);

    if (resultStyle) {
      setSelectedStyle(resultStyle);
    }

    if (result.ratio) {
      setOutputRatio(result.ratio);
    }

    setGeneratedResult(result);
    setGenerationStatus("complete");
    setErrors(emptyErrors);
    setCreditAccount((current) => ({
      ...current,
      availableCredits: result.availableCredits,
    }));
  }, []);

  const handleRecoverGeneration = useCallback(async () => {
    const pendingGeneration = getPendingStudioGeneration();

    if (!pendingGeneration) {
      return;
    }

    const pendingStyle = getStudioStyleById(pendingGeneration.styleId);

    if (pendingStyle) {
      setSelectedStyle(pendingStyle);
    }

    if (pendingGeneration.ratio) {
      setOutputRatio(pendingGeneration.ratio);
    }

    setGenerationStatus("recovering");
    setGenerationStage("recovering");
    setErrors(emptyErrors);

    try {
      const result = await recoverPendingStudioGeneration({
        onStatus: setGenerationStage,
      });

      applyGenerationResult(result);
    } catch (error) {
      const remainsUnconfirmed = [
        "GENERATION_STILL_PROCESSING",
        "GENERATION_STATUS_UNCONFIRMED",
        "GENERATION_RECOVERY_FAILED",
        "MISSING_GENERATION_OUTPUT",
        "STUDIO_CREDIT_REFUND_PENDING",
      ].includes(error.code);

      setGenerationStatus(remainsUnconfirmed ? "uncertain" : "error");
      setErrors((current) => ({
        ...current,
        form:
          error.message ||
          "The generation status could not be checked. Please try again.",
      }));
    } finally {
      loadCreditBalance();
    }
  }, [applyGenerationResult, loadCreditBalance]);

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  useEffect(() => {
    const loadTimer = window.setTimeout(loadCreditBalance, 0);

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
    if (
      recoveryAttemptedRef.current ||
      creditBalanceStatus !== "ready" ||
      !creditAccount.isAuthenticated ||
      !hasPendingStudioGeneration()
    ) {
      return undefined;
    }

    recoveryAttemptedRef.current = true;
    const timer = window.setTimeout(handleRecoverGeneration, 0);

    return () => window.clearTimeout(timer);
  }, [
    creditAccount.isAuthenticated,
    creditBalanceStatus,
    handleRecoverGeneration,
  ]);

  useEffect(() => {
    if (!shareFeedback) {
      return undefined;
    }

    const timer = window.setTimeout(() => setShareFeedback(""), 2600);

    return () => window.clearTimeout(timer);
  }, [shareFeedback]);

  const releasePhoto = (photo) => {
    if (!photo?.previewUrl) {
      return;
    }

    URL.revokeObjectURL(photo.previewUrl);
    objectUrlsRef.current.delete(photo.previewUrl);
  };

  const handleStyleSelect = (style) => {
    if (isGenerationLocked) {
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

      setPhotos((current) => [current[0], null]);
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
    if (isGenerationLocked) {
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
    if (isGenerationLocked) {
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
    const shareUrl = new URL("/studio", window.location.origin);

    shareUrl.searchParams.set("style", style.id);

    const shareData = {
      title: `${style.name} · Kushi Digitals Studio`,
      text: `Explore the ${style.name} style in Kushi Digitals Design Studio.`,
      url: shareUrl.toString(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);

        setShareFeedback("Style shared successfully.");
      } else {
        await navigator.clipboard.writeText(shareData.url);

        setShareFeedback("Style link copied to clipboard.");
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setShareFeedback("Unable to share this style right now.");
      }
    }
  };

  const validateRequest = () => {
    const nextErrors = { ...emptyErrors };

    if (!selectedStyle) {
      nextErrors.form = "Choose a style before generating your design.";
    }

    if (!photos[0]) {
      nextErrors.photo1 = "Add your main photo to continue.";
    }

    if (selectedStyle?.photosRequired === 2 && !photos[1]) {
      nextErrors.photo2 = "This style needs a secondary photo.";
    }

    if (!outputRatio) {
      nextErrors.form = "Choose an output ratio to continue.";
    }

    setErrors(nextErrors);

    return !Object.values(nextErrors).some(Boolean);
  };

  const handleGenerate = async () => {
    if (isGenerationLocked) {
      return;
    }

    if (!creditAccount.isAuthenticated) {
      setErrors((current) => ({
        ...current,
        form: "Sign in before generating a Studio design.",
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

      applyGenerationResult(result);
    } catch (error) {
      const remainsUnconfirmed = [
        "GENERATION_STILL_PROCESSING",
        "GENERATION_STATUS_UNCONFIRMED",
        "GENERATION_RECOVERY_FAILED",
        "MISSING_GENERATION_OUTPUT",
        "STUDIO_CREDIT_REFUND_PENDING",
      ].includes(error.code);

      setGenerationStatus(remainsUnconfirmed ? "uncertain" : "error");

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
    : `Generate · ${formatStudioPrice(selectedStyle)}`;

  return (
    <div className="studio-page">
      <SEO
        title="AI Photo Design Studio | Kushi Digitals"
        description="Choose a creative style, upload your photos and prepare a premium AI-assisted design with Kushi Digitals."
      />

      <section className="studio-hero">
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
            Upload your photo, choose a style, and create beautiful artwork.
          </p>

          <div className="studio-credit-actions">
            <div className="studio-credit-balance" aria-live="polite">
              <Coins size={18} />

              {creditBalanceStatus === "loading" ? (
                <span>Loading Studio credits…</span>
              ) : creditAccount.isAuthenticated ? (
                <span>
                  Studio balance{" "}
                  <strong>{creditAccount.availableCredits} Credits</strong>
                </span>
              ) : (
                <span>
                  <Link to="/login" state={{ from: "/studio" }}>
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
                onClick={() => setIsCreditPurchaseOpen(true)}
              >
                <Plus size={17} />
                Buy Credits
              </button>
            )}
          </div>

          <StudioStepper
            currentStep={currentStep}
            resultReady={Boolean(generatedResult)}
          />
        </div>
      </section>

      <section className="studio-template-showcase">
        <div className="container">
          <div className="studio-section-heading">
            <div>
              <span className="studio-kicker">
                Personalized in seconds
              </span>

              <h2>Premium templates for every moment</h2>

              <p>
                Add your photo, name and personal details to create a beautiful
                status or poster instantly.
              </p>
            </div>
          </div>

          <TemplateGrid templates={sampleTemplates} />
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

              <h2>Choose a signature style</h2>

              <p>
                Explore curated creative directions built for portraits,
                couples and celebrations.
              </p>
            </div>

            <span className="studio-style-count">
              {filteredStyles.length} styles
            </span>
          </div>

          <div className="studio-search-wrap">
            <Search size={20} aria-hidden="true" />

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
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search styles..."
              autoComplete="off"
            />

            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
              >
                Clear
              </button>
            )}
          </div>

          <StyleCategories
            categories={STUDIO_CATEGORIES}
            selectedCategory={selectedCategory}
            onSelect={setSelectedCategory}
          />

          {filteredStyles.length > 0 ? (
            <div className="studio-grid">
              {filteredStyles.map((style) => (
                <StyleCard
                  key={style.id}
                  style={style}
                  isSelected={selectedStyle?.id === style.id}
                  isFavorite={favorites.has(style.id)}
                  onSelect={handleStyleSelect}
                  onFavorite={handleFavorite}
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
                Try another search phrase or switch to a different category.
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

                <h2>Prepare your design</h2>

                <p>
                  Your original files stay unchanged and every preview shows
                  the complete photo.
                </p>
              </div>
            </div>

            <SelectedStyleSummary
              style={selectedStyle}
              onChangeStyle={() =>
                stylesSectionRef.current?.scrollIntoView({
                  behavior: "smooth",
                })
              }
            />

            {selectedStyle.photosRequired === 2 && (
              <div className="studio-photo-guidance">
                <Sparkles size={17} />

                This style works best with 2 photos. Add a clear main photo and
                a secondary photo.
              </div>
            )}

            <div className="studio-composer-grid">
              <div
                className={`studio-upload-grid ${
                  selectedStyle.photosRequired === 1 ? "single" : ""
                }`}
              >
                <PhotoUploader
                  label="Photo 1 — Main"
                  helperText="Use your clearest primary photo"
                  photo={photos[0]}
                  outputRatio={outputRatio}
                  onFile={(file) => handlePhoto(0, file)}
                  onRemove={() => handleRemovePhoto(0)}
                  error={errors.photo1}
                  onError={(message) =>
                    setErrors((current) => ({
                      ...current,
                      photo1: message,
                    }))
                  }
                />

                {selectedStyle.photosRequired === 2 && (
                  <PhotoUploader
                    label="Photo 2 — Secondary"
                    helperText="Use a complementary second photo"
                    photo={photos[1]}
                    outputRatio={outputRatio}
                    onFile={(file) => handlePhoto(1, file)}
                    onRemove={() => handleRemovePhoto(1)}
                    error={errors.photo2}
                    onError={(message) =>
                      setErrors((current) => ({
                        ...current,
                        photo2: message,
                      }))
                    }
                  />
                )}
              </div>

              <aside className="studio-settings-card">
                <OutputRatioSelector
                  supportedRatios={selectedStyle.supportedRatios}
                  selectedRatio={outputRatio}
                  onSelect={(ratio) => {
                    if (isGenerationLocked) {
                      return;
                    }

                    setOutputRatio(ratio);
                    setGeneratedResult(null);
                    setGenerationStatus("idle");
                    setGenerationStage("preparing");

                    setErrors((current) => ({
                      ...current,
                      form: "",
                    }));
                  }}
                />

                <div className="studio-order-summary">
                  <span>Generation summary</span>

                  <div>
                    <small>Style</small>
                    <strong>{selectedStyle.name}</strong>
                  </div>

                  <div>
                    <small>Photos</small>
                    <strong>{selectedStyle.photosRequired}</strong>
                  </div>

                  <div>
                    <small>Price</small>
                    <strong>{formatStudioPrice(selectedStyle)}</strong>
                  </div>

                  <div>
                    <small>Available balance</small>

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
                    <AlertCircle size={18} />
                    {creditBalanceError}
                  </div>
                )}

                {!creditAccount.isAuthenticated &&
                  creditBalanceStatus === "ready" && (
                    <div className="studio-credit-notice">
                      <AlertCircle size={18} />

                      <span>
                        <Link
                          to="/login"
                          state={{ from: "/studio" }}
                        >
                          Sign in
                        </Link>{" "}
                        to generate with Studio credits.
                      </span>
                    </div>
                  )}

                {hasInsufficientCredits && (
                  <div
                    className="studio-credit-notice insufficient"
                    role="alert"
                  >
                    <AlertCircle size={18} />

                    <span>
                      Insufficient credits. This style needs{" "}
                      {selectedStyle.credits}; your balance is{" "}
                      {creditAccount.availableCredits}.
                    </span>
                  </div>
                )}

                {errors.form && (
                  <div
                    className="studio-form-error"
                    role="alert"
                  >
                    <AlertCircle size={18} />
                    <span>
                      {errors.form}
                      {hasUnconfirmedGeneration && (
                        <button
                          type="button"
                          className="studio-recovery-button"
                          onClick={handleRecoverGeneration}
                        >
                          Check generation status
                        </button>
                      )}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  className="studio-generate-button"
                  onClick={handleGenerate}
                  disabled={generationDisabled}
                >
                  {isGenerating ? (
                    <>
                      <span className="studio-button-spinner" />
                      {generationStatus === "recovering"
                        ? "Checking generation status..."
                        : "Generating your design..."}
                    </>
                  ) : (
                    <>
                      <Sparkles size={19} />
                      {generateLabel}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>

                <p className="studio-secure-note">
                  AI provider and protected Storage operate server-side · No
                  private keys in your browser
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
                    {STUDIO_GENERATION_STAGES[generationStage]?.title}
                  </h2>

                  <p>
                    {STUDIO_GENERATION_STAGES[generationStage]?.description}
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

        {generatedResult && selectedStyle && (
          <div className="container studio-result-container">
            <GenerationResult
              result={generatedResult}
              style={selectedStyle}
              ratio={outputRatio}
              onRegenerate={handleGenerate}
              onStartOver={handleStartOver}
              isGenerating={isGenerating}
              availableCredits={creditAccount.availableCredits}
              canRegenerate={Boolean(
                creditAccount.isAuthenticated &&
                  !hasInsufficientCredits &&
                  creditBalanceStatus === "ready",
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
        currentBalance={creditAccount.availableCredits}
        onClose={() => setIsCreditPurchaseOpen(false)}
        onCreditsAdded={handleCreditsAdded}
      />
    </div>
  );
}

export default Studio;
