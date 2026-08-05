import { Download, Info, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import { formatStudioPrice, OUTPUT_RATIOS } from "../../config/studioStyles";
import { getStudioPreviewStyle } from "../../utils/studioPreview";

function formatProviderName(provider) {
  if (!provider) return "Secure AI provider";
  if (provider === "openai") return "OpenAI";
  return provider.charAt(0).toUpperCase() + provider.slice(1);
}

function GenerationResult({
  result,
  style,
  ratio,
  onRegenerate,
  onStartOver,
  isGenerating,
  availableCredits,
  canRegenerate,
}) {
  const ratioDetails = OUTPUT_RATIOS[ratio];
  const metadata = result?.metadata || {};
  const displayUrl = result?.resultUrl;
  const canDownload = Boolean(result?.downloadUrl && result?.resultUrl);
  const dimensions = metadata.width && metadata.height
    ? `${metadata.width} × ${metadata.height}px`
    : "Provider-selected";
  const previewStyle = getStudioPreviewStyle({
    ratio,
    width: metadata.width,
    height: metadata.height,
    preferDimensions: true,
    maxHeight: 720,
  });

  return (
    <section className="studio-result" aria-labelledby="studio-result-title">
      <div className="studio-section-heading studio-result-heading">
        <div>
          <span className="studio-kicker">Step 3 · Your design</span>
          <h2 id="studio-result-title">Your generated design</h2>
          <p>The result is stored privately and delivered through expiring secure links.</p>
        </div>
        <span className="studio-result-status">
          <span aria-hidden="true" /> Generation complete
        </span>
      </div>

      <div className="studio-result-layout">
        <div className="studio-result-preview" style={previewStyle}>
          {displayUrl ? (
            <img src={displayUrl} alt={`Generated ${style.name} design`} />
          ) : (
            <div className="studio-result-placeholder"><Sparkles size={42} /></div>
          )}
          <span className="studio-demo-badge studio-real-result-badge">Generated securely</span>
        </div>

        <div className="studio-result-details">
          <span className="studio-result-eyebrow">Design summary</span>
          <h3>{style.name}</h3>
          <dl>
            <div><dt>Category</dt><dd>{style.category}</dd></div>
            <div><dt>Output ratio</dt><dd>{ratioDetails?.label} {ratioDetails?.dimensions}</dd></div>
            <div><dt>Dimensions</dt><dd>{dimensions}</dd></div>
            <div><dt>Provider</dt><dd>{formatProviderName(metadata.provider)}</dd></div>
            <div><dt>Quality</dt><dd>Premium High Resolution</dd></div>
            <div><dt>Status</dt><dd>Completed</dd></div>
          </dl>

          <div className="studio-integration-note studio-result-success-note">
            <Info size={18} />
            <p>{result.message}</p>
          </div>

          <div className="studio-result-actions">
            {canDownload ? (
              <a
                className="studio-download-button"
                href={result.downloadUrl}
                download
              >
                <Download size={18} /> Download generated image
              </a>
            ) : (
              <button
                type="button"
                className="studio-download-button"
                disabled
                title="Available only when a genuine generated file is returned"
              >
                <Download size={18} /> Download unavailable
              </button>
            )}

            <button
              type="button"
              className="studio-secondary-action"
              onClick={onRegenerate}
              disabled={isGenerating || !canRegenerate}
            >
              <RefreshCw size={17} /> Regenerate · {formatStudioPrice(style)}
            </button>
            <button type="button" className="studio-secondary-action" onClick={onStartOver}>
              <RotateCcw size={17} /> Create another design
            </button>
            <p className="studio-regenerate-note">
              Regenerate creates a new generation and uses {style.credits} credits again.
              {availableCredits < style.credits
                ? ` Your current balance is ${availableCredits} credits.`
                : ""}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export default GenerationResult;
