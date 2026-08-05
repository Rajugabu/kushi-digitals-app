import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Coins,
  CreditCard,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  createStudioCreditOrder,
  formatPaise,
  getRecentStudioPurchases,
  getStudioCheckoutCustomer,
  getStudioCreditPacks,
  getStudioPurchaseStatus,
  loadRazorpayCheckout,
  openStudioCreditCheckout,
  StudioPaymentError,
  verifyStudioCreditPayment,
} from "../../services/studioPaymentService";
import { getStudioCreditBalance } from "../../services/studioService";
import { pollStudioPurchaseUntilTerminal } from "../../utils/studioPaymentPolling";

const BUSY_STATES = new Set(["creating", "checkout", "verifying"]);
const RETRY_ONLY_STATES = new Set([
  "capture_pending",
  "capture_timeout",
  "verification_failed",
]);

function purchaseStatusLabel(status) {
  const labels = {
    created: "Preparing",
    order_created: "Checkout opened",
    capture_pending: "Capture pending",
    credited: "Credits added",
    failed: "Not completed",
    refund_review: "Review required",
  };
  return labels[status] || "Pending";
}

function shortPaymentId(paymentId) {
  if (!paymentId) return "—";
  return `${paymentId.slice(0, 8)}…${paymentId.slice(-4)}`;
}

