import { useState } from "react";
import {
  Clock,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";

import PageHero from "../../components/PageHero";

import {
  businessDetails,
  createWhatsAppLink,
} from "../../config/business";

function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("name");
    const phone = formData.get("phone");
    const service = formData.get("service");
    const message = formData.get("message");

    const whatsappMessage = `
Hello Kushi Digitals,

I would like to enquire about your service.

Name: ${name}
Phone Number: ${phone}
Required Service: ${service}

Requirement:
${message}

Please contact me with further details.
    `.trim();

    const whatsappUrl =
      createWhatsAppLink(whatsappMessage);

    setSubmitted(true);

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer",
    );

    form.reset();
  };

  const directWhatsAppMessage =
    "Hello Kushi Digitals, I would like to know more about your photography and digital services.";

  return (
    <>
      <PageHero
        eyebrow="Contact Kushi Digitals"
        title="Let’s Create Something"
        highlight="Beautiful Together"
        description="Tell us about your photo, frame, album or digital-service requirement. We will guide you through the next step."
      />

      <section className="page-section">
        <div className="container contact-grid">
          <div className="contact-information">
            <div className="contact-intro">
              <span>We are here to help</span>

              <h2>Contact Our Studio</h2>

              <p>
                Reach us directly through phone,
                WhatsApp or email. You can also submit
                your requirement using the form.
              </p>
            </div>

            <div className="contact-card-list">
              <a
                href={businessDetails.phoneHref}
                className="contact-card"
              >
                <div className="contact-card-icon">
                  <Phone size={23} />
                </div>

                <div>
                  <span>Call Us</span>

                  <strong>
                    {businessDetails.phoneDisplay}
                  </strong>

                  <small>
                    Speak directly with our studio
                  </small>
                </div>
              </a>

              <a
                href={createWhatsAppLink(
                  directWhatsAppMessage,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-card"
              >
                <div className="contact-card-icon whatsapp">
                  <MessageCircle size={23} />
                </div>

                <div>
                  <span>WhatsApp</span>

                  <strong>
                    {businessDetails.whatsappDisplay}
                  </strong>

                  <small>
                    Send your photo and requirement
                  </small>
                </div>
              </a>

              <a
                href={businessDetails.emailHref}
                className="contact-card"
              >
                <div className="contact-card-icon">
                  <Mail size={23} />
                </div>

                <div>
                  <span>Email</span>

                  <strong>
                    {businessDetails.email}
                  </strong>

                  <small>
                    For detailed enquiries
                  </small>
                </div>
              </a>

              <div className="contact-card">
                <div className="contact-card-icon">
                  <MapPin size={23} />
                </div>

                <div>
                  <span>Studio Location</span>

                  <strong>
                    {businessDetails.address.village},{" "}
                    {businessDetails.address.mandal}
                  </strong>

                  <small>
                    {businessDetails.address.district},{" "}
                    {businessDetails.address.state} –{" "}
                    {businessDetails.address.pincode}
                  </small>
                </div>
              </div>
            </div>

            <div className="business-hours">
              <Clock size={21} />

              <div>
                <strong>Business Hours</strong>

                <span>
                  {businessDetails.businessHours.days}:{" "}
                  {businessDetails.businessHours.time}
                </span>
              </div>
            </div>
          </div>

          <div className="contact-form-card">
            <div className="form-heading">
              <span>Send Your Requirement</span>

              <h2>How Can We Help You?</h2>

              <p>
                Complete the form and click Submit.
                Your details will open directly in
                WhatsApp, ready to send to Kushi
                Digitals.
              </p>
            </div>

            {submitted && (
              <div className="form-success">
                Your requirement has been prepared
                successfully. Please send the opened
                WhatsApp message to Kushi Digitals.
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="name">
                    Full Name
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="phone">
                    Phone Number
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="Enter phone number"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                  />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="service">
                  Select Service
                </label>

                <select
                  id="service"
                  name="service"
                  required
                  defaultValue=""
                >
                  <option
                    value=""
                    disabled
                  >
                    Choose a service
                  </option>

                  <option value="Passport Photos">
                    Passport Photos
                  </option>

                  <option value="Photo Restoration">
                    Photo Restoration
                  </option>

                  <option value="Premium Photo Frames">
                    Premium Photo Frames
                  </option>

                  <option value="Album Designing">
                    Album Designing
                  </option>

                  <option value="Professional Photography">
                    Professional Photography
                  </option>

                  <option value="Digital Photo Services">
                    Digital Photo Services
                  </option>

                  <option value="Other Service">
                    Other Service
                  </option>
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="message">
                  Your Requirement
                </label>

                <textarea
                  id="message"
                  name="message"
                  rows="6"
                  placeholder="Explain what service you need..."
                  required
                />
              </div>

              <button
                type="submit"
                className="primary-button form-button"
              >
                Submit Through WhatsApp
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}

export default Contact;