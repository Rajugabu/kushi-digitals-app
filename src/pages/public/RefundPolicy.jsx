import { RefreshCcw } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "../../components/SEO";
import { businessDetails } from "../../config/business";

function RefundPolicy() {
  return (
    <main className="legal-page">
      <SEO
        title="Cancellation & Refund Policy | Kushi Digitals"
        description="Cancellation and Refund Policy for Kushi Digitals services, Studio Credits, AI Design Studio and online payments."
      />

      <section className="legal-hero">
        <div className="container">
          <div className="legal-hero-icon">
            <RefreshCcw size={30} />
          </div>

          <span>Payments & Refunds</span>
          <h1>Cancellation & Refund Policy</h1>

          <p>
            This policy explains the cancellation, refund,
            duplicate payment and Studio Credit restoration
            rules applicable to Kushi Digitals services.
          </p>

          <small>Effective date: 5 August 2026</small>
        </div>
      </section>

      <section className="legal-content">
        <div className="container legal-content-card">

          <section>
            <h2>1. General Policy</h2>
            <p>
              Refund eligibility depends on the type of
              service, payment status and whether processing
              has already started or been completed.
            </p>

            <p>
              Customers are encouraged to verify service
              details, uploaded photos, pricing and credit
              requirements before confirming a purchase or
              generation.
            </p>
          </section>

          <section>
            <h2>2. Studio Credit Purchases</h2>
            <p>
              Studio Credits purchased through Kushi Digitals
              are digital service credits used for eligible
              Design Studio generations.
            </p>

            <p>
              Once purchased and successfully credited to a
              customer account, Studio Credits are generally
              non-refundable except where required by
              applicable law or where Kushi Digitals confirms
              a genuine payment or technical issue.
            </p>

            <p>
              Studio Credits cannot normally be exchanged for
              cash, transferred to another account or
              withdrawn.
            </p>
          </section>

          <section>
            <h2>3. Successful AI Generations</h2>
            <p>
              When an AI generation completes successfully
              and an output is produced, the credits used for
              that generation are considered consumed.
            </p>

            <p>
              Refunds or credit restoration are normally not
              provided solely because a customer prefers a
              different artistic result, background, styling
              or interpretation.
            </p>

            <p>
              AI-generated images may vary and customers
              should review the selected style, uploaded
              content and output settings before confirming
              generation.
            </p>
          </section>

          <section>
            <h2>4. Failed AI Generations</h2>
            <p>
              If a Design Studio generation fails because of
              a verified technical error before successful
              completion, the applicable reserved Studio
              Credits may be automatically restored or
              manually corrected after review.
            </p>

            <p>
              Examples may include confirmed server,
              provider, storage or processing failures where
              no successful generation was delivered.
            </p>
          </section>

          <section>
            <h2>5. Duplicate Payments</h2>
            <p>
              If the same purchase is accidentally charged
              more than once, please contact Kushi Digitals
              with the relevant payment details.
            </p>

            <p>
              After verification, a confirmed duplicate
              transaction may be refunded or otherwise
              corrected as appropriate.
            </p>
          </section>

          <section>
            <h2>6. Payment Successful but Credits Not Added</h2>
            <p>
              If your payment is successfully debited but the
              corresponding Studio Credits are not added,
              please do not immediately make another payment.
            </p>

            <p>
              Contact Kushi Digitals with the payment
              reference and account details. We will verify
              the transaction and, where confirmed, either
              add the purchased credits or process an
              appropriate correction.
            </p>
          </section>

          <section>
            <h2>7. Failed or Pending Payments</h2>
            <p>
              If a payment fails or remains pending, the
              amount may be automatically reversed by the
              payment provider or issuing bank according to
              their applicable timelines.
            </p>

            <p>
              Kushi Digitals cannot guarantee banking
              reversal timelines that are controlled by
              banks, card networks, UPI providers or payment
              gateways.
            </p>
          </section>

          <section>
            <h2>8. Physical and Studio Services</h2>
            <p>
              For photography, printing, photo frames,
              restoration or other manually processed
              services, cancellation eligibility may depend
              on whether work, printing, material preparation
              or production has already started.
            </p>

            <p>
              If work has not started, a cancellation request
              may be reviewed. Once customized work or
              production has begun, cancellation or refund
              may not be available for the processed portion
              of the service.
            </p>
          </section>

          <section>
            <h2>9. Customized Products</h2>
            <p>
              Personalized photo products, custom prints,
              frames, edited images and similar customized
              items are produced specifically for the
              customer.
            </p>

            <p>
              Refunds are normally not provided for correctly
              completed customized products solely because of
              a change of mind.
            </p>

            <p>
              If there is a verified production defect or
              Kushi Digitals error, please contact us so the
              matter can be reviewed and an appropriate
              correction can be offered.
            </p>
          </section>

          <section>
            <h2>10. How to Request a Refund or Correction</h2>
            <p>
              Contact us as soon as possible and provide:
            </p>

            <ul>
              <li>Your name and registered phone or email.</li>
              <li>Order or payment reference, where available.</li>
              <li>Date and amount of the transaction.</li>
              <li>A short explanation of the issue.</li>
              <li>
                Screenshots or other supporting information
                where reasonably required.
              </li>
            </ul>
          </section>

          <section>
            <h2>11. Refund Processing</h2>
            <p>
              Approved monetary refunds will normally be
              initiated to the original payment method where
              supported.
            </p>

            <p>
              After a refund is initiated, the time required
              for the amount to appear in the customer's
              account may depend on the payment provider,
              bank or payment method.
            </p>
          </section>

          <section>
            <h2>12. Credit Restoration</h2>
            <p>
              Where a technical issue qualifies for Studio
              Credit restoration, credits may be returned to
              the customer's Kushi Digitals account instead
              of issuing a monetary refund for the individual
              generation.
            </p>
          </section>

          <section>
            <h2>13. Abuse and Fraud Prevention</h2>
            <p>
              Refund, cancellation or credit restoration
              requests may be declined where there is
              evidence of fraud, intentional abuse, repeated
              misuse or violation of our Terms & Conditions.
            </p>
          </section>

          <section>
            <h2>14. Contact Us</h2>
            <p>
              For payment, cancellation, refund or credit
              issues, contact:
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

            <Link to="/terms">
              Terms & Conditions
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

export default RefundPolicy;