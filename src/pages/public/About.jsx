import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  Camera,
  CheckCircle2,
  Eye,
  FileText,
  HeartHandshake,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Truck,
  UploadCloud,
} from "lucide-react";

import SEO from "../../components/SEO";
import { galleryItems } from "../../config/galleryItems";
import { servicesData } from "../../config/services";
import studioPortraitImage from "../../assets/images/gallery/studio-portrait.webp";

const benefits = [
  {
    icon: Award,
    title: "Neat & Quality Work",
    description:
      "Every service is handled carefully with attention to clarity, finishing and customer requirements.",
  },
  {
    icon: FileText,
    title: "Clear Price Guidance",
    description:
      "Available prices are shown clearly. Services requiring review are confirmed before final processing.",
  },
  {
    icon: MessageCircle,
    title: "Personal Support",
    description:
      "Customers receive direct guidance instead of confusing or complicated service steps.",
  },
  {
    icon: Truck,
    title: "Reliable Delivery",
    description:
      "Online delivery, studio pickup and home delivery are provided only where the selected service supports them.",
  },
];

const processSteps = [
  {
    icon: Target,
    title: "Choose Your Service",
    description:
      "Select the service you need from the available Kushi Digitals options.",
  },
  {
    icon: UploadCloud,
    title: "Share Your Details",
    description:
      "Provide the required information, photos or documents securely.",
  },
  {
    icon: Eye,
    title: "Review & Confirmation",
    description:
      "The requirement, price and delivery method are reviewed and confirmed.",
  },
  {
    icon: CheckCircle2,
    title: "Receive Your Service",
    description:
      "Receive the final output online, at the studio or through eligible home delivery.",
  },
];

const studioValues = [
  {
    icon: HeartHandshake,
    title: "Care",
    description:
      "We treat every customer requirement with patience and attention.",
  },
  {
    icon: MessageCircle,
    title: "Clarity",
    description:
      "We explain service options, prices and next steps clearly.",
  },
  {
    icon: Award,
    title: "Quality",
    description:
      "We focus on neat output and practical service standards.",
  },
  {
    icon: ShieldCheck,
    title: "Trust",
    description:
      "We avoid misleading promises and keep communication transparent.",
  },
];

const promisePoints = [
  "Customer Requirement First",
  "Secure File Handling",
  "Transparent Updates",
];

const heroServices = [
  "passport-size-photos",
  "photo-frames",
  "photo-restoration",
].map((serviceId) =>
  servicesData.find(
    (service) => service.id === serviceId,
  ),
);

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  align = "center",
}) {
  return (
    <header
      className={`about-page-heading about-page-heading--${align}`}
    >
      <span className="about-page-eyebrow">
        <Sparkles size={15} aria-hidden="true" />
        {eyebrow}
      </span>
      <h2 id={id}>{title}</h2>
      {description && <p>{description}</p>}
    </header>
  );
}

