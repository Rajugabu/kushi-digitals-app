import {
  Award,
  Camera,
  CheckCircle2,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import PageHero from "../../components/PageHero";

const values = [
  {
    icon: ShieldCheck,
    title: "Trust & Privacy",
    description:
      "Customer photos are handled responsibly with respect for privacy.",
  },
  {
    icon: Award,
    title: "Premium Quality",
    description:
      "Every order is checked carefully before final delivery.",
  },
  {
    icon: HeartHandshake,
    title: "Friendly Service",
    description:
      "Clear communication and customer satisfaction come first.",
  },
  {
    icon: Target,
    title: "Attention To Detail",
    description:
      "Small visual details receive the same care as the complete design.",
  },
];

function About() {
  return (
    <>
      <PageHero
        eyebrow="About Kushi Digitals"
        title="More Than A Studio."
        highlight="A Place For Memories."
        description="Kushi Digitals combines photography experience, creative editing and customer-focused service to produce meaningful results."
      />

      <section className="page-section">
        <div className="container about-story-grid">
          <div className="about-story-copy">
            <div className="eyebrow">
              <Sparkles size={16} />
              <span>Our Story</span>
            </div>

            <h2>
              Creativity, Technology And
              <span className="gradient-text"> Personal Care</span>
            </h2>

            <p>
              Kushi Digitals was created to make professional photography
              and digital photo services easily available to families,
              students, professionals and local customers.
            </p>

            <p>
              Whether it is a quick passport photo, an old family
              photograph that needs restoration, or a premium frame for a
              special memory, our goal is to provide a clean, reliable and
              satisfying experience.
            </p>

            <div className="about-check-list">
              <div>
                <CheckCircle2 size={19} />
                Professional editing workflow
              </div>

              <div>
                <CheckCircle2 size={19} />
                Customer-first communication
              </div>

              <div>
                <CheckCircle2 size={19} />
                Modern digital tools and techniques
              </div>

              <div>
                <CheckCircle2 size={19} />
                Quality-focused final delivery
              </div>
            </div>
          </div>

          <div className="about-visual">
            <div className="about-visual-glow" />

            <div className="about-camera-card">
              <span className="about-card-label">Kushi Digitals</span>

              <div className="about-camera-icon">
                <Camera size={72} strokeWidth={1.35} />
              </div>

              <h3>Memories Made Timeless</h3>
              <p>
                Photography • Restoration • Frames • Albums
              </p>
            </div>

            <div className="about-floating-stat stat-quality">
              <strong>Premium</strong>
              <span>Quality</span>
            </div>

            <div className="about-floating-stat stat-care">
              <strong>100%</strong>
              <span>Personal Care</span>
            </div>
          </div>
        </div>
      </section>

      <section className="page-section values-section">
        <div className="container">
          <div className="section-heading">
            <div className="eyebrow">
              <Award size={16} />
              <span>Our Values</span>
            </div>

            <h2>
              The Principles Behind
              <span className="gradient-text"> Every Order</span>
            </h2>
          </div>

          <div className="values-grid">
            {values.map((value) => {
              const Icon = value.icon;

              return (
                <article className="value-card" key={value.title}>
                  <div className="value-icon">
                    <Icon size={26} />
                  </div>

                  <h3>{value.title}</h3>
                  <p>{value.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

export default About;