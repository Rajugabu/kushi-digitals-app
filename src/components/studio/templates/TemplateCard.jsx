import React from "react";

const TemplateCard = ({ template, onSelect }) => {
  const accent = template?.accentColor || "#D4AF37";
  const accentSoft = template?.accentSoft || "rgba(212, 175, 55, 0.18)";
  const surfaceStart = template?.surfaceStart || "#1a1408";
  const surfaceEnd = template?.surfaceEnd || "#0a0a0d";

  return (
    <button
      type="button"
      onClick={() => onSelect?.(template)}
      className="kushi-template-card"
      aria-label={`Open ${template?.title || "template"}`}
      style={{
        "--template-accent": accent,
        "--template-accent-soft": accentSoft,
        "--template-surface-start": surfaceStart,
        "--template-surface-end": surfaceEnd,
      }}
    >
      <div className="kushi-template-card__preview">
        <div className="kushi-template-card__glow kushi-template-card__glow--one" />
        <div className="kushi-template-card__glow kushi-template-card__glow--two" />

        {template?.isPremium && (
          <span className="kushi-template-card__badge">Premium</span>
        )}

        <div className="kushi-template-card__photo-slot" />

        <div className="kushi-template-card__preview-content">
          <span className="kushi-template-card__eyebrow">
            {template?.category || "Premium Template"}
          </span>

          <h3 className="kushi-template-card__title">
            {template?.title || "Template Title"}
          </h3>

          <p className="kushi-template-card__brand">KUSHI AI STUDIO</p>
        </div>

        <span className="kushi-template-card__category-pill">
          {template?.category || "Template"}
        </span>
      </div>

      <div className="kushi-template-card__footer">
        <div className="kushi-template-card__footer-copy">
          <strong>{template?.title || "Template Title"}</strong>
          <span>Add your photo, name and details instantly.</span>
        </div>

        <span className="kushi-template-card__action">Use Template</span>
      </div>
    </button>
  );
};

export default TemplateCard;