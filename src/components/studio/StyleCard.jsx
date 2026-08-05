import { Check, Heart, Image as ImageIcon, Share2, Sparkles } from "lucide-react";
import { formatStudioPrice } from "../../config/studioStyles";

function StyleCard({ style, isSelected, isFavorite, onSelect, onFavorite, onShare }) {
  const primaryRatio = style.supportedRatios[0];
  const orientationLabel = primaryRatio === "3:2" ? "L" : "P";

  return (
    <article
      className={`studio-style-card studio-accent-${style.accent} ${isSelected ? "selected" : ""}`}
    >
      <button
        type="button"
        className="studio-style-select"
        onClick={() => onSelect(style)}
        aria-pressed={isSelected}
        aria-label={`Select ${style.name}`}
      >
        <span className="studio-style-visual">
          <img
            src={style.thumbnail}
            alt={`${style.name} style preview`}
            loading="lazy"
            style={{ objectPosition: style.thumbnailPosition }}
          />
          <span className="studio-style-tint" aria-hidden="true" />
          <span className="studio-style-category">{style.category}</span>
          <span className="studio-style-orientation" title={`${primaryRatio} output`}>
            <ImageIcon size={12} /> {orientationLabel}
          </span>
          {isSelected && (
            <span className="studio-style-selected-mark" aria-hidden="true">
              <Check size={16} strokeWidth={3} />
            </span>
          )}
        </span>

        <span className="studio-style-details">
          <strong>{style.name}</strong>
          <span>{style.description}</span>
          <span className="studio-style-price">
            <Sparkles size={14} />
            {formatStudioPrice(style)}
          </span>
        </span>
      </button>

      <div className="studio-style-actions">
        <button
          type="button"
          className={isFavorite ? "favorite" : ""}
          onClick={() => onFavorite(style.id)}
          aria-label={`${isFavorite ? "Remove" : "Add"} ${style.name} ${isFavorite ? "from" : "to"} favorites`}
          aria-pressed={isFavorite}
          title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart size={16} fill={isFavorite ? "currentColor" : "none"} />
        </button>
        <button
          type="button"
          onClick={() => onShare(style)}
          aria-label={`Share ${style.name}`}
          title="Share style"
        >
          <Share2 size={16} />
        </button>
      </div>
    </article>
  );
}

export default StyleCard;
