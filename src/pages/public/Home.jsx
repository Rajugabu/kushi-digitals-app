import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Image,
  MessageCircle,
  Paintbrush,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  WandSparkles,
  Zap,
} from "lucide-react";
import { homepageGalleryItems } from "../../config/galleryItems";
import { servicesData } from "../../config/services";

// TODO: Replace with Travel Ticket Booking image
import travelTicketBookingImage from "../../assets/images/gallery/album-design.webp";
// TODO: Replace with PAN Card Services image
import panCardServicesImage from "../../assets/images/gallery/digital-editing.webp";
import passportPhotosImage from "../../assets/images/gallery/passport-photos.webp";
import premiumFrameImage from "../../assets/images/gallery/premium-frame.webp";
import restorationImage from "../../assets/images/gallery/restoration-before-after.webp";
import studioPortraitImage from "../../assets/images/gallery/studio-portrait.webp";

const studioSlides = [
  {
    title: "Passport Size Photos",
    label: "Quick studio service",
    image: passportPhotosImage,
    alt: "Professional passport-size photo sheet by Kushi Digitals",
    note: "Correct sizing. Clear finishing.",
  },
  {
    title: "Photo Frames",
    label: "Premium finishing",
    image: premiumFrameImage,
    alt: "Premium framed family portrait",
    note: "Made for memories that matter.",
  },
  {
    title: "Photo Restoration",
    label: "Careful restoration",
    image: restorationImage,
    alt: "Before and after restoration of an old family photograph",
    note: "Old memories, beautifully renewed.",
  },
  {
    title: "PAN Card Services",
    label: "Online application support",
    image: panCardServicesImage,
    alt: "PAN card online application assistance",
    note: "Application and correction assistance.",
  },
  {
    title: "Travel Ticket Booking",
    label: "Travel booking assistance",
    image: travelTicketBookingImage,
    alt: "Train, bus and flight ticket booking assistance",
    note: "Plan journeys with practical support.",
  },
  {
    title: "Laminations & Print Support",
    label: "Clean print support",
    image: studioPortraitImage,
    alt: "Premium studio portrait prepared for print",
    note: "Neat output, ready to preserve.",
  },
];

const trustHighlights = [
  { icon: WandSparkles, title: "Studio Quality Editing", detail: "Care in every detail" },
  { icon: Zap, title: "Fast Service", detail: "Clear, timely support" },
  { icon: ShieldCheck, title: "Premium Finishing", detail: "Neat professional output" },
  { icon: HeartHandshake, title: "Trusted Local Studio", detail: "Personal guidance" },
];

const studioBenefits = [
  {
    icon: Sparkles,
    title: "Premium Quality Output",
    description:
      "Careful color, detail and finishing for results you will be proud to keep.",
  },
  {
    icon: Clock3,
    title: "Fast & Reliable Service",
    description:
      "Clear timelines, responsive updates and dependable support from start to finish.",
  },
  {
    icon: HeartHandshake,
    title: "Personalized Studio Support",
    description:
      "Friendly guidance shaped around your photo, occasion and preferred output.",
  },
  {
    icon: CheckCircle2,
    title: "Affordable & Neat Finishing",
    description:
      "Thoughtful service and professional presentation at practical local pricing.",
  },
];

const processSteps = [
  {
    number: "01",
    icon: Upload,
    title: "Share Your Requirement",
    description:
      "Tell us what you need and share the photos, size or occasion details.",
  },
  {
    number: "02",
    icon: Paintbrush,
    title: "We Design, Edit & Prepare",
    description:
      "Our studio carefully prepares your design, edit, frame or print output.",
  },
  {
    number: "03",
    icon: CheckCircle2,
    title: "Receive Your Final Output",
    description:
      "Review the completed work and receive your digital or finished output.",
  },
];

const testimonials = [
  {
    name: "Suresh Kumar",
    service: "Photo Restoration",
    review:
      "The old family photo was restored with natural detail. The result felt careful and respectful.",
  },
  {
    name: "Lakshmi Devi",
    service: "Photo Frames",
    review:
      "The frame quality and finishing were excellent. Everything looked clean and beautifully presented.",
  },
  {
    name: "Ravi Teja",
    service: "Travel Ticket Booking",
    review:
      "Clear guidance, careful passenger details and timely booking support. The process was simple.",
  },
];

