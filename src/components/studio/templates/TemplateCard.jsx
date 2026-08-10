import TemplateArtwork from "./TemplateArtwork";

const TemplateCard = ({
  template,
  onSelect,
  isSelected = false,
  userPhoto = "",
  userName = "",
  photoAdjustment = {},
}) => {
  const accent = template?.accentColor || "#D4AF37";
  const accentSoft =
    template?.accentSoft || "rgba(212, 175, 55, 0.18)";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(template)}
      className={`kushi-template-card ${isSelected ? "is-selected" : ""}`}
      aria-label={`Open ${template?.title || "template"}`}
      aria-pressed={isSelected}
      style={{
        "--template-accent": accent,
        "--template-accent-soft": accentSoft,
      }}
    >
      <div className="kushi-template-card__preview is-personalized">
        <TemplateArtwork
          template={template}
          userPhoto={userPhoto}
          userName={userName}
          photoAdjustment={photoAdjustment}
          compact
        />

        <span
          className={`kushi-template-card__badge ${
            template?.isPremium ? "is-premium" : "is-free"
          }`}
        >
          {template?.isPremium ? "Premium" : "Free"}
        </span>

        <span className="kushi-template-card__category-pill">
          {template?.category || "Template"}
        </span>
      </div>

      <div className="kushi-template-card__footer">
        <div className="kushi-template-card__footer-copy">
          <strong>{template?.title || "Template Title"}</strong>
          <span>
            {(template?.type || "photo") === "video"
              ? "Ready-made video template"
              : template?.experience === "create"
                ? "Simple background design"
                : "Ready-made photo template"}
            {" · 0 AI credits"}
          </span>
        </div>
      </div>
    </button>
  );
};

export default TemplateCard;
