import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import PageHero from "../../components/PageHero";
import ServiceCard from "../../components/ServiceCard";
import { servicesData } from "../../config/services";

function Services() {
  return (
    <>
      <PageHero
        eyebrow="Our Premium Services"
        title="Creative Services Built Around"
        highlight="Your Memories"
        description="From professional passport photos to premium frames, restoration, photography and album designing, every order receives personal attention."
      />

      <section className="page-section service-gallery-section">
        <div className="container">
          <div className="service-gallery-intro">
            <span>Choose your service</span>
            <h2>Premium care for every photograph and occasion</h2>
            <p>
              Browse our studio, print and digital services, then select
              any card to begin with the right order options already
              prepared.
            </p>
          </div>

          <div className="premium-service-grid premium-service-grid--gallery">
            {servicesData.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                to={`/book-service?service=${encodeURIComponent(service.name)}`}
                actionLabel="Book Now"
                showPrice
              />
            ))}
          </div>
        </div>
      </section>

      <section className="page-section compact-cta-section">
        <div className="container">
          <div className="compact-cta">
            <div>
              <span>Need a customized service?</span>
              <h2>Tell Us Exactly What You Need</h2>
              <p>
                Share your photo and requirement. We will guide you to
                the right service.
              </p>
            </div>

            <Link
              to="/book-service?service=Other%20Service"
              className="primary-button"
            >
              Request a Custom Service
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default Services;
