import { FileText } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";
import { businessDetails } from "../../config/business";

function Terms() {
  return (
    <main className="legal-page">
      <SEO
        title="Terms & Conditions | Kushi Digitals"
        description="Terms and Conditions for using Kushi Digitals services, AI Design Studio, Studio Credits, payments and digital services."
      />

      <section className="legal-hero">
        <div className="container">
          <div className="legal-hero-icon">
            <FileText size={30} />
          </div>

          <span>Legal & Service Terms</span>
          <h1>Terms & Conditions</h1>

          <p>
            These Terms & Conditions govern your use of the
            Kushi Digitals website, photography and digital
            services, AI Design Studio, Studio Credits and
            related services.
          </p>

          <small>Effective date: 5 August 2026</small>
        </div>
      </section>

      <section className="legal-content">
        <div className="container legal-content-card">

          <section>
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing our website, creating an account,
              purchasing Studio Credits, submitting an order,
              uploading content or using any Kushi Digitals
              service, you agree to these Terms & Conditions
              and our applicable policies.
            </p>
            <p>
              If you do not agree with these terms, please do
              not use the applicable service.
            </p>
          </section>

          <section>
            <h2>2. About Kushi Digitals</h2>
            <p>
              Kushi Digitals provides photography, photo
              editing, restoration, printing, lamination,
              digital assistance and AI-assisted image design
              services.
            </p>
            <p>
              Specific services, pricing and availability may
              change from time to time and will be displayed
              on the website or communicated before an order
              is confirmed.
            </p>
          </section>

          <section>
            <h2>3. Customer Accounts</h2>
            <p>
              Some features may require a customer account.
              You are responsible for providing accurate
              information and for maintaining the security of
              your account.
            </p>
            <p>
              You must not allow another person to misuse your
              account or use our services for fraudulent,
              illegal or unauthorized purposes.
            </p>
          </section>

          <section>
            <h2>4. Customer Content and Uploaded Photos</h2>
            <p>
              You may upload photographs, images and other
              files where supported by our services.
            </p>

            <p>
              By uploading content, you confirm that you own
              the content or have sufficient authorization,
              consent or permission to submit and process it.
            </p>

            <p>
              You grant Kushi Digitals and the technology
              providers required to deliver the requested
              service a limited permission to process the
              uploaded content solely for providing,
              operating, securing and supporting that
              service.
            </p>
          </section>

          <section>
            <h2>5. Prohibited Content and Use</h2>
            <p>
              Customers must not knowingly upload or request
              content that:
            </p>

            <ul>
              <li>Violates applicable law.</li>
              <li>
                Infringes copyrights, privacy rights or other
                rights of another person.
              </li>
              <li>
                Is submitted without required permission or
                authorization.
              </li>
              <li>
                Is intended for fraud, impersonation,
                deception or unlawful activity.
              </li>
              <li>
                Attempts to abuse, attack or interfere with
                our website, payment systems or technology
                providers.
              </li>
            </ul>

            <p>
              We may refuse, suspend or cancel processing
              where we reasonably believe a request violates
              these terms or applicable requirements.
            </p>
          </section>

          <section>
            <h2>6. AI Design Studio</h2>
            <p>
              The Kushi Digitals Design Studio uses
              AI-assisted technology to create images based
              on uploaded photos, selected styles and other
              instructions.
            </p>

            <p>
              AI-generated outputs are probabilistic and may
              not exactly reproduce every facial feature,
              object, colour, background or detail from the
              original image.
            </p>

            <p>
              Customers should review the generated result
              before using it for printing, publication,
              commercial purposes or any important use.
            </p>

            <p>
              A successful generation means the AI service
              completed processing and produced an output. It
              does not guarantee that every customer will
              prefer the artistic result.
            </p>
          </section>

          <section>
            <h2>7. Studio Credits</h2>
            <p>
              Certain Design Studio services require Studio
              Credits. The number of credits required for a
              generation is displayed before the customer
              confirms the generation.
            </p>

            <p>
              Studio Credits are service credits for use
              within eligible Kushi Digitals features. They
              are not money, a bank balance, a payment
              instrument or a transferable financial asset.
            </p>

            <p>
              Credits cannot normally be transferred between
              customers, exchanged for cash or withdrawn.
            </p>

            <p>
              If a generation fails due to a verified
              technical failure before successful completion,
              applicable reserved credits may be restored in
              accordance with our system and Refund Policy.
            </p>
          </section>

          <section>
            <h2>8. Pricing</h2>
            <p>
              Prices and credit requirements applicable to a
              service will be displayed before purchase or
              confirmation wherever technically supported.
            </p>

            <p>
              Prices may be updated for future purchases due
              to service costs, taxes, provider pricing or
              business requirements. Changes will not
              retrospectively alter a successfully completed
              transaction.
            </p>
          </section>

          <section>
            <h2>9. Payments</h2>
            <p>
              Online payments may be processed through
              authorized third-party payment providers such
              as Razorpay.
            </p>

            <p>
              Payment availability may depend on the payment
              method, issuing bank, payment provider and
              network conditions.
            </p>

            <p>
              A payment being initiated does not necessarily
              mean it has been successfully received. Orders
              or Studio Credits are confirmed only after the
              applicable payment is successfully verified by
              our systems.
            </p>
          </section>

          <section>
            <h2>10. Failed, Pending or Duplicate Payments</h2>
            <p>
              If a payment appears failed or pending, please
              avoid making repeated payments until the
              transaction status is reasonably confirmed.
            </p>

            <p>
              If we verify that the same purchase was charged
              more than once, we will review the duplicate
              transaction and take appropriate action in
              accordance with our Cancellation & Refund
              Policy.
            </p>
          </section>

          <section>
            <h2>11. Cancellations and Refunds</h2>
            <p>
              Eligibility for cancellations, refunds, credit
              restoration and duplicate-payment corrections
              is governed by our Cancellation & Refund
              Policy.
            </p>

            <p>
              Digital or AI services that have already been
              successfully processed may have different
              cancellation and refund conditions from
              services that have not yet started.
            </p>

            <Link to="/refund-policy">
              View Cancellation & Refund Policy
            </Link>
          </section>

          <section>
            <h2>12. Digital Delivery and Physical Services</h2>
            <p>
              AI-generated images and other digital outputs
              may be made available through the website or
              another supported digital delivery method.
            </p>

            <p>
              Physical products or studio services, where
              offered, may require collection from the studio
              or a separately agreed delivery arrangement.
            </p>

            <p>
              Applicable delivery information will be
              described in our Shipping / Delivery Policy.
            </p>
          </section>

          <section>
            <h2>13. Service Availability</h2>
            <p>
              We aim to provide reliable services, but
              availability may occasionally be affected by
              maintenance, internet connectivity, hosting,
              payment gateways, AI providers, storage
              providers or other technical dependencies.
            </p>

            <p>
              We may temporarily suspend or modify a feature
              where reasonably necessary for security,
              maintenance or service improvement.
            </p>
          </section>

          <section>
            <h2>14. Intellectual Property</h2>
            <p>
              The Kushi Digitals website, branding, original
              graphics, software interfaces and other
              proprietary website materials remain the
              property of their respective owners.
            </p>

            <p>
              Customers remain responsible for ensuring they
              have rights to the photos and other materials
              they submit.
            </p>
          </section>

          <section>
            <h2>15. Customer Responsibility</h2>
            <p>
              Customers are responsible for reviewing the
              details of their request, uploaded photographs,
              selected style, output ratio, price and credit
              requirement before confirming an order or
              generation.
            </p>

            <p>
              Customers should also keep their own backup of
              important original and completed files.
            </p>
          </section>

          <section>
            <h2>16. Limitation of Service Responsibility</h2>
            <p>
              To the extent permitted by applicable law,
              Kushi Digitals is not responsible for delays or
              interruptions caused by circumstances outside
              our reasonable control, including failures of
              third-party networks, payment providers,
              hosting platforms or AI providers.
            </p>

            <p>
              Nothing in these terms is intended to exclude
              any customer rights or obligations that cannot
              lawfully be excluded.
            </p>
          </section>

          <section>
            <h2>17. Privacy</h2>
            <p>
              Our collection and processing of customer
              information, uploaded photos and transaction
              information is described in our Privacy Policy.
            </p>

            <Link to="/privacy-policy">
              View Privacy Policy
            </Link>
          </section>

          <section>
            <h2>18. Changes to These Terms</h2>
            <p>
              We may update these Terms & Conditions when our
              services, pricing structure, technology or
              applicable requirements change.
            </p>

            <p>
              The latest version will be published on this
              page with the updated effective date.
            </p>
          </section>

          <section>
            <h2>19. Contact Us</h2>
            <p>
              For questions regarding these terms or our
              services, contact:
            </p>

            <div className="legal-contact-box">
              <strong>{businessDetails.name}</strong>

              <span>
                {businessDetails.address.display}
              </span>

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

export default Terms;