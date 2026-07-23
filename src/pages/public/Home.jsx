import { Link } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Frame,
  Headphones,
  Image,
  Palette,
  Quote,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Upload,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import ServiceCard from "../../components/ServiceCard";
import { servicesData } from "../../config/services";


const processSteps = [
  {
    icon: Upload,
    number: "01",
    title: "Share Your Requirement",
    description:
      "Choose a service and upload your photos or explain what you need.",
  },
  {
    icon: Palette,
    number: "02",
    title: "We Create the Magic",
    description:
      "Our team carefully edits, designs and prepares your order.",
  },
  {
    icon: CheckCircle2,
    number: "03",
    title: "Review & Receive",
    description:
      "Review the result and receive your completed digital or printed order.",
  },
];

const testimonials = [
  {
    name: "Suresh Kumar",
    role: "Photo Restoration Customer",
    review:
      "My old family photo was almost completely damaged. Kushi Digitals restored it beautifully with natural details.",
  },
  {
    name: "Lakshmi",
    role: "Premium Frame Customer",
    review:
      "The frame quality and finishing were excellent. The ordering experience was simple and professional.",
  },
  {
    name: "Ravi Teja",
    role: "Album Design Customer",
    review:
      "Clean designs, good communication and timely delivery. The album looked premium and modern.",
  },
];

