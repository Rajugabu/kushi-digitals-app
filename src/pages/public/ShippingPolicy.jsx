import { Truck } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";
import { businessDetails } from "../../config/business";

function ShippingPolicy() {
  return (
    <main className="legal-page">
      <SEO
        title="Shipping & Delivery Policy | Kushi Digitals"
        description="Shipping and Delivery Policy for Kushi Digitals digital files, AI-generated images, photo prints, frames and studio services."
      />

      <section className="legal-hero">
        <div className="container">
          <div className="legal-hero-icon">
            <Truck size={30} />
          </div>

          <span>Delivery Information</span>
          <h1>Shipping & Delivery Policy</h1>

          <p>
            This policy explains how digital files,
            AI-generated images and eligible physical
            products are delivered by Kushi Digitals.
          </p>

          <small>Effective date: 5 August 2026</small>
        </div>
      </section>

      <section className="legal-content">
        <div className="container legal-content-card">

          <section>
            <h2>1. Digital Services</h2>
            <p>
              Kushi Digitals provides several digital
              services including AI-generated images, photo
              editing, restoration and other digital outputs.
            </p>

            <p>
              Digital products do not require physical
              shipping.
            </p>
          </section>

          <section>
            <h2>2. AI Design Studio Delivery</h2>
            <p>
              When an AI Design Studio generation completes
              successfully, the generated image is normally
              made available through the website for viewing
              and download.
            </p>

            <p>
              Customers are encouraged to download and keep
              their own copy of completed files promptly.
            </p>
          </section>

          <section>
            <h2>3. Digital Delivery Time</h2>
            <p>
              AI-generated images are generally processed
              automatically after the customer confirms the
              generation.
            </p>

            <p>
              Processing time may vary depending on image
              complexity, internet connectivity, AI provider
              availability, storage services or other
              technical factors.
            </p>
          </section>

          <section>
            <h2>4. Other Digital Orders</h2>
            <p>
              Photo editing, restoration and other manually
              processed digital services may require
              additional processing time.
            </p>

            <p>
              Where applicable, the estimated completion time
              will be communicated to the customer when the
              service is accepted or reviewed.
            </p>
          </section>

          <section>
            <h2>5. Physical Products</h2>
            <p>
              Certain Kushi Digitals services may involve
              physical products such as photo prints, photo
              frames, albums, laminated documents or other
              customized items.
            </p>

            <p>
              Availability of pickup, local delivery or
              courier delivery may depend on the product,
              customer location and service selected.
            </p>
          </section>

          <section>
            <h2>6. Studio Pickup</h2>
            <p>
              Where studio pickup is selected or agreed,
              customers may collect completed physical
              products from Kushi Digitals after receiving
              confirmation that the order is ready.
            </p>

            <div className="legal-contact-box">
              <strong>{businessDetails.name}</strong>
              <span>{businessDetails.address.display}</span>
              <a href={businessDetails.phoneHref}>
                {businessDetails.phoneDisplay}
              </a>
            </div>
          </section>

          <section>
            <h2>7. Local Delivery</h2>
            <p>
              Local delivery may be available for eligible
              orders depending on location, order value,
              product type and current service availability.
            </p>

            <p>
              Any applicable delivery charge and estimated
              delivery time will be communicated before
              dispatch or confirmation where required.
            </p>
          </section>

          <section>
            <h2>8. Courier or Shipping</h2>
            <p>
              If courier or shipping is offered for a
              particular physical order, the applicable
              delivery details, charges and estimated
              timeline will be communicated to the customer
              before dispatch.
            </p>

            <p>
              Delivery timelines provided by third-party
              courier services are estimates and may be
              affected by location, weather, holidays,
              transport disruptions or other circumstances
              outside our reasonable control.
            </p>
          </section>

          <section>
            <h2>9. Customer Information</h2>
            <p>
              Customers are responsible for providing an
              accurate name, phone number, address and other
              delivery information where physical delivery
              is required.
            </p>

            <p>
              Delivery delays or failures caused by
              incorrect or incomplete information may
              require additional coordination or charges.
            </p>
          </section>

          <section>
            <h2>10. Customized Products</h2>
            <p>
              Photo prints, frames, albums and other
              personalized products may require production
              time before they are ready for pickup or
              dispatch.
            </p>

            <p>
              Production timelines depend on the selected
              product, customization requirements and
              material availability.
            </p>
          </section>

          <section>
            <h2>11. Damaged or Incorrect Physical Orders</h2>
            <p>
              If a physical product is received with a
              verified production defect, damage or an
              incorrect item caused by Kushi Digitals,
              please contact us as soon as reasonably
              possible with supporting details.
            </p>

            <p>
              Eligible cases will be reviewed in accordance
              with our Cancellation & Refund Policy.
            </p>
          </section>

          <section>
            <h2>12. Contact Us</h2>
            <p>
              For questions regarding digital delivery,
              pickup or physical product delivery, contact:
            </p>

            <div className="legal-contact-box">
              <strong>{businessDetails.name}</strong>
              <span>{businessDetails.address.display}</span>

              <a href={businessDetails.phoneHref}>
                {businessDetails.phoneDisplay}
              </a>

              <a href={businessDetails.emailHref}>
                {businessDetails.email}
              </a>
            </div>
          </section>

          <div className="legal-footer-links">
            <Link to="/privacy-policy">
              Privacy Policy
            </Link>

            <Link to="/terms">
              Terms & Conditions
            </Link>

            <Link to="/refund-policy">
              Cancellation & Refund Policy
            </Link>

            <Link to="/contact">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ShippingPolicy;