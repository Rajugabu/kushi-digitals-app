import { Link } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Headphones,
  Sparkles,
  Upload,
} from "lucide-react";

import { servicesData } from "../../config/services";

const bookingSteps = [
  {
    number: "01",
    title: "Choose Your Service",
    text: "Select the service you need from Kushi Digitals.",
    icon: Camera,
  },
  {
    number: "02",
    title: "Share Your Details",
    text: "Provide the required information, photos or documents.",
    icon: Upload,
  },
  {
    number: "03",
    title: "Receive Your Service",
    text: "Get the completed work online, at the studio or through the selected delivery option.",
    icon: CheckCircle2,
  },
];

function Services() {
  return (
    <main className="focused-services-page">
      <section className="focused-services-hero">
        <div className="focused-services-orb focused-services-orb-left" />
        <div className="focused-services-orb focused-services-orb-right" />

        <div className="container focused-services-hero-content">
          <div className="eyebrow">
            <Sparkles size={16} />
            <span>OUR SERVICES</span>
          </div>

          <h1>
            Premium Services from{" "}
            <span className="gradient-text">Kushi Digitals</span>
          </h1>

          <p>
            Passport photos, premium photo frames, photo restoration, PAN card
            assistance, travel ticket booking and lamination or printing
            support — all in one trusted place.
          </p>

          <div className="focused-services-actions">
            <Link to="/book-service" className="primary-button">
              Book a Service
              <ArrowRight size={18} />
            </Link>
            <Link to="/contact" className="secondary-button">
              Contact Us
            </Link>
          </div>
        </div>
      </section>

      <section
        className="focused-services-catalog page-section"
        aria-labelledby="focused-services-title"
      >
        <div className="container">
          <div className="focused-services-heading">
            <span>Focused studio support</span>
            <h2 id="focused-services-title">Six services, finished with care.</h2>
            <p>
              Choose the service that matches your requirement and share the
              details securely through the booking form.
            </p>
          </div>

          <div className="focused-services-grid">
            {servicesData.map((service) => (
              <article className="focused-service-card" key={service.id}>
                <div className="focused-service-media">
                  <img
                    src={service.image}
                    alt={service.imageAlt}
                    loading="lazy"
                  />
                  <div
                    className="focused-service-media-shade"
                    aria-hidden="true"
                  />
                  <span className="focused-service-number">
                    {service.number}
                  </span>
                </div>

                <div className="focused-service-body">
                  <span className="focused-service-tag">{service.tag}</span>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>

                  <Link
                    to={`/book-service?service=${encodeURIComponent(service.name)}`}
                    className="focused-service-link"
                    aria-label={`Book ${service.title}`}
                  >
                    Book Service
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="focused-services-process page-section"
        aria-labelledby="focused-process-title"
      >
        <div className="container">
          <div className="focused-services-heading">
            <span>Simple process</span>
            <h2 id="focused-process-title">How It Works</h2>
          </div>

          <div className="focused-process-grid">
            {bookingSteps.map((step) => {
              const StepIcon = step.icon;

              return (
                <article className="focused-process-card" key={step.number}>
                  <div className="focused-process-card-top">
                    <span className="focused-process-icon">
                      <StepIcon size={22} strokeWidth={1.8} />
                    </span>
                    <span>{step.number}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="focused-services-cta page-section">
        <div className="container">
          <div className="focused-services-cta-panel">
            <span className="focused-services-cta-icon" aria-hidden="true">
              <Headphones size={28} />
            </span>

            <div>
              <span>Personal guidance</span>
              <h2>Ready to Book Your Service?</h2>
              <p>
                Choose your service and share your requirement. Kushi Digitals
                will guide you through the next steps.
              </p>
            </div>

            <div className="focused-services-actions">
              <Link to="/book-service" className="primary-button">
                Book a Service
                <ArrowRight size={18} />
              </Link>
              <Link to="/contact" className="secondary-button">
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Services;
