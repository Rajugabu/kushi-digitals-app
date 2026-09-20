import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  ShieldCheck,
} from "lucide-react";

import SEO from "../../components/SEO";
import { businessDetails } from "../../config/business";

const deletedData = [
  "Account and profile information",
  "Saved projects",
  "User-uploaded project media",
  "AI-generated and other user-owned media",
  "Business Studio media",
  "Video-render media associated with the account",
  "Other user-owned app data associated with the account",
];

function AccountDeletion() {
  return (
    <main className="legal-page">
      <SEO
        title="KUSHI AI STUDIO – Account & Data Deletion"
        description="Learn how to delete your KUSHI AI STUDIO account and request removal of associated personal data."
        canonical="https://kushidigitals.com/account-deletion"
      />

      <section className="legal-hero">
        <div className="container">
          <div className="legal-hero-icon">
            <ShieldCheck size={30} />
          </div>

          <span>KUSHI AI STUDIO</span>
          <h1>Account &amp; Data Deletion</h1>
          <p>
            KUSHI AI STUDIO users can delete their account and associated
            personal data.
          </p>
        </div>
      </section>

      <section className="legal-content">
        <div className="container legal-content-card">
          <section>
            <div className="legal-section-heading">
              <CheckCircle2 size={24} />
              <h2>1. Delete account from the app</h2>
            </div>
            <ol>
              <li>Open KUSHI AI STUDIO.</li>
              <li>Sign in to your account.</li>
              <li>Open Profile / Settings.</li>
              <li>Select Delete Account.</li>
              <li>Confirm account deletion.</li>
            </ol>
            <p>
              Deletion is processed securely through the authenticated account
              deletion system.
            </p>
          </section>

          <section>
            <div className="legal-section-heading">
              <Mail size={24} />
              <h2>2. Request account/data deletion without app access</h2>
            </div>
            <p>
              If you cannot access the app, contact Kushi Digitals to request
              account and associated data deletion.
            </p>
            <p>
              Email{" "}
              <a href={businessDetails.emailHref}>{businessDetails.email}</a>{" "}
              with the subject{" "}
              <strong>KUSHI AI STUDIO Account Deletion Request</strong>.
            </p>
            <p>
              Include the email address associated with your KUSHI AI STUDIO
              account. Never send passwords, OTPs, access tokens, or other
              sensitive credentials.
            </p>
            <a className="legal-action-link" href={businessDetails.emailHref}>
              <Mail size={18} />
              Email Kushi Digitals
            </a>
          </section>

          <section>
            <div className="legal-section-heading">
              <ShieldCheck size={24} />
              <h2>3. Data deleted</h2>
            </div>
            <p>Deletion may include the following user-owned data:</p>
            <ul>
              {deletedData.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>

          <section>
            <h2>4. Data retention</h2>
            <p>
              Some limited records may be retained where required for legal,
              security, fraud-prevention, dispute-resolution, or regulatory
              obligations. Kushi Digitals does not publish a fixed retention
              period for those limited records; retained information is kept
              only as long as required for the applicable obligation.
            </p>
          </section>

          <section>
            <h2>5. Developer information</h2>
            <p><strong>App:</strong> KUSHI AI STUDIO</p>
            <p><strong>Developer:</strong> Kushi Digitals</p>
            <p>
              <strong>Website:</strong>{" "}
              <a href="https://kushidigitals.com">
                https://kushidigitals.com
              </a>
            </p>
            <Link className="legal-action-link" to="/">
              <ArrowLeft size={18} />
              Back to Kushi Digitals
            </Link>
          </section>
        </div>
      </section>
    </main>
  );
}

export default AccountDeletion;
