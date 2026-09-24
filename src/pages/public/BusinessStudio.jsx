import { useState } from "react";
import { ArrowRight, BriefcaseBusiness, Sparkles, Upload } from "lucide-react";
import { Link } from "react-router-dom";

import SEO from "../../components/SEO";
import {
  generateStudioDesign,
  StudioGenerationError,
} from "../../services/studioService";
import { saveStudioCreation } from "../../services/studioCreationHistory";

const businessGoals = [
  "Business Offers",
  "Festival Promotions",
  "Product Ads",
  "Shop Opening Posters",
  "Restaurant Offers",
  "Photography Promotions",
  "Beauty Salon Promotions",
  "Real Estate Ads",
  "Tuition / Education Posters",
  "Social Media Promotions",
];

const getBusinessGenerationAssets = ({
  productFile,
  businessPhotoFile,
  ownerFile,
  logoFile,
}) => {
  const visualAssets = [
    { file: productFile, label: "product photo", role: "main product visual" },
    { file: businessPhotoFile, label: "business photo", role: "main business visual" },
    { file: ownerFile, label: "owner photo", role: "main business owner visual" },
  ].filter((asset) => asset.file);
  const primaryAsset = visualAssets[0] || null;
  const secondaryAsset = logoFile
    ? { file: logoFile, label: "logo", role: "business logo / secondary brand asset" }
    : visualAssets[1] || null;
  const usedFiles = new Set(
    [primaryAsset?.file, secondaryAsset?.file].filter(Boolean),
  );

  return {
    primaryAsset,
    secondaryAsset,
    unusedAssets: visualAssets.filter((asset) => !usedFiles.has(asset.file)),
  };
};