function StudioCreditPurchase({
  open,
  currentBalance,
  onClose,
  onCreditsAdded,
}) {
  const closeButtonRef = useRef(null);
  const dialogRef = useRef(null);
  const pollingControllerRef = useRef(null);
  const [packs, setPacks] = useState([]);
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [paymentState, setPaymentState] = useState("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [activeOrder, setActiveOrder] = useState(null);
  const [checkoutResponse, setCheckoutResponse] = useState(null);
  const [creditResult, setCreditResult] = useState(null);

  const loadPurchaseData = useCallback(async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const [packData, purchaseData] = await Promise.all([
        getStudioCreditPacks(),
        getRecentStudioPurchases(),
      ]);
      setPacks(packData);
      setHistory(purchaseData);
    } catch (error) {
      setLoadError(
        error.message || "Studio credit purchase options could not be loaded.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const stopCapturePolling = useCallback(() => {
    pollingControllerRef.current?.abort();
    pollingControllerRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const loadTimer = window.setTimeout(loadPurchaseData, 0);
    const focusFrame = window.requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      stopCapturePolling();
      window.clearTimeout(loadTimer);
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
    };
  }, [loadPurchaseData, open, stopCapturePolling]);

  const isBusy = BUSY_STATES.has(paymentState);
  const purchaseBlocked = isBusy || RETRY_ONLY_STATES.has(paymentState);

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isBusy) {
        onClose();
      }

      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll(
          'button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])',
        );

        if (!focusable?.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isBusy, onClose, open]);

  const monitorCapturePending = async (order) => {
    stopCapturePolling();
    const controller = new AbortController();
    pollingControllerRef.current = controller;
    setPaymentState("capture_pending");
    setPaymentMessage(
      "Payment is authorized and awaiting capture. Checking the secure purchase status…",
    );

    try {
      const purchase = await pollStudioPurchaseUntilTerminal({
        fetchStatus: () => getStudioPurchaseStatus(order.purchaseId),
        signal: controller.signal,
      });

      if (purchase.aborted || controller.signal.aborted) return;

      if (purchase.timedOut) {
        setPaymentState("capture_timeout");
        setPaymentMessage(
          "Capture confirmation is taking longer than expected. Do not pay again. Use Refresh Status to continue checking this purchase.",
        );
        await loadPurchaseData();
        return;
      }

      if (purchase.status === "credited") {
        const account = await getStudioCreditBalance();

        if (controller.signal.aborted || !account.isAuthenticated) return;

        const recoveredResult = {
          status: "credited",
          credited: true,
          purchaseId: purchase.id,
          paymentId: purchase.paymentId,
          creditsAdded: purchase.credits,
          availableCredits: account.availableCredits,
          recoveredFromWebhook: true,
        };
        setCreditResult(recoveredResult);
        setPaymentState("credited");
        setPaymentMessage(
          `${purchase.credits} credits were confirmed from the secure purchase record. Your new balance is ${account.availableCredits} credits.`,
        );
        await onCreditsAdded(recoveredResult);
        await loadPurchaseData();
        return;
      }

      if (purchase.status === "refund_review") {
        setPaymentState("refund_review");
        setPaymentMessage(
          "This payment requires administrator review. No automatic credit removal or additional charge was made.",
        );
        await loadPurchaseData();
        return;
      }

      if (purchase.status === "failed") {
        setPaymentState("payment_failed");
        setPaymentMessage(
          "The secure purchase record reports that payment was not completed. No credits were added.",
        );
        await loadPurchaseData();
      }
    } catch (error) {
      if (controller.signal.aborted) return;

      setPaymentState("verification_failed");
      setPaymentMessage(
        error.message ||
          "The purchase status could not be refreshed. Do not pay again; retry status verification.",
      );
    } finally {
      if (pollingControllerRef.current === controller) {
        pollingControllerRef.current = null;
      }
    }
  };

  const finishVerification = async (order, response) => {
    setPaymentState("verifying");
    setPaymentMessage(
      "Verifying the signature and captured payment with Razorpay…",
    );

    try {
      const result = await verifyStudioCreditPayment(order, response);

      if (result.status === "capture_pending") {
        setCreditResult(result);
        setPaymentState("capture_pending");
        setPaymentMessage(
          result.message ||
            "Payment is authorized but not captured. Credits will be added only after the signed webhook confirms capture.",
        );
        await loadPurchaseData();
        await monitorCapturePending(order);
        return;
      }

      setCreditResult(result);
      setPaymentState("credited");
      setPaymentMessage(
        `${result.creditsAdded} credits were securely added. Your new balance is ${result.availableCredits} credits.`,
      );
      await onCreditsAdded(result);
      await loadPurchaseData();
    } catch (error) {
      setPaymentState("verification_failed");
      setPaymentMessage(
        error.message ||
          "Payment verification could not be completed. Do not pay again; retry verification or wait for the webhook.",
      );
    }
  };

  const handlePurchase = async (pack) => {
    stopCapturePolling();
    setPaymentState("creating");
    setPaymentMessage("Creating a secure Razorpay Test Mode order…");
    setActiveOrder(null);
    setCheckoutResponse(null);
    setCreditResult(null);

    try {
      const [order, customer] = await Promise.all([
        createStudioCreditOrder(pack.id),
        getStudioCheckoutCustomer(),
        loadRazorpayCheckout(),
      ]);

      setActiveOrder(order);
      setPaymentState("checkout");
      setPaymentMessage("Complete payment in the secure Razorpay window.");
      const response = await openStudioCreditCheckout(order, customer);
      setCheckoutResponse(response);
      await finishVerification(order, response);
    } catch (error) {
      const normalized = error instanceof StudioPaymentError
        ? error
        : new StudioPaymentError(
          "The secure payment request could not be completed.",
          { retryable: true },
        );
      const dismissed = normalized.code === "CHECKOUT_DISMISSED";
      const failed = normalized.code === "PAYMENT_FAILED";

      setPaymentState(dismissed ? "dismissed" : failed ? "payment_failed" : "error");
      setPaymentMessage(normalized.message);
      await loadPurchaseData();
    }
  };

  if (!open) return null;

  return createPortal((
    <div
      className="studio-payment-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isBusy) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="studio-payment-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-payment-title"
        aria-describedby="studio-payment-description"
      >
        <header className="studio-payment-header">
          <div>
            <span className="studio-kicker"><Coins size={15} /> Studio credits</span>
            <h2 id="studio-payment-title">Buy credits securely</h2>
            <p id="studio-payment-description">
              Razorpay Test Mode · Credits are added only after server verification.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="studio-payment-close"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Close credit purchase"
          >
            <X size={20} />
          </button>
        </header>

        <div className="studio-payment-balance">
          <span><Coins size={19} /> Current available balance</span>
          <strong>{currentBalance} Credits</strong>
        </div>

        <div className="studio-payment-status" aria-live="polite" aria-atomic="true">
          {paymentState !== "idle" && (
            <div className={`studio-payment-message ${paymentState}`}>
              {isBusy && <LoaderCircle className="studio-payment-spinner" size={20} />}
              {paymentState === "credited" && <CheckCircle2 size={20} />}
              {["capture_pending", "capture_timeout"].includes(paymentState) && <Clock3 size={20} />}
              {["dismissed", "payment_failed", "verification_failed", "refund_review", "error"].includes(paymentState) && (
                <AlertTriangle size={20} />
              )}
              <span>{paymentMessage}</span>
              {paymentState === "verification_failed" && activeOrder && checkoutResponse && (
                <button
                  type="button"
                  onClick={() => finishVerification(activeOrder, checkoutResponse)}
                >
                  <RefreshCw size={15} /> Retry verification
                </button>
              )}
              {paymentState === "capture_timeout" && activeOrder && (
                <button
                  type="button"
                  onClick={() => monitorCapturePending(activeOrder)}
                >
                  <RefreshCw size={15} /> Refresh Status
                </button>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="studio-payment-loading">
            <LoaderCircle className="studio-payment-spinner" size={24} /> Loading secure packs…
          </div>
        ) : loadError ? (
          <div className="studio-payment-load-error" role="alert">
            <AlertTriangle size={20} />
            <span>{loadError}</span>
            <button type="button" onClick={loadPurchaseData}>Try again</button>
          </div>
        ) : (
          <div className="studio-credit-pack-grid">
            {packs.map((pack) => (
              <article className="studio-credit-pack" key={pack.id}>
                <span className="studio-credit-pack-icon"><CreditCard size={21} /></span>
                <h3>{pack.name}</h3>
                <strong>{pack.credits} Credits</strong>
                <p>{pack.description}</p>
                <div>
                  <span>{formatPaise(pack.amountPaise, pack.currency)}</span>
                  <small>Secure payment</small>
                </div>
                <button
                  type="button"
                  onClick={() => handlePurchase(pack)}
                  disabled={purchaseBlocked}
                >
                  <ShieldCheck size={17} /> Buy {pack.credits} Credits
                </button>
              </article>
            ))}
          </div>
        )}

        {creditResult?.status === "credited" && (
          <div className="studio-payment-success-summary">
            <CheckCircle2 size={21} />
            <span>
              <strong>{creditResult.creditsAdded} credits added</strong>
              New available balance: {creditResult.availableCredits} credits
            </span>
          </div>
        )}

        {history.length > 0 && (
          <section className="studio-purchase-history" aria-labelledby="studio-purchase-history-title">
            <div className="studio-purchase-history-heading">
              <h3 id="studio-purchase-history-title">Recent purchases</h3>
              <button type="button" onClick={loadPurchaseData} disabled={isLoading || isBusy}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>
            <div className="studio-purchase-history-list">
              {history.map((purchase) => (
                <article key={purchase.id}>
                  <div>
                    <strong>{purchase.packName}</strong>
                    <span>{new Date(purchase.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                  <div>
                    <strong>{purchase.credits} Cr · {formatPaise(purchase.amountPaise, purchase.currency)}</strong>
                    <span title={purchase.paymentId || "No payment ID"}>
                      {shortPaymentId(purchase.paymentId)}
                    </span>
                  </div>
                  <span className={`studio-purchase-status ${purchase.status}`}>
                    {purchaseStatusLabel(purchase.status)}
                  </span>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </div>
  ), document.body);
}

export default StudioCreditPurchase;
