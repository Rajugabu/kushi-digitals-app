import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

function ServiceCard({
  service,
  to,
  onSelect,
  selected = false,
  compact = false,
  showPrice = false,
  actionLabel = "Book Now",
}) {
  const Icon = service.icon;
  const className = [
    "premium-service-card",
    compact ? "premium-service-card--compact" : "",
    selected ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span className="premium-service-card__media">
        <img
          src={service.image}
          alt={service.imageAlt}
          loading="lazy"
          className={
            service.imageStyle === "contain"
              ? "premium-service-card__image--contain"
              : ""
          }
        />

        <span className="premium-service-card__shade" />

        <span className="premium-service-card__badge">
          {service.tag}
        </span>

        <span className="premium-service-card__icon">
          <Icon size={compact ? 18 : 21} />
        </span>

        {selected && (
          <span className="premium-service-card__selected">
            <CheckCircle2 size={16} />
            Selected
          </span>
        )}
      </span>

      <span className="premium-service-card__body">
        <span className="premium-service-card__title">
          {service.name}
        </span>

        <span className="premium-service-card__description">
          {service.shortDescription ||
            service.homeDescription}
        </span>

        <span className="premium-service-card__footer">
          {showPrice && (
            <span className="premium-service-card__price">
              <small>{service.priceLabel}</small>
              <strong>{service.price}</strong>
            </span>
          )}

          <span className="premium-service-card__action">
            {selected ? "Selected" : actionLabel}
            {selected ? (
              <CheckCircle2 size={16} />
            ) : (
              <ArrowRight size={16} />
            )}
          </span>
        </span>
      </span>
    </>
  );

  if (to) {
    return (
      <Link className={className} to={to}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => onSelect?.(service)}
      aria-pressed={selected}
      aria-label={`${selected ? "Selected" : "Select"} ${service.name}`}
    >
      {content}
    </button>
  );
}

export default ServiceCard;
