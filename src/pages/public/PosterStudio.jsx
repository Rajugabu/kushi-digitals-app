import { useMemo, useState } from "react";
import { ArrowRight, Check, ImagePlus, Sparkles, Upload } from "lucide-react";
import { Link } from "react-router-dom";

import SEO from "../../components/SEO";
import {
  generateStudioDesign,
  StudioGenerationError,
} from "../../services/studioService";
import { saveStudioCreation } from "../../services/studioCreationHistory";
import { sampleTemplates } from "../../components/studio/templates/templateData";

const posterCategories = [
  "Birthday",
  "Anniversary",
  "Wedding",
  "Engagement",
  "Baby",
  "Festival",
  "Devotional",
  "Good Morning",
  "Good Night",
  "Motivation",
  "Love",
  "Special Days",
];

const initialForm = {
  name: "Aarav",
  date: "12 February 2026",
  shortMessage: "Happy Birthday! May your year be filled with joy, love and creativity.",
  subtitle: "Celebrate beautifully",
};

function PosterStudio() {
  const [selectedCategory, setSelectedCategory] = useState("Birthday");
  const [selectedTemplateId, setSelectedTemplateId] = useState("birthday-luxury");
  const [imagePreview, setImagePreview] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [formData, setFormData] = useState(initialForm);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [, setGenerationStatus] = useState("idle");
  const [requiresAuthentication, setRequiresAuthentication] = useState(false);

  const filteredTemplates = useMemo(
    () => sampleTemplates.filter((template) => template.category === selectedCategory),
    [selectedCategory],
  );

  const selectedTemplate =
    filteredTemplates.find((template) => template.id === selectedTemplateId) || filteredTemplates[0] || sampleTemplates[0];

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        setImagePreview(reader.result);
        setSelectedFile(file);
        setErrorMessage("");
        setRequiresAuthentication(false);
      }
    });

    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!imagePreview) {
      setErrorMessage("Upload a photo before generating your poster.");
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    setGenerationStatus("uploading");

    try {
      const result = await generateStudioDesign(
        {
          styleId: "poster-studio",
          ratio: "4:5",
          photo1: selectedFile,
          context: {
            category: selectedCategory,
            template: selectedTemplate?.title || "Premium occasion template",
            templateStyle: selectedTemplate?.description || "",
            name: formData.name,
            date: formData.date,
            message: formData.shortMessage,
            subtitle: formData.subtitle,
          },
        },
        { onStatus: setGenerationStatus },
      );
      setGeneratedResult(result);
      saveStudioCreation({
        result,
        type: "Poster",
        title: `${selectedCategory} Poster`,
        category: "Poster Studio",
      });
      setIsGenerated(true);
    } catch (error) {
      console.error("Poster Studio generation failed:", error);
      setErrorMessage(
        error instanceof StudioGenerationError
          ? error.message
          : "The poster could not be generated. Please try again.",
      );
      setRequiresAuthentication(error?.code === "AUTHENTICATION_REQUIRED");
      setGenerationStatus("failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  return (
    <main className="studio-workflow-page">
      <SEO
        title="KUSHI AI STUDIO – Poster Studio"
        description="Create personalized birthday, festival, devotional and occasion posters in minutes using AI-powered templates."
        canonical="https://kushidigitals.com/poster-studio"
      />

      <section className="workflow-hero compact-hero">
        <div className="container workflow-hero-inner">
          <div>
            <span className="ai-eyebrow"><Sparkles size={15} /> PERSONALIZED POSTER STUDIO</span>
            <h1>Turn moments into beautiful posters.</h1>
            <p>Choose a category, pick a template, add your details and generate a ready-to-share poster.</p>
          </div>
        </div>
      </section>

      <section className="container workflow-layout wide-layout">
        <div className="workflow-card">
          <div className="workflow-stepper">
            <span className="workflow-step active">1</span>
            <span className="workflow-step">2</span>
            <span className="workflow-step">3</span>
            <span className="workflow-step">4</span>
          </div>

          <div className="workflow-panel">
            <div className="workflow-panel-header">
              <Sparkles size={18} />
              <h2>1. Choose Poster Category</h2>
            </div>

            <div className="option-grid compact-grid">
              {posterCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={category === selectedCategory ? "option-card selected" : "option-card"}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="workflow-panel">
            <div className="workflow-panel-header">
              <Check size={18} />
              <h2>2. Choose Template</h2>
            </div>

            <div className="template-row">
              {filteredTemplates.slice(0, 4).map((template) => (
                <button
                  key={template.id}
                  type="button"
                  className={template.id === selectedTemplate.id ? "template-card selected" : "template-card"}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <img src={template.thumbnail || template.previewImage} alt={template.title} />
                  <span>{template.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="workflow-panel">
            <div className="workflow-panel-header">
              <Upload size={18} />
              <h2>3. Upload Photo</h2>
            </div>

            <label className="upload-box small-upload" htmlFor="poster-upload">
              <ImagePlus size={24} />
              <span>Choose your photo</span>
              <input id="poster-upload" type="file" accept="image/*" onChange={handleFileChange} />
            </label>

            {imagePreview ? (
              <div className="image-preview-block compact-image-preview">
                <img src={imagePreview} alt="Poster source preview" />
              </div>
            ) : null}
          </div>

          <div className="workflow-panel">
            <div className="workflow-panel-header">
              <Sparkles size={18} />
              <h2>4. Personalized Details</h2>
            </div>

            <div className="field-grid">
              <div className="field-block">
                <label htmlFor="poster-name">Name</label>
                <input
                  id="poster-name"
                  value={formData.name}
                  onChange={(event) => handleFieldChange("name", event.target.value)}
                />
              </div>

              <div className="field-block">
                <label htmlFor="poster-date">Date</label>
                <input
                  id="poster-date"
                  value={formData.date}
                  onChange={(event) => handleFieldChange("date", event.target.value)}
                />
              </div>

              <div className="field-block full-width">
                <label htmlFor="poster-message">Short message</label>
                <textarea
                  id="poster-message"
                  rows="3"
                  value={formData.shortMessage}
                  onChange={(event) => handleFieldChange("shortMessage", event.target.value)}
                />
              </div>

              <div className="field-block full-width">
                <label htmlFor="poster-subtitle">Optional subtitle</label>
                <input
                  id="poster-subtitle"
                  value={formData.subtitle}
                  onChange={(event) => handleFieldChange("subtitle", event.target.value)}
                />
              </div>
            </div>
          </div>

          {errorMessage ? (
            <p className="workflow-error">
              {errorMessage}
              {requiresAuthentication ? <Link to="/login"> Sign in to continue.</Link> : null}
            </p>
          ) : null}

          <div className="workflow-actions">
            <button type="button" className="primary-button" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? "Generating Poster..." : "Generate Poster"}
            </button>
            <button type="button" className="secondary-button" onClick={() => setIsGenerated(false)}>
              Reset Preview
            </button>
          </div>
        </div>

        <aside className="workflow-preview-panel">
          <div className="preview-header-row">
            <h3>Poster Preview</h3>
            <span>{selectedCategory}</span>
          </div>

          <div className="poster-preview-card" style={{ background: selectedTemplate?.background?.value || "linear-gradient(135deg, #1b102c 0%, #0d1220 100%)" }}>
            {imagePreview ? (
              <img className="poster-photo" src={imagePreview} alt="Poster preview source" />
            ) : (
              <div className="poster-photo placeholder-photo">
                <Upload size={26} />
              </div>
            )}

            <div className="poster-text-content">
              <span className="poster-kicker">{selectedTemplate?.category || selectedCategory}</span>
              <h4>{formData.name || "Your Name"}</h4>
              <p>{formData.shortMessage || "Your message here"}</p>
              <small>{formData.subtitle || formData.date || "A special moment"}</small>
            </div>
          </div>

          {isGenerated && generatedResult ? (
            <div className="generated-meta">
              <strong>Poster ready to export.</strong>
              <p>Personalized {selectedCategory.toLowerCase()} design generated successfully.</p>
              <div className="result-actions">
                <a href={generatedResult.downloadUrl} download="kushi-poster.png" className="secondary-button">
                  Download
                </a>
                <button type="button" className="ghost-button" onClick={handleGenerate}>
                  Generate Again
                </button>
              </div>
            </div>
          ) : null}

          <Link to="/studio" className="inline-link">
            Explore full template studio <ArrowRight size={16} />
          </Link>
        </aside>
      </section>
    </main>
  );
}

export default PosterStudio;
