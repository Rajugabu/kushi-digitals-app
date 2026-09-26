import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Coins,
  History,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import StudioCreditPurchase from "../../components/studio/StudioCreditPurchase";
import { getStudioCreditBalance } from "../../services/studioService";

const emptyAccount = {
  availableCredits: 0,
  reservedCredits: 0,
  lifetimePurchased: 0,
  lifetimeUsed: 0,
  updatedAt: null,
};

function Wallet() {
  const [creditAccount, setCreditAccount] = useState(emptyAccount);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPurchaseOpen, setIsPurchaseOpen] = useState(false);

  const loadCredits = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const account = await getStudioCreditBalance();
      setCreditAccount({ ...emptyAccount, ...account });
    } catch (error) {
      setErrorMessage(
        error.message || "Your Studio credit balance could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadCredits, 0);
    return () => window.clearTimeout(timer);
  }, [loadCredits]);

  const handleCreditsAdded = async (result) => {
    setCreditAccount((current) => ({
      ...current,
      availableCredits: result.availableCredits,
    }));
    await loadCredits();
  };

  if (isLoading) {
    return (
      <div className="referral-system-state">
        <LoaderCircle className="spin-icon" size={34} />
        <h2>Loading Studio credits...</h2>
        <p>Checking your secure AI creation balance.</p>
      </div>
    );
  }

  return (
    <div className="credits-page">
      <section className="dashboard-page-header credits-page-header">
        <div>
          <span>AI Creator Balance</span>
          <h1>Studio Credits</h1>
          <p>
            Use credits across AI Photo Studio, Poster Studio and Business
            Studio.
          </p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => setIsPurchaseOpen(true)}
        >
          <Coins size={18} />
          Buy Credits
        </button>
      </section>

      {errorMessage ? (
        <div className="dashboard-data-message error" role="alert">
          <AlertCircle size={19} />
          <span>{errorMessage}</span>
          <button type="button" onClick={loadCredits}>
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      ) : null}

      <section className="credits-balance-hero">
        <div>
          <span>Available Balance</span>
          <strong>
            <Coins size={34} />
            {creditAccount.availableCredits}
          </strong>
          <p>Studio Credits ready for your next AI creation.</p>
        </div>
        <div className="credits-balance-status">
          <ShieldCheck size={25} />
          <span>
            <strong>Secure credit account</strong>
            Credits are reserved and finalized by the existing protected
            generation system.
          </span>
        </div>
      </section>

      <section className="credits-summary-grid">
        <article className="dashboard-overview-card purple">
          <div className="dashboard-overview-icon">
            <Coins size={23} />
          </div>
          <span>Available Credits</span>
          <strong>{creditAccount.availableCredits}</strong>
          <p>Ready to use</p>
        </article>
        <article className="dashboard-overview-card cyan">
          <div className="dashboard-overview-icon">
            <History size={23} />
          </div>
          <span>Credits Used</span>
          <strong>{creditAccount.lifetimeUsed}</strong>
          <p>Across completed AI creations</p>
        </article>
        <article className="dashboard-overview-card green">
          <div className="dashboard-overview-icon">
            <CheckCircle2 size={23} />
          </div>
          <span>Credits Purchased</span>
          <strong>{creditAccount.lifetimePurchased}</strong>
          <p>Lifetime total</p>
        </article>
        <article className="dashboard-overview-card yellow">
          <div className="dashboard-overview-icon">
            <ShieldCheck size={23} />
          </div>
          <span>Reserved Credits</span>
          <strong>{creditAccount.reservedCredits}</strong>
          <p>Held for active generations</p>
        </article>
      </section>

      <section className="dashboard-panel credits-actions-panel">
        <div>
          <span>Ready to create?</span>
          <h2>Choose an AI Studio</h2>
          <p>
            Your balance is shared securely across every Kushi Digitals AI
            creation workflow.
          </p>
        </div>
        <div>
          <Link to="/ai-photo-studio">
            <Sparkles size={17} /> AI Photo Studio
          </Link>
          <Link to="/poster-studio">
            Poster Studio <ArrowRight size={16} />
          </Link>
          <Link to="/business-studio">
            Business Studio <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <StudioCreditPurchase
        open={isPurchaseOpen}
        currentBalance={creditAccount.availableCredits}
        onClose={() => setIsPurchaseOpen(false)}
        onCreditsAdded={handleCreditsAdded}
      />
    </div>
  );
}

export default Wallet;