function BusinessStudio() {
  const [selectedGoal, setSelectedGoal] = useState("Business Offers");
  const [brandName, setBrandName] = useState("Kushi Digital Studio");
  const [headline, setHeadline] = useState("Seasonal Sale Starts Today");
  const [ctaText, setCtaText] = useState("Call Now");
  const [description, setDescription] = useState("Premium quality products and trusted local service.");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [style, setStyle] = useState("Premium");
  const [ratio, setRatio] = useState("4:5");
  const [logoFile, setLogoFile] = useState(null);
  const [productFile, setProductFile] = useState(null);
  const [ownerFile, setOwnerFile] = useState(null);
  const [businessPhotoFile, setBusinessPhotoFile] = useState(null);
  const [isGenerated, setIsGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [, setGenerationStatus] = useState("idle");
  const [requiresAuthentication, setRequiresAuthentication] = useState(false);

  const generationAssets = getBusinessGenerationAssets({
    productFile,
    businessPhotoFile,
    ownerFile,
    logoFile,
  });

  const handleGenerate = async () => {
    const { primaryAsset, secondaryAsset, unusedAssets } = generationAssets;

    if (!brandName.trim() || !headline.trim() || !phone.trim() || !primaryAsset) {
      setErrorMessage("Enter your business name, offer and phone number, then upload a product, business or owner photo. A logo is optional branding and cannot be the main subject.");
      return;
    }

    if (unusedAssets.length > 0) {
      setErrorMessage(`This generation can use two assets. ${primaryAsset.label} is selected as the primary image${secondaryAsset ? ` and ${secondaryAsset.label} as the secondary image` : ""}. Remove the extra ${unusedAssets.map((asset) => asset.label).join(" and ")} before continuing.`);
      return;
    }

    setIsGenerating(true);
    setErrorMessage("");
    setRequiresAuthentication(false);
    setGenerationStatus("uploading");

    try {
      const result = await generateStudioDesign(
        {
          styleId: "business-studio",
          ratio,
          photo1: primaryAsset.file,
          photo2: secondaryAsset?.file || null,
          context: {
            businessCategory: selectedGoal,
            businessName: brandName,
            offer: headline,
            description,
            phone,
            location,
            website,
            style,
            image1Role: primaryAsset.role,
            ...(secondaryAsset ? { image2Role: secondaryAsset.role } : {}),
          },
        },
        { onStatus: setGenerationStatus },
      );
      setGeneratedResult(result);
      saveStudioCreation({
        result,
        type: "Business Design",
        title: brandName,
        category: "Business Studio",
      });
      setIsGenerated(true);
    } catch (error) {
      console.error("Business Studio generation failed:", error);
      setErrorMessage(
        error instanceof StudioGenerationError
          ? error.message
          : "The business design could not be generated. Please try again.",
      );
      setRequiresAuthentication(error?.code === "AUTHENTICATION_REQUIRED");
      setGenerationStatus("failed");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="studio-workflow-page">
      <SEO
        title="KUSHI AI STUDIO – AI Business Studio"
        description="Create social media promotions, offers and business posters for brands, shops and services using AI-powered design workflows."
        canonical="https://kushidigitals.com/business-studio"
      />

      <section className="workflow-hero compact-hero">
        <div className="container workflow-hero-inner">
          <div>
            <span className="ai-eyebrow"><Sparkles size={15} /> AI BUSINESS STUDIO</span>
            <h1>Promote your business with ready-to-share creatives.</h1>
            <p>Create offers, social ads and local promotions that look premium and launch in minutes.</p>
          </div>
        </div>
      </section>

      <section className="container workflow-layout wide-layout">
        <div className="workflow-card">
          <div className="workflow-stepper">
            <span className="workflow-step active">1</span>
            <span className="workflow-step">2</span>
            <span className="workflow-step">3</span>
          </div>

          <div className="workflow-panel">
            <div className="workflow-panel-header">
              <BriefcaseBusiness size={18} />
              <h2>1. Choose Business Goal</h2>
            </div>

            <div className="option-grid compact-grid">
              {businessGoals.map((goal) => (
                <button
                  key={goal}
                  type="button"
                  className={goal === selectedGoal ? "option-card selected" : "option-card"}
                  onClick={() => setSelectedGoal(goal)}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>

          <div className="workflow-panel">
            <div className="workflow-panel-header">
              <Sparkles size={18} />
              <h2>2. Business Details</h2>
            </div>

            <div className="field-grid">
              <div className="field-block">
                <label htmlFor="business-name">Brand / Business name</label>
                <input id="business-name" value={brandName} onChange={(event) => setBrandName(event.target.value)} />
              </div>

              <div className="field-block">
                <label htmlFor="business-headline">Headline</label>
                <input id="business-headline" value={headline} onChange={(event) => setHeadline(event.target.value)} />
              </div>

              <div className="field-block full-width">
                <label htmlFor="business-cta">Call to action</label>
                <input id="business-cta" value={ctaText} onChange={(event) => setCtaText(event.target.value)} />
              </div>
              <div className="field-block full-width">
                <label htmlFor="business-description">Short description</label>
                <textarea id="business-description" rows="2" value={description} onChange={(event) => setDescription(event.target.value)} />
              </div>
              <div className="field-block">
                <label htmlFor="business-phone">Phone number</label>
                <input id="business-phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
              </div>
              <div className="field-block">
                <label htmlFor="business-location">Location</label>
                <input id="business-location" value={location} onChange={(event) => setLocation(event.target.value)} />
              </div>
              <div className="field-block">
                <label htmlFor="business-website">Website / social handle</label>
                <input id="business-website" value={website} onChange={(event) => setWebsite(event.target.value)} />
              </div>
              <div className="field-block">
                <label htmlFor="business-style">Style</label>
                <select id="business-style" value={style} onChange={(event) => setStyle(event.target.value)}>
                  {["Premium", "Minimal", "Luxury", "Modern", "Festival", "Bold Offer", "Elegant"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div className="field-block">
                <label htmlFor="business-ratio">Output ratio</label>
                <select id="business-ratio" value={ratio} onChange={(event) => setRatio(event.target.value)}>
                  {["4:5", "1:1", "9:16"].map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
            </div>
            <p className="workflow-help">
              Generation uses one primary visual in this order: product photo, business photo, then owner photo. A logo is used only as the secondary branding reference. Without a logo, one additional business visual may be used as Image 2.
            </p>
          </div>

          <div className="workflow-panel">
            <div className="workflow-panel-header">
              <Upload size={18} />
              <h2>3. Add Brand Assets</h2>
            </div>

            <label className="upload-box small-upload" htmlFor="business-upload">
              <Upload size={24} />
              <span>Upload a business photo, product photo, owner photo or logo</span>
              <input id="business-upload" type="file" accept="image/*" onChange={(event) => setBusinessPhotoFile(event.target.files?.[0] || null)} />
            </label>
            <div className="field-grid">
              <div className="field-block">
                <label htmlFor="business-logo">Logo</label>
                <input id="business-logo" type="file" accept="image/*" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} />
              </div>
              <div className="field-block">
                <label htmlFor="business-product">Product photo</label>
                <input id="business-product" type="file" accept="image/*" onChange={(event) => setProductFile(event.target.files?.[0] || null)} />
              </div>
              <div className="field-block">
                <label htmlFor="business-owner">Owner photo</label>
                <input id="business-owner" type="file" accept="image/*" onChange={(event) => setOwnerFile(event.target.files?.[0] || null)} />
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
              {isGenerating ? "Generating Design..." : "Create Business Design"}
            </button>
            <button type="button" className="secondary-button" onClick={() => setIsGenerated(false)}>
              Reset
            </button>
          </div>
        </div>

        <aside className="workflow-preview-panel">
          <div className="preview-header-row">
            <h3>Campaign Preview</h3>
            <span>{selectedGoal}</span>
          </div>

          <div className="business-poster-preview">
            <div className="poster-badge">{selectedGoal}</div>
            <h4>{headline}</h4>
            <p>{brandName}</p>
            <strong>{ctaText}</strong>
          </div>

          {isGenerated && generatedResult ? (
            <div className="generated-meta">
              <strong>Campaign creative generated.</strong>
              <p>Your {selectedGoal.toLowerCase()} layout is ready for download and publishing.</p>
              <div className="result-actions">
                <a href={generatedResult.downloadUrl} download="kushi-business-design.png" className="secondary-button">
                  Download
                </a>
                <button type="button" className="ghost-button" onClick={handleGenerate}>
                  Generate Again
                </button>
              </div>
            </div>
          ) : null}

          <Link to="/studio" className="inline-link">
            Open creative studio <ArrowRight size={16} />
          </Link>
        </aside>
      </section>
    </main>
  );
}

export default BusinessStudio;
