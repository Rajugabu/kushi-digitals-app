import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Download, ImagePlus, Sparkles, Upload } from "lucide-react";
import { Link } from "react-router-dom";

import SEO from "../../components/SEO";
import {
  generateStudioDesign,
  StudioGenerationError,
} from "../../services/studioService";
import { saveStudioCreation } from "../../services/studioCreationHistory";

const enhancementOptions = [
  "Enhance Photo",
  "Remove Blur",
  "Professional Portrait",
  "Hair Refinement",
  "Passport Photo",
  "Studio Background",
  "Natural Greenery Background",
  "Traditional Background",
  "Old Photo Restore",
  "Upscale",
];

const ratioOptions = [
  "2:3",
  "1:1",
  "4:5",
  "3:4",
  "9:16",
];

const backgroundOptions = [
  "Studio Background",
  "Natural Greenery",
  "Traditional Texture",
  "Plain White",
];

const identityGuardrails = [
  "same person",
  "same face",
  "same facial structure",
  "same eyes",
  "same nose",
  "same lips",
  "same hairstyle where appropriate",
  "same skin tone",
  "same body proportions",
  "same expression unless explicitly requested otherwise",
];

const readFileAsDataUrl = (file) =>
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

function AiPhotoStudio() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [selectedEnhancement, setSelectedEnhancement] = useState("Enhance Photo");
  const [aspectRatio, setAspectRatio] = useState("2:3");
  const [backgroundOption, setBackgroundOption] = useState("Studio Background");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [generationStatus, setGenerationStatus] = useState("idle");
  const [requiresAuthentication, setRequiresAuthentication] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const resultSummary = useMemo(
    () => `${selectedEnhancement} · ${aspectRatio} · ${backgroundOption}`,
    [aspectRatio, backgroundOption, selectedEnhancement],
  );

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!/image\/(jpg|jpeg|png|webp)/i.test(file.type)) {
      setErrorMessage("Please upload a JPG, JPEG, PNG or WEBP image.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setSelectedFile(file);
      setImagePreview(dataUrl);
      setIsGenerated(false);
      setGeneratedResult(null);
      setGenerationStatus("idle");
      setErrorMessage("");
      setRequiresAuthentication(false);
    } catch {
      setErrorMessage("The uploaded image could not be processed. Please try another file.");
    }
  };

  const handleGenerate = async () => {
    if (!imagePreview) {
      setErrorMessage("Upload a source photo before generating the enhancement.");
      return;
    }

    setErrorMessage("");
    setIsGenerating(true);
    setGenerationStatus("uploading");

    try {
      const result = await generateStudioDesign(
        {
          styleId: "ai-photo-studio",
          ratio: aspectRatio,
          photo1: selectedFile,
          context: {
            operation: selectedEnhancement,
            background: backgroundOption,
            requestedRatio: aspectRatio,
          },
        },
        { onStatus: setGenerationStatus },
      );
      setGeneratedResult(result);
      saveStudioCreation({
        result,
        type: "AI Photo",
        title: selectedEnhancement,
        category: "AI Photo Studio",
      });
      setIsGenerated(true);
    } catch (error) {
      console.error("AI Photo Studio generation failed:", error);
      setErrorMessage(
        error instanceof StudioGenerationError
          ? error.message
          : "The photo could not be generated. Please try again.",
      );
      setRequiresAuthentication(error?.code === "AUTHENTICATION_REQUIRED");
      setGenerationStatus("failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const resetWorkflow = () => {
    setImagePreview("");
    setSelectedFile(null);
    setIsGenerated(false);
    setErrorMessage("");
    setSelectedEnhancement("Enhance Photo");
    setAspectRatio("2:3");
    setBackgroundOption("Studio Background");
  };

  return (
    <main className="studio-workflow-page">
      <SEO
        title="KUSHI AI STUDIO – AI Photo Studio"
        description="Enhance portraits, remove blur, restore old photos and generate clean AI-powered photo edits while preserving identity."
        canonical="https://kushidigitals.com/ai-photo-studio"
      />

      <section className="workflow-hero">
        <div className="container workflow-hero-inner">
          <div>
            <span className="ai-eyebrow"><Sparkles size={15} /> AI PHOTO STUDIO</span>
            <h1>Enhance your photos without losing who you are.</h1>
            <p>
              Upload a clear image, choose an enhancement, and create a polished result while keeping the
              same face, body proportions, expression and identity in place.
            </p>
          </div>
        </div>
      </section>

      <section className="container workflow-layout">
        <div className="workflow-card">
          <div className="workflow-stepper">
            <span className="workflow-step active">1</span>
            <span className="workflow-step">2</span>
            <span className="workflow-step">3</span>
            <span className="workflow-step">4</span>
          </div>

          <div className="workflow-panel">
            <div className="workflow-panel-header">
              <Upload size={18} />
              <h2>1. Upload Photo</h2>
            </div>

            <label className="upload-box" htmlFor="ai-photo-upload">
              <ImagePlus size={28} />
              <span>Upload a photo</span>
              <small>JPG • JPEG • PNG • WEBP</small>
              <input
                id="ai-photo-upload"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
              />
            </label>

            {imagePreview ? (
              <div className="image-preview-block">
                <img src={imagePreview} alt="Uploaded AI enhancement source" />
              </div>
            ) : null}
          </div>

          <div className="workflow-panel">
            <div className="workflow-panel-header">
              <Sparkles size={18} />
              <h2>2. Choose Enhancement Type</h2>
            </div>

            <div className="option-grid">
              {enhancementOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={option === selectedEnhancement ? "option-card selected" : "option-card"}
                  onClick={() => setSelectedEnhancement(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="workflow-panel">
            <div className="workflow-panel-header">
              <CheckCircle2 size={18} />
              <h2>3. Optional Settings</h2>
            </div>

            <div className="settings-grid">
              <div className="field-block">
                <label htmlFor="ai-photo-ratio">Aspect ratio</label>
                <select id="ai-photo-ratio" value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>
                  {ratioOptions.map((ratio) => (
                    <option key={ratio} value={ratio}>
                      {ratio}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field-block">
                <label htmlFor="ai-photo-background">Background option</label>
                <select
                  id="ai-photo-background"
                  value={backgroundOption}
                  onChange={(event) => setBackgroundOption(event.target.value)}
                >
                  {backgroundOptions.map((background) => (
                    <option key={background} value={background}>
                      {background}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="workflow-actions">
            <button type="button" className="primary-button" onClick={handleGenerate} disabled={isGenerating || !imagePreview}>
              {isGenerating ? "Generating Photo..." : "Generate Photo"}
            </button>
            <button type="button" className="secondary-button" onClick={resetWorkflow}>
              Create Another
            </button>
          </div>

          {errorMessage ? (
            <p className="workflow-error">
              {errorMessage}
              {requiresAuthentication ? <Link to="/login"> Sign in to continue.</Link> : null}
            </p>
          ) : null}
        </div>

        <aside className="workflow-preview-panel">
          <div className="preview-header-row">
            <h3>Result</h3>
            <span>{selectedEnhancement}</span>
          </div>

          {!imagePreview ? (
            <div className="empty-preview-state">
              <Upload size={28} />
              <p>Upload a photo to preview your enhancement workflow.</p>
            </div>
          ) : (
            <>
              <div className="result-stack">
                <div className="before-after-card">
                  <label>Original</label>
                  <img src={imagePreview} alt="Original uploaded portrait" />
                </div>

                <div className="before-after-card generated-card">
                  <label>Generated</label>
                  <img
                  src={generatedResult?.resultUrl || imagePreview}
                    alt="AI generated portrait"
                    style={{
                      filter: "contrast(1.08) saturate(1.08) brightness(1.04)",
                    }}
                  />
                  <div className="generated-overlay" aria-hidden="true" />
                </div>
              </div>

              {isGenerated && generatedResult ? (
                <div className="generated-meta">
                  <strong>{resultSummary}</strong>
                  <p>
                    {generationStatus === "uploading"
                      ? "Uploading your photo..."
                      : generationStatus === "generating"
                        ? "Creating your photo..."
                        : "AI-assisted enhancement ready for download."}
                  </p>

                  <div className="result-actions">
                    <a href={generatedResult.downloadUrl} download="kushi-ai-photo.png" className="secondary-button">
                      <Download size={17} />
                      Download
                    </a>
                    <button type="button" className="ghost-button" onClick={handleGenerate}>
                      Generate Again
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}

          <div className="identity-box">
            <h4>Identity-preserving guardrails</h4>
            <ul>
              {identityGuardrails.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <Link to="/studio" className="inline-link">
            Open full Design Studio <ArrowRight size={16} />
          </Link>
        </aside>
      </section>
    </main>
  );
}

export default AiPhotoStudio;
