import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  Banknote,
  CheckCircle2,
  Clock3,
  IndianRupee,
  LoaderCircle,
  ReceiptIndianRupee,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  X,
} from "lucide-react";
import {
  getMyWalletDashboard,
  requestWalletWithdrawal,
} from "../../services/referrals";

const emptyWallet = {
  available_balance: 0,
  pending_balance: 0,
  debt_balance: 0,
  lifetime_earnings: 0,
  total_withdrawn: 0,
  referral_commission: 0,
  buyer_cashback: 0,
  transactions: [],
  withdrawals: [],
};

const transactionLabels = {
  referral_buyer_cashback: "Buyer Cashback",
  referral_level_1: "Level 1 Referral Commission",
  referral_level_2: "Level 2 Referral Commission",
  referral_level_3: "Level 3 Referral Commission",
  referral_reversal: "Referral Reversal",
  withdrawal: "Wallet Withdrawal",
  withdrawal_refund: "Withdrawal Refund",
  manual_adjustment: "Audited Adjustment",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

function Wallet() {
  const [wallet, setWallet] = useState(emptyWallet);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState("all");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawUpiId, setWithdrawUpiId] = useState("");
  const minimumWithdrawal = 500;

  const loadWallet = useCallback(async () => {
    try {
      setIsLoading(true);
      setMessage("");
      const result = await getMyWalletDashboard();
      setWallet({
        ...emptyWallet,
        ...(result || {}),
        transactions: result?.transactions || [],
        withdrawals: result?.withdrawals || [],
      });
    } catch (loadError) {
      setMessage(
        loadError.message || "Unable to load your secure wallet.",
      );
      setMessageType("error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadWallet, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadWallet]);

  const handleWithdrawSubmit = async (event) => {
    event.preventDefault();

    const amount = Number(withdrawAmount);
    const upiId = withdrawUpiId.trim();
    const availableBalance = Number(
      wallet.available_balance || 0,
    );

    setMessage("");
    setMessageType("");

    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter a valid withdrawal amount.");
      setMessageType("error");
      return;
    }

    if (amount < minimumWithdrawal) {
      setMessage(
        `Minimum withdrawal amount is ₹${minimumWithdrawal}.`,
      );
      setMessageType("error");
      return;
    }

    if (amount > availableBalance) {
      setMessage(
        `Insufficient balance. Your available balance is ${formatCurrency(
          availableBalance,
        )}.`,
      );
      setMessageType("error");
      return;
    }

    if (!upiId) {
      setMessage("Enter your UPI ID.");
      setMessageType("error");
      return;
    }

    try {
      setIsSubmitting(true);

      const result = await requestWalletWithdrawal(
        amount,
        upiId,
      );

      setMessage(
        result?.message ||
          "Withdrawal request submitted.",
      );
      setMessageType("success");
      setWithdrawAmount("");
      setWithdrawUpiId("");
      await loadWallet();
    } catch (withdrawalError) {
      setMessage(
        withdrawalError.message ||
          "Unable to submit the withdrawal request.",
      );
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleTransactions = wallet.transactions.filter(
    (transaction) => {
      if (filter === "all") return true;
      if (filter === "credit") return transaction.direction === "credit";
      if (filter === "debit") return transaction.direction === "debit";
      return transaction.status === filter;
    },
  );

  if (isLoading) {
    return (
      <div className="referral-system-state">
        <LoaderCircle className="spin-icon" size={34} />
        <h2>Loading secure wallet...</h2>
        <p>Reconciling your ledger and available balance.</p>
      </div>
    );
  }

  return (
    <div className="customer-wallet-page">
      <section className="dashboard-page-header wallet-page-header">
        <div>
          <span>My Wallet</span><h1>Manage Your Earnings</h1>
          <p>Balances are calculated and protected by the database wallet ledger.</p>
        </div>
        <button
          type="button"
          className="primary-button"
          onClick={() => {
            setMessage("");
            setMessageType("");
            setWithdrawModalOpen(true);
          }}
        >
          <ArrowDownToLine size={18} /> Request Withdrawal
        </button>
      </section>

      {message && !withdrawModalOpen && (
        <div className={`referral-inline-message ${messageType}`}>
          {messageType === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{message}</span>
          {messageType === "error" && <button type="button" onClick={loadWallet}><RefreshCw size={16} /> Retry</button>}
        </div>
      )}

      <section className="wallet-balance-section">
        <article className="wallet-main-balance-card">
          <div className="wallet-main-heading">
            <div><span>Available Wallet Balance</span><strong><IndianRupee size={31} />{Number(wallet.available_balance).toFixed(2)}</strong><p>Only available ledger credits can be withdrawn.</p></div>
            <div className="wallet-main-icon"><WalletCards size={31} /></div>
          </div>
          <div className="wallet-balance-footer"><span><ShieldCheck size={17} />Secure Ledger Wallet</span><span>Minimum withdrawal: ₹{minimumWithdrawal}</span></div>
        </article>
        <div className="wallet-summary-column">
          <article className="wallet-summary-card green"><div><ReceiptIndianRupee size={22} /></div><span>Lifetime Earnings</span><strong>{formatCurrency(wallet.lifetime_earnings)}</strong><p>{formatCurrency(wallet.referral_commission)} referral commission</p></article>
          <article className="wallet-summary-card yellow"><div><Clock3 size={22} /></div><span>Pending / Debt</span><strong>{formatCurrency(wallet.pending_balance)}</strong><p>Reversal debt: {formatCurrency(wallet.debt_balance)}</p></article>
          <article className="wallet-summary-card cyan"><div><Banknote size={22} /></div><span>Buyer Cashback</span><strong>{formatCurrency(wallet.buyer_cashback)}</strong><p>Withdrawn: {formatCurrency(wallet.total_withdrawn)}</p></article>
        </div>
      </section>

      <section className="wallet-content-grid">
        <article className="dashboard-panel wallet-history-panel">
          <div className="wallet-panel-header">
            <div><span>Wallet Activity</span><h2>Transaction History</h2></div>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter wallet transactions">
              <option value="all">All Transactions</option><option value="credit">Credits</option><option value="debit">Debits</option><option value="pending">Pending</option><option value="reversed">Reversed</option>
            </select>
          </div>
          {visibleTransactions.length ? (
            <div className="wallet-transaction-list">
              {visibleTransactions.map((transaction) => (
                <div className="wallet-transaction-row" key={transaction.id}>
                  <div className={`wallet-transaction-direction ${transaction.direction}`}><ReceiptIndianRupee size={20} /></div>
                  <div><strong>{transactionLabels[transaction.transaction_type] || transaction.transaction_type}</strong><span>{transaction.description}</span><small>{formatDate(transaction.created_at)}{transaction.order_id ? ` · Order KD-${transaction.order_id.replace(/-/g, "").slice(0, 8).toUpperCase()}` : ""}</small></div>
                  <div className="wallet-transaction-amount"><strong>{transaction.direction === "credit" ? "+" : "-"}{formatCurrency(transaction.amount)}</strong><span className={`referral-status-badge ${transaction.status}`}>{transaction.status}</span></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="wallet-empty-state"><ReceiptIndianRupee size={31} /><h3>No Transactions Yet</h3><p>Eligible referral earnings and withdrawal activity will appear here.</p></div>
          )}
        </article>
        <aside className="wallet-side-column">
          <article className="dashboard-panel wallet-policy-card"><div className="wallet-side-icon"><ShieldCheck size={23} /></div><span>Withdrawal Policy</span><h2>Important Information</h2><ul><li>Minimum withdrawal amount is ₹500.</li><li>Pending rewards cannot be withdrawn.</li><li>Requests are paid to the submitted UPI ID after review.</li><li>Reversal debt blocks new withdrawals.</li></ul></article>
          {wallet.withdrawals.length > 0 && <article className="dashboard-panel wallet-policy-card"><span>Recent Requests</span><h2>Withdrawal Status</h2><div className="wallet-request-list">{wallet.withdrawals.slice(0, 4).map((request) => <div key={request.id}><strong>{formatCurrency(request.amount)}</strong><span className={`referral-status-badge ${request.status}`}>{request.status}</span><small>{formatDate(request.requested_at)}</small></div>)}</div></article>}
        </aside>
      </section>

      {withdrawModalOpen && (
        <div className="wallet-modal-backdrop" role="dialog" aria-modal="true" aria-label="Withdrawal request" onClick={() => setWithdrawModalOpen(false)}>
          <div className="wallet-modal" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="wallet-modal-close" onClick={() => setWithdrawModalOpen(false)} aria-label="Close withdrawal form"><X size={21} /></button>
            <div className="wallet-modal-icon"><ArrowDownToLine size={27} /></div>
            <div className="wallet-modal-heading"><span>Withdrawal Request</span><h2>Withdraw Available Balance</h2><p>Requests are reserved immediately and reviewed by Kushi Digitals.</p></div>
            {message && <div className={`wallet-modal-message ${messageType}`}>
              {messageType === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}<span>{message}</span>
            </div>}
            <form className="wallet-withdraw-form" onSubmit={handleWithdrawSubmit}>
              <div className="wallet-balance-preview"><span>Available Balance</span><strong>{formatCurrency(wallet.available_balance)}</strong></div>
              <div className="auth-input-group">
                <label htmlFor="withdrawAmount">
                  Withdrawal Amount
                </label>

                <div className="auth-input-wrapper">
                  <IndianRupee size={19} />

                  <input
                    id="withdrawAmount"
                    name="withdrawAmount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={withdrawAmount}
                    onChange={(event) => {
                      setWithdrawAmount(event.target.value);
                      setMessage("");
                    }}
                    placeholder={`Minimum ₹${minimumWithdrawal}`}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label htmlFor="withdrawUpiId">
                  UPI ID
                </label>

                <div className="auth-input-wrapper">
                  <Banknote size={19} />

                  <input
                    id="withdrawUpiId"
                    name="upiId"
                    type="text"
                    value={withdrawUpiId}
                    onChange={(event) => {
                      setWithdrawUpiId(event.target.value);
                      setMessage("");
                    }}
                    placeholder="name@bank"
                    autoComplete="off"
                    required
                  />
                </div>
              </div>

              {Number(wallet.available_balance) < minimumWithdrawal && (
                <div className="wallet-modal-message error">
                  <AlertCircle size={18} />

                  <span>
                    Your available balance is{" "}
                    {formatCurrency(wallet.available_balance)}.
                    You need at least ₹{minimumWithdrawal} to
                    request a withdrawal.
                  </span>
                </div>
              )}

              {Number(wallet.debt_balance) > 0 && (
                <div className="wallet-modal-message error">
                  <AlertCircle size={18} />

                  <span>
                    Clear the reversal debt before requesting
                    a withdrawal.
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="primary-button auth-submit-button"
                disabled={
                  isSubmitting ||
                  Number(wallet.debt_balance) > 0
                }
              >
                <ArrowDownToLine size={18} />

                {isSubmitting
                  ? "Submitting..."
                  : "Submit Withdrawal Request"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Wallet;
