import { ImagePlus } from "lucide-react";

import {
  getTemplateBackgroundStyle,
  getTemplateDecorationPosition,
  getTemplateNameSlot,
  getTemplatePhotoAdjustment,
  getTemplatePhotoMaskStyle,
  getTemplatePhotoSlot,
} from "./templateData";

function TemplateArtwork({
  template,
  userPhoto = "",
  userName = "",
  photoAdjustment = {},
  artworkRef,
  compact = false,
  interactivePhoto = false,
  isAdjusting = false,
  onPhotoClick,
  onPhotoPointerDown,
  onPhotoPointerMove,
  onPhotoPointerUp,
  slotEditing = false,
  onSlotResizePointerDown,
  onSlotResizePointerMove,
  onSlotResizePointerUp,
}) {
  if (!template) {
    return null;
  }

  const accent = template.accentColor || "#D4AF37";
  const photoSlot = getTemplatePhotoSlot(template);
  const nameSlot = getTemplateNameSlot(template);
  const nameFontSize = String(nameSlot.fontSize).endsWith("%")
    ? `${String(nameSlot.fontSize).slice(0, -1)}cqw`
    : nameSlot.fontSize;
  const adjustment = getTemplatePhotoAdjustment(template, photoAdjustment);
  const textLayout = template.textLayout || {};
  const textAlign = textLayout.align || "center";
  const canvas = template.canvas || { width: 1080, height: 1350 };
  const showFallbackArtwork = Boolean(
    !userPhoto && (template.previewImage || template.thumbnail),
  );

  return (
    <div
      ref={artworkRef}
      className={`kushi-template-artwork ${compact ? "is-compact" : ""}`}
      style={{
        aspectRatio: `${canvas.width || 1080} / ${canvas.height || 1350}`,
        ...getTemplateBackgroundStyle(template),
      }}
      data-template-id={template.id}
    >
      {showFallbackArtwork ? (
        <img
          src={template.previewImage || template.thumbnail}
          alt=""
          className="kushi-template-artwork__fallback"
          loading={compact ? "lazy" : undefined}
          decoding="async"
        />
      ) : (
        <>
          {(template.decorations || []).map((decoration, index) => {
            const isHalo = decoration.type === "halo";

            return (
              <span
                key={`${decoration.type}-${index}`}
                className="kushi-template-artwork__decoration"
                aria-hidden="true"
                style={{
                  width: isHalo ? "62%" : "48%",
                  background: decoration.color || accent,
                  opacity: isHalo ? 0.15 : 0.18,
                  filter: isHalo ? "blur(58px)" : "blur(72px)",
                  ...getTemplateDecorationPosition(decoration.position),
                }}
              />
            );
          })}

          {photoSlot.enabled && (
            <div
              className={`kushi-template-artwork__photo ${
                interactivePhoto ? "is-interactive" : ""
              } ${isAdjusting ? "is-adjusting" : ""}`}
              style={{
                zIndex: photoSlot.zIndex,
                top: photoSlot.top,
                left: photoSlot.left,
                width: photoSlot.width,
                height: photoSlot.height,
                borderRadius: photoSlot.borderRadius,
                ...getTemplatePhotoMaskStyle(photoSlot),
              }}
              role={interactivePhoto ? "button" : undefined}
              tabIndex={interactivePhoto ? 0 : undefined}
              aria-label={
                interactivePhoto
                  ? isAdjusting
                    ? "Drag to adjust photo position"
                    : "Select photo controls"
                  : undefined
              }
              data-photo-mode={photoSlot.mode}
              onClick={interactivePhoto ? onPhotoClick : undefined}
              onKeyDown={
                interactivePhoto
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onPhotoClick?.(event);
                      }
                    }
                  : undefined
              }
              onPointerDown={isAdjusting ? onPhotoPointerDown : undefined}
              onPointerMove={isAdjusting ? onPhotoPointerMove : undefined}
              onPointerUp={isAdjusting ? onPhotoPointerUp : undefined}
              onPointerCancel={isAdjusting ? onPhotoPointerUp : undefined}
            >
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt=""
                  draggable="false"
                  loading={compact ? "lazy" : undefined}
                  decoding="async"
                  style={{
                    objectFit: photoSlot.objectFit,
                    objectPosition: `${adjustment.objectPositionX}% ${adjustment.objectPositionY}%`,
                  }}
                />
              ) : (
                <span className="kushi-template-artwork__empty-photo">
                  <ImagePlus size={compact ? 18 : 28} />
                  {!compact && <small>Add your photo</small>}
                </span>
              )}

              {slotEditing && (
                <span
                  className="kushi-template-artwork__slot-resize"
                  aria-hidden="true"
                  onPointerDown={onSlotResizePointerDown}
                  onPointerMove={onSlotResizePointerMove}
                  onPointerUp={onSlotResizePointerUp}
                  onPointerCancel={onSlotResizePointerUp}
                />
              )}
            </div>
          )}

          {template.foregroundOverlayImage && (
            <img
              src={template.foregroundOverlayImage}
              alt=""
              className="kushi-template-artwork__foreground"
              decoding="async"
              draggable="false"
            />
          )}

          {template.showDesignText !== false && (
            <div
              className="kushi-template-artwork__copy"
              style={{ textAlign }}
            >
              <span
                style={{
                  top: textLayout.eyebrow?.top || "70%",
                  left: textLayout.eyebrow?.left || "10%",
                  width: textLayout.eyebrow?.width || "80%",
                  color: accent,
                }}
              >
                {textLayout.eyebrow?.text || template.category}
              </span>

              <strong
                style={{
                  top: textLayout.heading?.top || "75%",
                  left: textLayout.heading?.left || "8%",
                  width: textLayout.heading?.width || "84%",
                }}
              >
                {template.defaultName || template.title}
              </strong>

              <p
                style={{
                  top: textLayout.message?.top || "84%",
                  left: textLayout.message?.left || "12%",
                  width: textLayout.message?.width || "76%",
                }}
              >
                {template.defaultMessage || "Create. Personalize. Share."}
              </p>

              {(!userName || !nameSlot.enabled) && (
                <small
                  style={{
                    left: textLayout.brand?.left || "10%",
                    bottom: textLayout.brand?.bottom || "4%",
                    width: textLayout.brand?.width || "80%",
                    color: accent,
                  }}
                >
                  KUSHI AI STUDIO
                </small>
              )}
            </div>
          )}

          {nameSlot.enabled && userName && (
            <strong
              className="kushi-template-artwork__profile-name"
              style={{
                zIndex: nameSlot.zIndex,
                top: nameSlot.top,
                bottom: nameSlot.top ? undefined : nameSlot.bottom,
                left: nameSlot.left,
                width: nameSlot.width,
                textAlign: nameSlot.textAlign,
                fontFamily: nameSlot.fontFamily,
                fontSize: nameFontSize,
                fontWeight: nameSlot.fontWeight,
                color: nameSlot.color,
                letterSpacing: nameSlot.letterSpacing,
              }}
            >
              {userName}
            </strong>
          )}
        </>
      )}
    </div>
  );
}

export default TemplateArtwork;
