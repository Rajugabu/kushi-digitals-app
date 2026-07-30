import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import SEO from "../../components/SEO";
import {
  businessDetails,
  createWhatsAppLink,
} from "../../config/business";
import { servicesData } from "../../config/services";

const initialEnquiry = {
  name: "",
  phone: "",
  email: "",
  service: "",
  message: "",
};

const faqs = [
  {
    question: "Can I book a service online?",
    answer:
      "Yes. Select Book a Service, choose the required service and submit the details.",
  },
  {
    question: "Can I upload multiple photos?",
    answer:
      "Yes. Supported services allow up to 10 files, with a maximum of 10 MB per file.",
  },
  {
    question: "How will I receive completed files?",
    answer:
      "Digital files are available through the customer order workflow. Physical items can be collected or delivered when supported.",
  },
  {
    question: "Will the final price always be shown immediately?",
    answer:
      "Configured services show live pricing. Some requirements may need confirmation after review.",
  },
];

const contactMethods = [
  {
    icon: MessageCircle,
    eyebrow: "WhatsApp",
    label: "Chat on WhatsApp",
    value: businessDetails.whatsappDisplay,
    href: businessDetails.whatsappUrl,
    external: true,
    tone: "whatsapp",
  },
  {
    icon: Phone,
    eyebrow: "Phone Call",
    label: "Call Kushi Digitals",
    value: businessDetails.phoneDisplay,
    href: businessDetails.phoneHref,
    tone: "phone",
  },
  {
    icon: Mail,
    eyebrow: "Email",
    label: "Email Support",
    value: businessDetails.email,
    href: businessDetails.emailHref,
    tone: "email",
  },
  {
    icon: MapPin,
    eyebrow: "Studio Visit",
    label: "Visit Our Studio",
    value: businessDetails.address.display,
    href: businessDetails.mapsUrl,
    external: true,
    tone: "location",
  },
];

function validateEnquiry(enquiry) {
  const errors = {};
  const compactPhone = enquiry.phone.replace(
    /[\s()-]/g,
    "",
  );

  if (enquiry.name.trim().length < 2) {
    errors.name = "Please enter your full name.";
  }

  if (
    !/^(?:\+91|91)?[6-9]\d{9}$/.test(
      compactPhone,
    )
  ) {
    errors.phone =
      "Enter a valid 10-digit Indian mobile number.";
  }

  if (
    enquiry.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      enquiry.email.trim(),
    )
  ) {
    errors.email =
      "Enter a valid email address or leave it blank.";
  }

  if (!enquiry.service) {
    errors.service =
      "Please choose a service or General Enquiry.";
  }

  if (enquiry.message.trim().length < 10) {
    errors.message =
      "Please add a few details about your requirement.";
  }

  return errors;
}