function Home() {
  return (
    <div className="home-page">
      <section className="hero-section">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />

        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <Sparkles size={16} />
              <span>Premium Photography & Digital Studio</span>
            </div>

            <h1 className="hero-title">
  <span className="hero-title-line">
    Turning Your Beautiful
  </span>

  <span className="hero-title-line">
    Moments Into
  </span>

  <span className="hero-title-line hero-title-highlight gradient-text">
    Timeless Memories.
  </span>
</h1>

            <p className="hero-description">
              Professional photography, photo restoration, passport
              photos, premium frames, album designing and modern digital
              services—all in one trusted place.
            </p>

            <div className="hero-actions">
              <Link to="/services" className="primary-button">
                Explore Services
                <ArrowRight size={19} />
              </Link>

              <Link to="/contact" className="secondary-button">
                Contact Studio
              </Link>
            </div>

            <div className="hero-trust-row">
              <div className="avatar-stack">
                <span className="customer-avatar">K</span>
                <span className="customer-avatar">S</span>
                <span className="customer-avatar">R</span>
                <span className="customer-avatar">+</span>
              </div>

              <div>
                <div className="trust-rating">
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                </div>

                <p>Trusted by happy local customers</p>
              </div>
            </div>
          </div>

          <div className="hero-visual" aria-label="Kushi Digitals services">
            <div className="visual-glow" />
            <div className="visual-orbit visual-orbit-one" />
            <div className="visual-orbit visual-orbit-two" />

            <div className="studio-preview-card">
              <div className="studio-card-header">
                <div>
                  <span className="studio-live-dot" />
                  <span>Creative Studio</span>
                </div>

                <Sparkles size={18} />
              </div>

              <div className="studio-camera-area">
                <div className="camera-ring camera-ring-outer">
                  <div className="camera-ring camera-ring-inner">
                    <Camera size={64} strokeWidth={1.5} />
                  </div>
                </div>

                <span className="focus-corner focus-top-left" />
                <span className="focus-corner focus-top-right" />
                <span className="focus-corner focus-bottom-left" />
                <span className="focus-corner focus-bottom-right" />
              </div>

              <div className="studio-card-footer">
                <div>
                  <span>Premium Quality</span>
                  <strong>Photo Perfection</strong>
                </div>

                <div className="quality-badge">
                  <ShieldCheck size={17} />
                  HD
                </div>
              </div>
            </div>

            <div className="floating-feature floating-feature-one">
              <div className="floating-feature-icon">
                <Sparkles size={20} />
              </div>
              <div>
                <span>Old Photo</span>
                <strong>Restored</strong>
              </div>
            </div>

            <div className="floating-feature floating-feature-two">
              <div className="floating-feature-icon cyan">
                <Frame size={20} />
              </div>
              <div>
                <span>Custom Frame</span>
                <strong>Ready</strong>
              </div>
            </div>

            <div className="floating-feature floating-feature-three">
              <div className="floating-feature-icon pink">
                <Zap size={20} />
              </div>
              <div>
                <span>Fast Service</span>
                <strong>Available</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="stats-strip">
        <div className="container stats-grid">
          <div className="stat-item">
            <strong>Premium</strong>
            <span>Studio Quality</span>
          </div>

          <div className="stat-item">
            <strong>Fast</strong>
            <span>Order Processing</span>
          </div>

          <div className="stat-item">
            <strong>Secure</strong>
            <span>Photo Handling</span>
          </div>

          <div className="stat-item">
            <strong>Friendly</strong>
            <span>Customer Support</span>
          </div>
        </div>
      </section>

      <section className="section-shell services-preview-section">
        <div className="container">
          <div className="section-heading">
            <div className="eyebrow">
              <Camera size={16} />
              <span>What We Do</span>
            </div>

            <h2>
              Everything Your Memories
              <span className="gradient-text"> Deserve</span>
            </h2>

            <p>
              Professional services designed with care, creativity and
              attention to every small detail.
            </p>
          </div>

          <div className="premium-service-grid premium-service-grid--home">
            {servicesData.slice(0, 6).map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                to={`/book-service?service=${encodeURIComponent(service.name)}`}
                actionLabel="Select Service"
                compact
              />
            ))}
          </div>

          <div className="section-action">
            <Link to="/services" className="secondary-button">
              View All Services
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section-shell process-section">
        <div className="container">
          <div className="section-heading">
            <div className="eyebrow">
              <Zap size={16} />
              <span>Simple Process</span>
            </div>

            <h2>
              From Your Photo To
              <span className="gradient-text"> Perfect Result</span>
            </h2>

            <p>
              A simple, transparent and customer-friendly ordering
              experience.
            </p>
          </div>

          <div className="process-grid">
            {processSteps.map((step) => {
              const Icon = step.icon;

              return (
                <article className="process-card" key={step.number}>
                  <span className="process-number">{step.number}</span>

                  <div className="process-icon">
                    <Icon size={27} />
                  </div>

                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-shell referral-section">
        <div className="container">
          <div className="referral-panel">
            <div className="referral-copy">
              <div className="eyebrow">
                <Share2 size={16} />
                <span>Refer & Earn</span>
              </div>

              <h2>
                Share Kushi Digitals.
                <span className="gradient-text">
                  {" "}
                  Earn Real Rewards.
                </span>
              </h2>

              <p>
                Create your referral account, share your unique link and
                earn commission when eligible customers successfully order
                our services.
              </p>

              <div className="referral-features">
                <div>
                  <CheckCircle2 size={18} />
                  Unique referral link
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  Transparent earnings
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  Wallet and withdrawals
                </div>
              </div>

              <Link to="/referral" className="primary-button">
                Explore Referral Program
                <ArrowRight size={19} />
              </Link>
            </div>

            <div className="referral-dashboard-preview">
              <div className="dashboard-preview-header">
                <div>
                  <span>Referral Dashboard</span>
                  <strong>Your Earnings</strong>
                </div>

                <div className="dashboard-status">
                  <span />
                  Active
                </div>
              </div>

              <div className="earnings-card">
                <span>Available Balance</span>
                <strong>₹0.00</strong>
                <small>Start sharing to earn rewards</small>
              </div>

              <div className="dashboard-mini-grid">
                <div>
                  <Users size={20} />
                  <span>Total Referrals</span>
                  <strong>0</strong>
                </div>

                <div>
                  <Wallet size={20} />
                  <span>Total Earnings</span>
                  <strong>₹0</strong>
                </div>
              </div>

              <div className="referral-link-preview">
                <span>Your referral link</span>

                <div>
                  <p>kushidigitals.com/ref/yourcode</p>
                  <Share2 size={17} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell testimonials-section">
        <div className="container">
          <div className="section-heading">
            <div className="eyebrow">
              <Star size={16} />
              <span>Customer Stories</span>
            </div>

            <h2>
              Trusted Work.
              <span className="gradient-text"> Happy Memories.</span>
            </h2>
          </div>

          <div className="testimonials-grid">
            {testimonials.map((testimonial) => (
              <article
                className="testimonial-card"
                key={testimonial.name}
              >
                <Quote className="quote-icon" size={31} />

                <div className="testimonial-stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} size={15} fill="currentColor" />
                  ))}
                </div>

                <p>“{testimonial.review}”</p>

                <div className="testimonial-author">
                  <span>{testimonial.name.charAt(0)}</span>

                  <div>
                    <strong>{testimonial.name}</strong>
                    <small>{testimonial.role}</small>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell final-cta-section">
        <div className="container">
          <div className="final-cta-panel">
            <div className="final-cta-icon">
              <Image size={35} />
            </div>

            <div>
              <span className="final-cta-label">
                Your memories deserve the best
              </span>

              <h2>Ready To Create Something Beautiful?</h2>

              <p>
                Contact Kushi Digitals and turn your photos into
                professionally finished memories.
              </p>
            </div>

            <div className="final-cta-actions">
              <Link to="/contact" className="primary-button">
                Get Started
                <ArrowRight size={18} />
              </Link>

              <div className="support-note">
                <Headphones size={18} />
                Friendly support available
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
