import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  IndianRupee,
} from "lucide-react";

import PageHero from "../../components/PageHero";
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

      <section className="page-section">
        <div className="container service-detail-grid">
          {servicesData.map((service) => {
            const Icon = service.icon;

            return (
              <article
                className="service-detail-card"
                key={service.id}
              >
                <div className="service-detail-top">
                  <div className="service-detail-icon">
                    <Icon size={29} />
                  </div>

                  <span className="service-detail-tag">
                    {service.tag}
                  </span>
                </div>

                <h2>{service.title}</h2>

                <p>{service.description}</p>

                <div className="service-detail-price">
                  <div>
                    <span>{service.priceLabel}</span>

                    <strong>
                      {service.price !== "Custom Quote" && (
                        <IndianRupee size={20} />
                      )}

                      {service.price.replace("₹", "")}
                    </strong>
                  </div>

                  <small>
                    Final price depends on size, quantity and requirement.
                  </small>
                </div>

                <div className="service-benefit-list">
                  {service.benefits.map((benefit) => (
                    <div key={benefit}>
                      <CheckCircle2 size={17} />
                      <span>{benefit}</span>
                    </div>
                  ))}
                </div>

                <Link
                  to={`/book-service?service=${service.id}`}
                  className="primary-button service-order-button"
                >
                  Book This Service
                  <ArrowRight size={17} />
                </Link>
              </article>
            );
          })}
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

            <Link to="/contact" className="primary-button">
              Contact Kushi Digitals
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

export default Services;