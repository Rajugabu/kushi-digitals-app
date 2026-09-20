import { Link } from "react-router-dom";
import {
  Camera,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
} from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaYoutube,
} from "react-icons/fa";

import {
  businessDetails,
  createWhatsAppLink,
} from "../config/business";
import { servicesData } from "../config/services";

const currentYear = new Date().getFullYear();

function Footer() {
  const footerWhatsAppMessage =
    "Hello Kushi Digitals, I visited your website and would like to know more about your studio services.";

  return (
    <footer className="site-footer">
      <div
        className="footer-top-glow"
        aria-hidden="true"
      />

      <div className="container footer-grid">
        <div className="footer-brand-column">
          <Link
            to="/"
            className="brand footer-brand"
          >
            <span className="brand-icon">
              <Camera size={25} />
            </span>

            <span className="brand-copy">
              <span className="brand-name">
                {businessDetails.name}
              </span>

              <span className="brand-tagline">
                Premium Service Studio
              </span>
            </span>
          </Link>

          <p className="footer-description">
            Passport photos, photo frames, restoration, PAN card
            assistance, travel booking, laminations and print support
            under one trusted studio.
          </p>

          <div className="social-links">
            <a
              href={businessDetails.socialLinks.instagram}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kushi Digitals Instagram"
              title="Instagram"
            >
              <FaInstagram size={19} />
            </a>

            <a
              href={businessDetails.socialLinks.facebook}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kushi Digitals Facebook"
              title="Facebook"
            >
              <FaFacebookF size={18} />
            </a>

            <a
              href={businessDetails.socialLinks.youtube}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Kushi Digitals YouTube"
              title="YouTube"
            >
              <FaYoutube size={20} />
            </a>
          </div>
        </div>

        <div className="footer-column">
          <h3>Explore</h3>

          <div className="footer-links">
            <Link to="/">Home</Link>
            <Link to="/services">Our Services</Link>
            <Link to="/gallery">Gallery</Link>
            <Link to="/studio">Design Studio</Link>
            <Link to="/blog">Blog</Link>
            <Link to="/about">About Us</Link>
            <Link to="/contact">Contact</Link>
          </div>
        </div>

        <div className="footer-column">
          <h3>Services</h3>

          <div className="footer-links">
            {servicesData.map((service) => (
              <Link
                to={`/book-service?service=${encodeURIComponent(service.name)}`}
                key={service.id}
              >
                {service.name}
              </Link>
            ))}
          </div>
        </div>

        <div className="footer-column">
          <h3>Contact</h3>

          <div className="footer-contact-list">
            <div className="footer-contact-item">
              <MapPin size={19} />

              <span>
                {businessDetails.address.village},
                <br />

                {businessDetails.address.mandal},
                <br />

                {businessDetails.address.district},
                <br />

                {businessDetails.address.state} –{" "}
                {businessDetails.address.pincode}
              </span>
            </div>

            <a
              className="footer-contact-item"
              href={businessDetails.phoneHref}
            >
              <Phone size={19} />

              <span>
                {businessDetails.phoneDisplay}
              </span>
            </a>

            <a
              className="footer-contact-item"
              href={businessDetails.emailHref}
            >
              <Mail size={19} />

              <span>{businessDetails.email}</span>
            </a>
          </div>

          <a
            href={createWhatsAppLink(
              footerWhatsAppMessage,
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-whatsapp-button"
          >
            <MessageCircle size={18} />
            Chat on WhatsApp
          </a>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>
          © {currentYear} {businessDetails.name}. All
          Rights Reserved.
        </p>

        <div className="footer-policy-links">
  <Link to="/privacy-policy">
    Privacy Policy
  </Link>

  <Link to="/terms">
    Terms & Conditions
  </Link>

  <Link to="/refund-policy">
    Cancellation & Refund Policy
  </Link>

  <Link to="/shipping-policy">
    Shipping & Delivery Policy
  </Link>

  <Link to="/account-deletion">
    Account &amp; Data Deletion
  </Link>
</div>
      </div>
    </footer>
  );
}

export default Footer;
