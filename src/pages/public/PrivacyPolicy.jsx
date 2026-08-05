import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import SEO from "../../components/SEO";
import { businessDetails } from "../../config/business";

function PrivacyPolicy() {
  return (
    <main className="legal-page">
      <SEO
        title="Privacy Policy | Kushi Digitals"
        description="Privacy Policy for Kushi Digitals, including customer accounts, uploaded photos, Design Studio, payments and digital services."
      />

      <section className="legal-hero">
        <div className="container">
          <div className="legal-hero-icon">
            <ShieldCheck size={30} />
          </div>

          <span>Legal & Privacy</span>
          <h1>Privacy Policy</h1>
          <p>
            This Privacy Policy explains how Kushi Digitals
            collects, uses, stores and protects information
            when you use our website, customer services and
            AI Design Studio.
          </p>

          <small>Effective date: 5 August 2026</small>
        </div>
      </section>

      <section className="legal-content">
        <div className="container legal-content-card">

          <section>
            <h2>1. About Kushi Digitals</h2>
            <p>
              Kushi Digitals is a photography and digital
              studio providing photography, photo editing,
              restoration, printing, digital services and
              AI-assisted image design services.
            </p>
          </section>

          <section>
            <h2>2. Information We May Collect</h2>
            <p>
              Depending on the service you use, we may
              collect information such as:
            </p>
            <ul>
              <li>Name, phone number and email address.</li>
              <li>Customer account and profile information.</li>
              <li>
                Service requests, order information and
                transaction references.
              </li>
              <li>
                Photos, images and files voluntarily uploaded
                for editing, printing, restoration or AI
                generation.
              </li>
              <li>
                Delivery, pickup or contact information when
                required for a service.
              </li>
              <li>
                Basic technical information necessary for
                website security and operation.
              </li>
            </ul>
          </section>

          <section>
            <h2>3. How We Use Your Information</h2>
            <p>We may use your information to:</p>
            <ul>
              <li>Provide and complete requested services.</li>
              <li>Maintain customer accounts and orders.</li>
              <li>
                Process uploaded photos and generate requested
                designs.
              </li>
              <li>
                Process payments and credit purchases.
              </li>
              <li>
                Communicate about orders, support requests and
                service updates.
              </li>
              <li>
                Prevent fraud, misuse and unauthorized access.
              </li>
              <li>
                Improve the security and reliability of our
                services.
              </li>
            </ul>
          </section>

          <section>
            <h2>4. Customer Photos and Uploaded Files</h2>
            <p>
              Photos and files uploaded to Kushi Digitals are
              used only to provide the service requested by
              the customer, such as editing, restoration,
              printing or AI-assisted design generation.
            </p>
            <p>
              Customers should upload only content they own
              or have permission to use. Uploaded content may
              be temporarily stored or processed using secure
              technology providers required to deliver the
              service.
            </p>
          </section>

          <section>
            <h2>5. AI Design Studio</h2>
            <p>
              When you use the Kushi Digitals Design Studio,
              uploaded images and selected design instructions
              may be securely sent to third-party AI service
              providers for the purpose of generating the
              requested output.
            </p>
            <p>
              AI-generated results may vary and are produced
              according to the selected style, uploaded
              content and service configuration.
            </p>
          </section>

          <section>
            <h2>6. Payments</h2>
            <p>
              Online payments may be processed through
              authorized payment service providers such as
              Razorpay.
            </p>
            <p>
              Kushi Digitals does not directly store your
              complete debit card, credit card, CVV, UPI PIN
              or internet banking credentials.
            </p>
            <p>
              We may retain payment references, transaction
              status, purchased credit information and other
              records required for accounting, support and
              fraud prevention.
            </p>
          </section>

          <section>
            <h2>7. Service Providers</h2>
            <p>
              We may use trusted technology providers to
              operate our services, including providers for:
            </p>
            <ul>
              <li>Website hosting and infrastructure.</li>
              <li>Authentication and secure databases.</li>
              <li>AI image processing and generation.</li>
              <li>Payment processing.</li>
              <li>Storage and delivery of digital files.</li>
            </ul>
            <p>
              Information is shared only as reasonably
              necessary to provide the requested service,
              maintain security or comply with applicable law.
            </p>
          </section>

          <section>
            <h2>8. Data Security</h2>
            <p>
              We use reasonable technical and organizational
              measures to protect customer information and
              uploaded files. However, no online system can
              guarantee absolute security.
            </p>
          </section>

          <section>
            <h2>9. Data Retention</h2>
            <p>
              We retain customer and transaction information
              only for as long as reasonably necessary for
              service delivery, support, security, accounting
              or legal requirements.
            </p>
            <p>
              Uploaded and generated files may be removed
              after the applicable service or storage period.
              Customers are encouraged to download completed
              files promptly.
            </p>
          </section>

          <section>
            <h2>10. Children's Privacy</h2>
            <p>
              Our services may include photography or images
              of children when submitted by a parent,
              guardian or authorized person. Customers are
              responsible for ensuring they have appropriate
              permission to submit such images.
            </p>
          </section>

          <section>
            <h2>11. Your Choices</h2>
            <p>
              You may contact us to request reasonable
              assistance regarding your account information,
              uploaded content or privacy concerns, subject
              to applicable legal and record-retention
              requirements.
            </p>
          </section>

          <section>
            <h2>12. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy when our
              services, technology or legal requirements
              change. The latest version will be published on
              this page with an updated effective date.
            </p>
          </section>

          <section>
            <h2>13. Contact Us</h2>
            <p>
              For privacy questions or requests, contact:
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
            <Link to="/contact">Contact Us</Link>
            <Link to="/terms">Terms & Conditions</Link>
            <Link to="/refund-policy">
              Cancellation & Refund Policy
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default PrivacyPolicy;