function Home() {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const activeSlide = studioSlides[activeSlideIndex];

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (reduceMotion) {
      return undefined;
    }

    const slideTimer = window.setInterval(() => {
      setActiveSlideIndex(
        (currentIndex) => (currentIndex + 1) % studioSlides.length,
      );
    }, 5200);

    return () => window.clearInterval(slideTimer);
  }, []);

  return (
    <div className="studio-home">
      <section className="studio-hero">
        <div className="studio-hero-grid" aria-hidden="true" />
        <div className="studio-hero-glow studio-hero-glow-purple" aria-hidden="true" />
        <div className="studio-hero-glow studio-hero-glow-cyan" aria-hidden="true" />

        <div className="container studio-hero-layout">
          <div className="studio-hero-copy">
            <div className="studio-eyebrow">
              <Sparkles size={15} />
              <span>PREMIUM PHOTO STUDIO SERVICES</span>
            </div>

            <h1 className="studio-hero-title">Kushi Digitals</h1>

            <p className="studio-hero-description">
              Passport photos, photo restoration, premium frames, PAN card
              services and travel ticket booking with studio-level care.
            </p>
          </div>

          <div className="studio-showcase-shell">
            <div className="studio-showcase">
              <div className="studio-showcase-topbar">
                <div>
                  <span className="studio-live-dot" />
                  Studio showcase
                </div>
                <span>{String(activeSlideIndex + 1).padStart(2, "0")} / 06</span>
              </div>

              <div className="studio-slide" aria-live="polite">
                <img
                  key={activeSlide.image}
                  src={activeSlide.image}
                  alt={activeSlide.alt}
                  fetchPriority={activeSlideIndex === 0 ? "high" : "auto"}
                />

                <div className="studio-slide-shade" />

                <div className="studio-slide-copy">
                  <span>{activeSlide.label}</span>
                  <h2>{activeSlide.title}</h2>
                  <p>{activeSlide.note}</p>
                </div>
              </div>

              <div className="studio-slide-controls" aria-label="Studio service slideshow">
                {studioSlides.map((slide, index) => (
                  <button
                    type="button"
                    key={slide.title}
                    className={index === activeSlideIndex ? "active" : ""}
                    aria-label={`Show ${slide.title}`}
                    aria-current={index === activeSlideIndex ? "true" : undefined}
                    onClick={() => setActiveSlideIndex(index)}
                  >
                    <span />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="studio-hero-actions">
            <Link to="/services" className="primary-button">
              Explore Services
              <ArrowRight size={18} />
            </Link>

            <Link to="/book-service" className="secondary-button">
              Book a Service
            </Link>
          </div>
        </div>
      </section>

      <section className="studio-trust-strip" aria-label="Studio highlights">
        <div className="container studio-trust-grid">
          {trustHighlights.map((highlight) => {
            const HighlightIcon = highlight.icon;

            return (
              <article key={highlight.title}>
                <span>
                  <HighlightIcon size={19} />
                </span>
                <div>
                  <strong>{highlight.title}</strong>
                  <small>{highlight.detail}</small>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="studio-section studio-services-section" id="studio-services">
        <div className="container">
          <div className="studio-section-heading">
            <div className="studio-section-kicker">
              <Camera size={15} />
              <span>Crafted With Care</span>
            </div>
            <h2>Our Studio Services</h2>
            <p>
              Everything you need for photos, frames, restoration and digital
              finishing.
            </p>
          </div>

          <div className="studio-services-grid">
            {servicesData.map((service) => {
              const ServiceIcon = service.icon;

              return (
                <article className="studio-service-card" key={service.title}>
                  <div className="studio-service-media">
                    <img
                      src={service.image}
                      alt={service.imageAlt}
                      loading="lazy"
                    />
                    <div
                      className="studio-service-media-shade"
                      aria-hidden="true"
                    />
                    <span className="studio-service-number">
                      {service.number}
                    </span>
                  </div>

                  <div className="studio-service-body">
                    <span className="studio-service-icon" aria-hidden="true">
                      <ServiceIcon size={24} strokeWidth={1.8} />
                    </span>

                    <h3>{service.title}</h3>
                    <p>{service.homeDescription}</p>

                    <Link
                      to={`/book-service?service=${encodeURIComponent(service.name)}`}
                      className="studio-card-link"
                    >
                      Book Service
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="studio-section studio-benefits-section">
        <div className="studio-benefit-glow" aria-hidden="true" />

        <div className="container studio-benefits-layout">
          <div className="studio-benefits-intro">
            <div className="studio-section-kicker">
              <ShieldCheck size={15} />
              <span>Why Choose Us</span>
            </div>

            <h2>
              Studio care you can
              <span className="studio-gradient-text"> see and trust.</span>
            </h2>

            <p>
              Your photographs hold real meaning. We combine personal support,
              careful workmanship and modern studio tools to finish them well.
            </p>

            <div className="studio-benefit-promise">
              <span>
                <Camera size={22} />
              </span>
              <div>
                <strong>Premium Service Studio</strong>
                <small>Thoughtful service for everyday and special memories.</small>
              </div>
            </div>
          </div>

          <div className="studio-benefits-grid">
            {studioBenefits.map((benefit) => {
              const BenefitIcon = benefit.icon;

              return (
                <article key={benefit.title}>
                  <span>
                    <BenefitIcon size={22} />
                  </span>
                  <h3>{benefit.title}</h3>
                  <p>{benefit.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="studio-section studio-gallery-section">
        <div className="container">
          <div className="studio-section-heading studio-section-heading-row">
            <div>
              <div className="studio-section-kicker">
                <Image size={15} />
                <span>Selected Studio Work</span>
              </div>
              <h2>Featured Works</h2>
              <p>
                A glimpse of the frames, portraits, restoration and service
                visuals we prepare with care.
              </p>
            </div>

            <Link to="/gallery" className="secondary-button">
              View Full Gallery
              <ArrowRight size={17} />
            </Link>
          </div>

          <div className="studio-gallery-grid">
            {homepageGalleryItems.map((item) => (
              <article
                className={`studio-gallery-card editorial-gallery-card gallery-card--${item.orientation} gallery-card--${item.size} gallery-card--${item.overlayTone}-overlay`}
                key={item.id}
                style={{
                  "--gallery-object-position": item.objectPosition,
                  "--gallery-object-fit": item.objectFit,
                }}
              >
                <img src={item.image} alt={item.alt} loading="lazy" />
                <div className="studio-gallery-overlay editorial-gallery-overlay">
                  <span>{item.category}</span>
                  <h3>{item.title}</h3>
                </div>
              </article>
            ))}
          </div>

          <div className="studio-gallery-mobile-action">
            <Link to="/gallery" className="secondary-button">
              View Full Gallery
              <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="studio-section studio-process-section">
        <div className="container">
          <div className="studio-section-heading">
            <div className="studio-section-kicker">
              <Zap size={15} />
              <span>Simple Process</span>
            </div>
            <h2>From requirement to final result.</h2>
            <p>
              A clear, personal process that keeps your photos and preferences
              at the center.
            </p>
          </div>

          <div className="studio-process-grid">
            {processSteps.map((step, index) => {
              const StepIcon = step.icon;

              return (
                <article className="studio-process-card" key={step.number}>
                  <div className="studio-process-top">
                    <span className="studio-process-icon">
                      <StepIcon size={23} />
                    </span>
                    <span className="studio-process-number">{step.number}</span>
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                  {index < processSteps.length - 1 && (
                    <span className="studio-process-line" aria-hidden="true" />
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="studio-section studio-testimonials-section">
        <div className="container">
          <div className="studio-section-heading">
            <div className="studio-section-kicker">
              <Star size={15} />
              <span>Customer Stories</span>
            </div>
            <h2>Trusted for the moments that matter.</h2>
            <p>Serving customers with care, quality and timely delivery.</p>
          </div>

          <div className="studio-testimonials-grid">
            {testimonials.map((testimonial) => (
              <article className="studio-testimonial-card" key={testimonial.name}>
                <div className="studio-testimonial-top">
                  <Quote size={28} />
                  <div aria-label="5 out of 5 stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={13} fill="currentColor" />
                    ))}
                  </div>
                </div>

                <p>“{testimonial.review}”</p>

                <div className="studio-testimonial-author">
                  <span>{testimonial.name.charAt(0)}</span>
                  <div>
                    <strong>{testimonial.name}</strong>
                    <small>{testimonial.service}</small>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="studio-cta-section">
        <div className="container">
          <div className="studio-cta-panel">
            <div className="studio-cta-grid" aria-hidden="true" />
            <div className="studio-cta-orb studio-cta-orb-purple" aria-hidden="true" />
            <div className="studio-cta-orb studio-cta-orb-cyan" aria-hidden="true" />

            <div className="studio-cta-icon">
              <Camera size={28} />
            </div>

            <div className="studio-cta-copy">
              <span>Let’s create something meaningful</span>
              <h2>Ready to Turn Your Photos Into Beautiful Memories?</h2>
              <p>
                Book your service with Kushi Digitals and get premium studio
                support for photos, frames, PAN cards and travel bookings.
              </p>
            </div>

            <div className="studio-cta-actions">
              <Link to="/book-service" className="primary-button">
                Book a Service
                <ArrowRight size={18} />
              </Link>
              <Link to="/contact" className="secondary-button">
                <MessageCircle size={17} />
                Contact Studio
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