function About() {
  return (
    <main className="about-premium-page">
      <SEO
        title="About Kushi Digitals | Trusted Studio Services"
        description="Learn about Kushi Digitals and our passport photo, photo frame, restoration, PAN card, travel booking, printing and lamination services."
      />

      <section
        className="about-page-hero"
        aria-labelledby="about-hero-title"
      >
        <div
          className="about-page-orb about-page-orb--purple"
          aria-hidden="true"
        />
        <div
          className="about-page-orb about-page-orb--cyan"
          aria-hidden="true"
        />

        <div className="container about-page-hero-grid">
          <div className="about-page-hero-copy">
            <span className="about-page-eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              About Kushi Digitals
            </span>

            <h1 id="about-hero-title">
              Trusted Services,
              <span>Handled with Care.</span>
            </h1>

            <strong className="about-page-hero-highlight">
              Quality. Clarity. Reliability.
            </strong>

            <p>
              Kushi Digitals provides useful photo, printing
              and online assistance services with clear
              communication, neat work and dependable customer
              support.
            </p>

            <div className="about-page-actions">
              <Link className="primary-button" to="/services">
                Explore Services
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                className="secondary-button"
                to="/book-service"
              >
                Book a Service
              </Link>
            </div>
          </div>

          <div className="about-page-hero-visual">
            <div className="about-page-hero-collage">
              {heroServices.map((service, index) => (
                <figure
                  className={`about-page-hero-image about-page-hero-image--${index + 1}`}
                  key={service.id}
                >
                  <img
                    src={service.image}
                    alt={service.imageAlt}
                  />
                </figure>
              ))}
              <div
                className="about-page-image-shine"
                aria-hidden="true"
              />
            </div>

            {[
              "Premium Quality",
              "Clear Guidance",
              "Trusted Support",
            ].map((label, index) => (
              <span
                className={`about-page-floating-label about-page-floating-label--${index + 1}`}
                key={label}
              >
                <CheckCircle2
                  size={15}
                  aria-hidden="true"
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section
        className="about-page-section"
        aria-labelledby="about-story-title"
      >
        <div className="container about-page-story-card">
          <div className="about-page-story-image">
            <img
              src={studioPortraitImage}
              alt="Kushi Digitals studio portrait work"
            />
            <span>
              <Camera size={17} aria-hidden="true" />
              Photo care with a personal approach
            </span>
          </div>

          <div className="about-page-story-copy">
            <span className="about-page-eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              Our Story
            </span>
            <h2 id="about-story-title">
              A Local Service Studio Built Around Real Customer
              Needs
            </h2>
            <p>
              Kushi Digitals was created to make common studio,
              printing and online-assistance services easier to
              understand and access.
            </p>
            <p>
              From passport photos and photo restoration to
              photo frames, PAN card support, travel ticket
              booking and print services, every requirement is
              handled with personal guidance and attention.
            </p>
            <blockquote>
              “Every customer requirement deserves clear
              guidance and careful work.”
            </blockquote>
          </div>
        </div>
      </section>

      <section
        className="about-page-section about-page-section--tinted"
        aria-labelledby="about-services-title"
      >
        <div className="container">
          <SectionHeading
            id="about-services-title"
            eyebrow="What We Do"
            title="Six Useful Services. One Trusted Place."
            description="Practical studio and online assistance, presented clearly and handled with care."
          />

          <div className="about-page-service-grid">
            {servicesData.map((service) => {
              const Icon = service.icon;

              return (
                <article
                  className="about-page-service-card"
                  key={service.id}
                >
                  <div className="about-page-service-media">
                    <img
                      src={service.image}
                      alt={service.imageAlt}
                    />
                    <span>{service.tag}</span>
                  </div>
                  <div className="about-page-service-body">
                    <div className="about-page-card-icon">
                      <Icon size={21} aria-hidden="true" />
                    </div>
                    <h3>{service.title}</h3>
                    <p>{service.homeDescription}</p>
                    <Link
                      to={`/book-service?service=${encodeURIComponent(
                        service.name,
                      )}`}
                    >
                      Book Service
                      <ArrowRight
                        size={16}
                        aria-hidden="true"
                      />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="about-page-section"
        aria-labelledby="about-benefits-title"
      >
        <div className="container">
          <SectionHeading
            id="about-benefits-title"
            eyebrow="Why Choose Us"
            title="Simple Service. Clear Communication. Better Experience."
          />

          <div className="about-page-benefit-grid">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <article
                  className="about-page-info-card"
                  key={benefit.title}
                >
                  <div className="about-page-card-icon">
                    <Icon size={23} aria-hidden="true" />
                  </div>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="about-page-section about-page-process-section"
        aria-labelledby="about-process-title"
      >
        <div className="container">
          <SectionHeading
            id="about-process-title"
            eyebrow="How It Works"
            title="A Clear Process from Request to Completion"
          />

          <ol className="about-page-process">
            {processSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <li key={step.title}>
                  <span className="about-page-process-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="about-page-card-icon">
                    <Icon size={22} aria-hidden="true" />
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section
        className="about-page-section"
        aria-labelledby="about-promise-title"
      >
        <div className="container about-page-promise">
          <div className="about-page-promise-copy">
            <span className="about-page-eyebrow">
              <ShieldCheck size={15} aria-hidden="true" />
              Our Promise
            </span>
            <h2 id="about-promise-title">
              Your Photos, Documents and Details Are Handled
              Responsibly
            </h2>
            <p>
              Customer files are used only for the selected
              service request and are handled through the
              existing secure order workflow.
            </p>
          </div>

          <div className="about-page-promise-points">
            {promisePoints.map((point) => (
              <div key={point}>
                <CheckCircle2
                  size={19}
                  aria-hidden="true"
                />
                <strong>{point}</strong>
              </div>
            ))}
            <small>
              Upload only the files required for your selected
              service.
            </small>
          </div>
        </div>
      </section>

      <section
        className="about-page-section about-page-section--tinted"
        aria-labelledby="about-values-title"
      >
        <div className="container">
          <SectionHeading
            id="about-values-title"
            eyebrow="Our Values"
            title="What Guides Every Service We Provide"
          />

          <div className="about-page-value-grid">
            {studioValues.map((value) => {
              const Icon = value.icon;

              return (
                <article
                  className="about-page-value-card"
                  key={value.title}
                >
                  <Icon size={25} aria-hidden="true" />
                  <h3>{value.title}</h3>
                  <p>{value.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="about-page-section"
        aria-labelledby="about-highlights-title"
      >
        <div className="container">
          <SectionHeading
            id="about-highlights-title"
            eyebrow="Service Highlights"
            title="A Glimpse of What We Handle"
          />

          <div className="about-page-gallery">
            {galleryItems.map((item) => (
              <figure
                className={`about-page-gallery-item about-page-gallery-item--${item.orientation}`}
                key={item.id}
              >
                <img
                  src={item.image}
                  alt={item.alt}
                  style={{
                    objectFit: item.objectFit,
                    objectPosition: item.objectPosition,
                  }}
                />
                <figcaption>
                  <span>{item.category}</span>
                  <strong>{item.title}</strong>
                </figcaption>
              </figure>
            ))}
          </div>

          <div className="about-page-gallery-action">
            <Link
              className="secondary-button"
              to="/gallery"
            >
              View Gallery
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      <section className="about-page-section about-page-cta-section">
        <div className="container">
          <div className="about-page-final-cta">
            <div>
              <span className="about-page-eyebrow">
                <Sparkles size={15} aria-hidden="true" />
                Ready to Get Started?
              </span>
              <h2>Tell Us What Service You Need</h2>
              <p>
                Choose your service, share your requirement and
                let Kushi Digitals guide you through the next
                steps.
              </p>
            </div>

            <div className="about-page-actions">
              <Link
                className="primary-button"
                to="/book-service"
              >
                Book a Service
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <Link
                className="secondary-button"
                to="/contact"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default About;