function createEnquiryMessage(enquiry) {
  return [
    "Hello Kushi Digitals,",
    "",
    "I would like to enquire about a service.",
    "",
    `Name: ${enquiry.name.trim()}`,
    `Phone: ${enquiry.phone.trim()}`,
    enquiry.email.trim()
      ? `Email: ${enquiry.email.trim()}`
      : null,
    `Selected Service: ${enquiry.service}`,
    "",
    "Message:",
    enquiry.message.trim(),
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function Contact() {
  const [enquiry, setEnquiry] =
    useState(initialEnquiry);
  const [fieldErrors, setFieldErrors] =
    useState({});
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submissionLockRef = useRef(false);

  const directWhatsAppUrl = createWhatsAppLink(
    "Hello Kushi Digitals, I would like guidance about your studio services.",
  );

  function handleInputChange(event) {
    const { name, value } = event.target;

    setEnquiry((currentEnquiry) => ({
      ...currentEnquiry,
      [name]: value,
    }));
    setFieldErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[name];
      return nextErrors;
    });
    setSubmitted(false);
  }

  function getValidatedMessage() {
    const errors = validateEnquiry(enquiry);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return null;
    }

    return createEnquiryMessage(enquiry);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (submissionLockRef.current) {
      return;
    }

    const message = getValidatedMessage();

    if (!message) {
      return;
    }

    submissionLockRef.current = true;
    setIsSubmitting(true);
    setSubmitted(true);

    window.open(
      createWhatsAppLink(message),
      "_blank",
      "noopener,noreferrer",
    );

    window.setTimeout(() => {
      submissionLockRef.current = false;
      setIsSubmitting(false);
    }, 700);
  }

  function handleEmailEnquiry() {
    const message = getValidatedMessage();

    if (!message) {
      return;
    }

    const subject = `Kushi Digitals enquiry: ${enquiry.service}`;
    window.location.href = `${
      businessDetails.emailHref
    }?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(message)}`;
    setSubmitted(true);
  }

  return (
    <main className="contact-premium-page">
      <SEO
        title="Contact Kushi Digitals | Call, WhatsApp or Visit"
        description="Contact Kushi Digitals for passport photos, photo frames, restoration, PAN card assistance, travel ticket booking and print support."
      />

      <section
        className="contact-page-hero"
        aria-labelledby="contact-hero-title"
      >
        <div
          className="contact-page-glow contact-page-glow--purple"
          aria-hidden="true"
        />
        <div
          className="contact-page-glow contact-page-glow--cyan"
          aria-hidden="true"
        />

        <div className="container contact-page-hero-grid">
          <div>
            <span className="contact-page-eyebrow">
              <Sparkles size={15} aria-hidden="true" />
              Contact Kushi Digitals
            </span>
            <h1 id="contact-hero-title">
              Let’s Discuss Your
              <span>Requirement</span>
            </h1>
            <p>
              Contact Kushi Digitals for passport photos,
              photo frames, restoration, PAN card assistance,
              travel ticket booking and print or lamination
              services.
            </p>
            <div className="contact-page-actions">
              <a
                className="primary-button"
                href={directWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle
                  size={18}
                  aria-hidden="true"
                />
                WhatsApp Us
              </a>
              <a
                className="secondary-button"
                href={businessDetails.phoneHref}
              >
                <Phone size={18} aria-hidden="true" />
                Call Studio
              </a>
            </div>
          </div>

          <aside className="contact-page-hero-panel">
            <div className="contact-page-hero-icon">
              <Camera size={36} aria-hidden="true" />
            </div>
            <span>Direct Studio Support</span>
            <strong>{businessDetails.name}</strong>
            <p>{businessDetails.tagline}</p>
            <div>
              <CheckCircle2
                size={18}
                aria-hidden="true"
              />
              Clear guidance for all six services
            </div>
            <div>
              <CheckCircle2
                size={18}
                aria-hidden="true"
              />
              Call, WhatsApp, email or visit
            </div>
          </aside>
        </div>
      </section>

      <section
        className="contact-page-section"
        aria-labelledby="contact-methods-title"
      >
        <div className="container">
          <header className="contact-page-heading">
            <span className="contact-page-eyebrow">
              Reach the Studio
            </span>
            <h2 id="contact-methods-title">
              Choose the Contact Method That Suits You
            </h2>
          </header>

          <div className="contact-page-method-grid">
            {contactMethods.map((method) => {
              const Icon = method.icon;

              return (
                <a
                  className={`contact-page-method-card contact-page-method-card--${method.tone}`}
                  href={method.href}
                  target={
                    method.external
                      ? "_blank"
                      : undefined
                  }
                  rel={
                    method.external
                      ? "noopener noreferrer"
                      : undefined
                  }
                  key={method.eyebrow}
                >
                  <div>
                    <Icon size={23} aria-hidden="true" />
                  </div>
                  <span>{method.eyebrow}</span>
                  <strong>{method.label}</strong>
                  <p>{method.value}</p>
                  <ArrowRight
                    size={17}
                    aria-hidden="true"
                  />
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section
        className="contact-page-section contact-page-section--tinted"
        aria-labelledby="contact-form-title"
      >
        <div className="container contact-page-main-grid">
          <div className="contact-page-form-card">
            <header>
              <span className="contact-page-eyebrow">
                Send Your Enquiry
              </span>
              <h2 id="contact-form-title">
                Tell Us How We Can Help
              </h2>
              <p>
                Your details stay in this form until you choose
                WhatsApp or email. No enquiry is silently saved
                to a database.
              </p>
            </header>

            {submitted && (
              <div
                className="contact-page-success"
                role="status"
              >
                <CheckCircle2
                  size={19}
                  aria-hidden="true"
                />
                Your enquiry is ready in the selected contact
                app. Please send it to Kushi Digitals.
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="contact-page-form-grid">
                <div className="form-field">
                  <label htmlFor="contact-name">
                    Full Name
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    value={enquiry.name}
                    onChange={handleInputChange}
                    autoComplete="name"
                    placeholder="Enter your full name"
                    aria-invalid={Boolean(
                      fieldErrors.name,
                    )}
                    aria-describedby={
                      fieldErrors.name
                        ? "contact-name-error"
                        : undefined
                    }
                  />
                  {fieldErrors.name && (
                    <small
                      className="form-field-error"
                      id="contact-name-error"
                    >
                      {fieldErrors.name}
                    </small>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="contact-phone">
                    Phone Number
                  </label>
                  <input
                    id="contact-phone"
                    name="phone"
                    type="tel"
                    value={enquiry.phone}
                    onChange={handleInputChange}
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+91 98765 43210"
                    aria-invalid={Boolean(
                      fieldErrors.phone,
                    )}
                    aria-describedby={
                      fieldErrors.phone
                        ? "contact-phone-error"
                        : undefined
                    }
                  />
                  {fieldErrors.phone && (
                    <small
                      className="form-field-error"
                      id="contact-phone-error"
                    >
                      {fieldErrors.phone}
                    </small>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="contact-email">
                    Email Address
                    <span>Optional</span>
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    value={enquiry.email}
                    onChange={handleInputChange}
                    autoComplete="email"
                    placeholder="name@example.com"
                    aria-invalid={Boolean(
                      fieldErrors.email,
                    )}
                    aria-describedby={
                      fieldErrors.email
                        ? "contact-email-error"
                        : undefined
                    }
                  />
                  {fieldErrors.email && (
                    <small
                      className="form-field-error"
                      id="contact-email-error"
                    >
                      {fieldErrors.email}
                    </small>
                  )}
                </div>

                <div className="form-field">
                  <label htmlFor="contact-service">
                    Service Interested In
                  </label>
                  <select
                    id="contact-service"
                    name="service"
                    value={enquiry.service}
                    onChange={handleInputChange}
                    aria-invalid={Boolean(
                      fieldErrors.service,
                    )}
                    aria-describedby={
                      fieldErrors.service
                        ? "contact-service-error"
                        : undefined
                    }
                  >
                    <option value="">
                      Choose a service
                    </option>
                    {servicesData.map((service) => (
                      <option
                        value={service.name}
                        key={service.id}
                      >
                        {service.name}
                      </option>
                    ))}
                    <option value="General Enquiry">
                      General Enquiry
                    </option>
                  </select>
                  {fieldErrors.service && (
                    <small
                      className="form-field-error"
                      id="contact-service-error"
                    >
                      {fieldErrors.service}
                    </small>
                  )}
                </div>

                <div className="form-field contact-page-full-field">
                  <label htmlFor="contact-message">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows="6"
                    value={enquiry.message}
                    onChange={handleInputChange}
                    placeholder="Tell us what service or guidance you need..."
                    aria-invalid={Boolean(
                      fieldErrors.message,
                    )}
                    aria-describedby={
                      fieldErrors.message
                        ? "contact-message-error"
                        : undefined
                    }
                  />
                  {fieldErrors.message && (
                    <small
                      className="form-field-error"
                      id="contact-message-error"
                    >
                      {fieldErrors.message}
                    </small>
                  )}
                </div>
              </div>

              <div className="contact-page-form-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isSubmitting}
                >
                  <Send size={18} aria-hidden="true" />
                  {isSubmitting
                    ? "Opening WhatsApp..."
                    : "Send via WhatsApp"}
                </button>
                <button
                  type="button"
                  className="contact-page-email-button"
                  onClick={handleEmailEnquiry}
                  disabled={isSubmitting}
                >
                  <Mail size={18} aria-hidden="true" />
                  Email Enquiry
                </button>
                <Link
                  className="secondary-button"
                  to="/book-service"
                >
                  Book a Service
                </Link>
              </div>
            </form>
          </div>

          <aside className="contact-page-studio-column">
            <article className="contact-page-studio-card">
              <div className="contact-page-studio-heading">
                <Camera size={25} aria-hidden="true" />
                <div>
                  <strong>{businessDetails.name}</strong>
                  <span>{businessDetails.tagline}</span>
                </div>
              </div>

              <div className="contact-page-studio-services">
                <span>Services</span>
                {servicesData.map((service) => (
                  <div key={service.id}>
                    <CheckCircle2
                      size={16}
                      aria-hidden="true"
                    />
                    {service.name}
                  </div>
                ))}
              </div>

              <div className="contact-page-studio-contact">
                <a href={businessDetails.phoneHref}>
                  <Phone size={17} aria-hidden="true" />
                  {businessDetails.phoneDisplay}
                </a>
                <a href={businessDetails.emailHref}>
                  <Mail size={17} aria-hidden="true" />
                  {businessDetails.email}
                </a>
                <p>
                  <MapPin size={17} aria-hidden="true" />
                  {businessDetails.address.display}
                </p>
              </div>
            </article>

            <article className="contact-page-hours-card">
              <Clock size={23} aria-hidden="true" />
              <div>
                <span>Business Hours</span>
                <strong>
                  {businessDetails.businessHours.days}
                </strong>
                <p>
                  {businessDetails.businessHours.time}
                </p>
                <small>
                  Studio timings may vary. Contact us before
                  visiting.
                </small>
              </div>
            </article>
          </aside>
        </div>
      </section>

      <section
        className="contact-page-section"
        aria-labelledby="contact-location-title"
      >
        <div className="container contact-page-location">
          <div className="contact-page-location-icon">
            <MapPin size={34} aria-hidden="true" />
          </div>
          <div>
            <span className="contact-page-eyebrow">
              Studio Location
            </span>
            <h2 id="contact-location-title">
              Reddykancheru, Vizianagaram District
            </h2>
            <p>{businessDetails.address.display}</p>
          </div>
          <a
            className="secondary-button"
            href={businessDetails.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Get Directions
            <ArrowRight size={18} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section
        className="contact-page-section contact-page-section--tinted"
        aria-labelledby="contact-faq-title"
      >
        <div className="container">
          <header className="contact-page-heading">
            <span className="contact-page-eyebrow">
              Quick Help
            </span>
            <h2 id="contact-faq-title">
              Common Questions Before You Contact Us
            </h2>
          </header>

          <div className="contact-page-faq-grid">
            {faqs.map((faq) => (
              <article key={faq.question}>
                <FileText size={21} aria-hidden="true" />
                <h3>{faq.question}</h3>
                <p>{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="contact-page-section contact-page-cta-section">
        <div className="container">
          <div className="contact-page-final-cta">
            <div>
              <span className="contact-page-eyebrow">
                <ShieldCheck
                  size={15}
                  aria-hidden="true"
                />
                Direct Guidance
              </span>
              <h2>Ready to Get Started?</h2>
              <p>
                Choose a service or contact Kushi Digitals
                directly for guidance.
              </p>
            </div>
            <div className="contact-page-actions">
              <Link
                className="primary-button"
                to="/book-service"
              >
                Book a Service
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a
                className="secondary-button"
                href={directWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle
                  size={18}
                  aria-hidden="true"
                />
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Contact;
