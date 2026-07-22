import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

const pageContent = {
  "/login": {
    title: "Customer Login",
    description:
      "Secure login, signup and customer dashboard will be connected during the authentication phase.",
  },
  "/referral": {
    title: "Referral & Earnings",
    description:
      "Referral links, wallet, commissions and withdrawal features are coming in the referral-system phase.",
  },
  "/privacy-policy": {
    title: "Privacy Policy",
    description:
      "The complete privacy and customer-photo handling policy will be added before launch.",
  },
  "/terms": {
    title: "Terms & Conditions",
    description:
      "Service, order, payment and referral terms will be added before public launch.",
  },
  "/refund-policy": {
    title: "Refund Policy",
    description:
      "Order cancellation, correction and refund rules will be added before payments are enabled.",
  },
};

function ComingSoon() {
  const location = useLocation();

  const content = pageContent[location.pathname] || {
    title: "Coming Soon",
    description:
      "This section is currently being prepared for Kushi Digitals.",
  };

  return (
    <section className="status-page">
      <div className="status-card">
        <div className="status-icon">
          <Sparkles size={34} />
        </div>

        <span>Premium Feature In Development</span>
        <h1>{content.title}</h1>
        <p>{content.description}</p>

        <Link to="/" className="primary-button">
          <ArrowLeft size={18} />
          Back To Home
        </Link>
      </div>
    </section>
  );
}

export default ComingSoon;