import { Check } from "lucide-react";
import { OUTPUT_RATIOS } from "../../config/studioStyles";

function OutputRatioSelector({ supportedRatios, selectedRatio, onSelect }) {
  return (
    <fieldset className="studio-ratio-selector">
      <legend>Output ratio</legend>
      <p>Choose the format for your finished design.</p>
      <div className="studio-ratio-options">
        {supportedRatios.map((ratioId) => {
          const ratio = OUTPUT_RATIOS[ratioId];
          const selected = selectedRatio === ratioId;

          if (!ratio) {
            return null;
          }

          return (
            <button
              key={ratioId}
              type="button"
              className={`studio-ratio-option ${selected ? "selected" : ""}`}
              onClick={() => onSelect(ratioId)}
              aria-pressed={selected}
            >
              <span className={`studio-ratio-shape studio-ratio-${ratio.orientation}`} aria-hidden="true" />
              <span>
                <strong>{ratio.label}</strong>
                <small>{ratio.dimensions}</small>
              </span>
              {selected && <Check size={16} strokeWidth={3} aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default OutputRatioSelector;
