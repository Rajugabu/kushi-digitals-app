import { Sparkles } from "lucide-react";

function PageHero({
  eyebrow,
  title,
  highlight,
  description,
}) {
  return (
    <section className="page-hero">
      <div className="page-hero-orb page-hero-orb-one" />
      <div className="page-hero-orb page-hero-orb-two" />

      <div className="container page-hero-content">
        <div className="eyebrow">
          <Sparkles size={16} />
          <span>{eyebrow}</span>
        </div>

        <h1>
          {title}{" "}
          {highlight && (
            <span className="gradient-text">{highlight}</span>
          )}
        </h1>

        <p>{description}</p>
      </div>
    </section>
  );
}

export default PageHero;