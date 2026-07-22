import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  IndianRupee,
  RefreshCw,
  RotateCcw,
  Search,
  Share2,
  Users,
} from "lucide-react";
import {
  getAdminReferralDashboard,
  retryOrderReferralRewards,
  reverseOrderReferralRewards,
  updateWithdrawalStatus,
} from "../../services/referrals";

const emptyData = {
  summary: {},
  relationships: [],
  commissions: [],
  withdrawals: [],
};

const rewardLabels = {
  buyer_cashback: "Buyer Cashback",
  level_1: "Level 1",
  level_2: "Level 2",
  level_3: "Level 3",
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value))
    : "—";

const shortOrderId = (orderId) =>
  `KD-${orderId.replace(/-/g, "").slice(0, 8).toUpperCase()}`;

function AdminReferrals() {
  const [data, setData] = useState(emptyData);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const result = await getAdminReferralDashboard();
      setData({
        ...emptyData,
        ...(result || {}),
        summary: result?.summary || {},
        relationships: result?.relationships || [],
        commissions: result?.commissions || [],
        withdrawals: result?.withdrawals || [],
      });
    } catch (loadError) {
      setError(
        loadError.message ||
          "Unable to load referral administration data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  const filteredCommissions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return data.commissions.filter((commission) => {
      const matchesStatus =
        statusFilter === "all" ||
        commission.status === statusFilter;
      const matchesType =
        typeFilter === "all" ||
        commission.reward_type === typeFilter;
      const matchesSearch =
        !term ||
        commission.order_id?.toLowerCase().includes(term) ||
        commission.buyer_name?.toLowerCase().includes(term) ||
        commission.beneficiary_name?.toLowerCase().includes(term) ||
        commission.beneficiary_code?.toLowerCase().includes(term);
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [data.commissions, searchTerm, statusFilter, typeFilter]);

  const handleReverse = async (commission) => {
    const reason = window.prompt(
      `Enter the required reason for reversing every referral reward on ${shortOrderId(commission.order_id)}:`,
    );
    if (!reason?.trim()) return;

    const confirmed = window.confirm(
      "Reverse buyer cashback and every Level 1-3 reward for this order? Compensating wallet ledger debits will preserve financial history.",
    );
    if (!confirmed) return;

    try {
      setActionId(commission.id);
      setError("");
      const result = await reverseOrderReferralRewards(
        commission.order_id,
        reason,
      );
      setSuccessMessage(result?.message || "Reward reversed.");
      await loadData();
    } catch (actionError) {
      setError(actionError.message || "Unable to reverse order rewards.");
    } finally {
      setActionId("");
    }
  };

  const handleRetry = async (orderId) => {
    try {
      setActionId(orderId);
      setError("");
      const result = await retryOrderReferralRewards(orderId);
      setSuccessMessage(
        result?.message || "Order rewards synchronized.",
      );
      await loadData();
    } catch (actionError) {
      setError(
        actionError.message || "Unable to retry reward processing.",
      );
    } finally {
      setActionId("");
    }
  };

  const handleWithdrawal = async (request, status) => {
    const note = window.prompt(
      status === "rejected"
        ? "Enter the required rejection reason:"
        : "Optional processing note:",
      "",
    );
    if (note === null || (status === "rejected" && !note.trim())) {
      return;
    }

    try {
      setActionId(request.id);
      setError("");
      const result = await updateWithdrawalStatus(
        request.id,
        status,
        note,
      );
      setSuccessMessage(
        result?.message || "Withdrawal status updated.",
      );
      await loadData();
    } catch (actionError) {
      setError(
        actionError.message ||
          "Unable to update withdrawal status.",
      );
    } finally {
      setActionId("");
    }
  };

  const summaryCards = [
    ["Referral Members", data.summary.referral_members, Users],
    ["Available Rewards", formatCurrency(data.summary.available_rewards), CheckCircle2],
    ["Reversed Rewards", formatCurrency(data.summary.reversed_rewards), RotateCcw],
    ["Total Distribution", formatCurrency(data.summary.total_distribution), IndianRupee],
  ];

  return (
    <div className="admin-referrals-page">
      <section className="admin-orders-hero">
        <div>
          <span>REFERRAL FINANCE</span>
          <h1>Referral & Wallet Management</h1>
          <p>Audit buyer cashback, three-level commissions, reversals, referral relationships and withdrawals.</p>
        </div>
        <button type="button" className="admin-refresh-button" onClick={loadData} disabled={isLoading}>
          <RefreshCw size={18} /> Refresh Data
        </button>
      </section>

      {error && <div className="admin-order-message error"><AlertCircle size={18} />{error}</div>}
      {successMessage && <div className="admin-order-message success"><CheckCircle2 size={18} />{successMessage}</div>}

      <section className="admin-referral-summary-grid">
        {summaryCards.map(([label, value, Icon]) => (
          <article key={label}><Icon size={22} /><div><span>{label}</span><strong>{isLoading ? "…" : value || 0}</strong></div></article>
        ))}
      </section>

      <section className="admin-orders-panel">
        <div className="admin-orders-toolbar">
          <div><span>FINANCIAL LEDGER</span><h2>Referral Commissions</h2></div>
          <div className="admin-orders-filters">
            <div className="admin-orders-search"><Search size={18} /><input type="search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Order, name or code..." /></div>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter reward status"><option value="all">All Statuses</option><option value="pending">Pending</option><option value="available">Available</option><option value="reversed">Reversed</option></select>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} aria-label="Filter reward type"><option value="all">All Reward Types</option><option value="buyer_cashback">Buyer Cashback</option><option value="level_1">Level 1</option><option value="level_2">Level 2</option><option value="level_3">Level 3</option></select>
          </div>
        </div>
        {isLoading ? <div className="admin-orders-loading"><RefreshCw className="spin-icon" size={26} />Loading referral finance...</div> : filteredCommissions.length ? (
          <div className="admin-orders-table-wrapper"><table className="admin-orders-table admin-referral-table"><thead><tr><th>Order</th><th>Buyer / Beneficiary</th><th>Reward</th><th>Calculation</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>{filteredCommissions.map((commission) => (
            <tr key={commission.id}>
              <td><strong>{shortOrderId(commission.order_id)}</strong></td>
              <td><strong>{commission.buyer_name || "Customer"}</strong><small>To: {commission.beneficiary_name || "Customer"} · {commission.beneficiary_code}</small></td>
              <td>{rewardLabels[commission.reward_type]}</td>
              <td><strong>{formatCurrency(commission.amount)}</strong><small>{Number(commission.percentage)}% of {formatCurrency(commission.base)}</small></td>
              <td><span className={`referral-status-badge ${commission.status}`}>{commission.status}</span>{commission.reversal_reason && <small>{commission.reversal_reason}</small>}</td>
              <td>{formatDate(commission.created_at)}</td>
              <td><div className="admin-referral-actions"><button type="button" onClick={() => handleRetry(commission.order_id)} disabled={Boolean(actionId)} title="Idempotently retry order reward processing"><RefreshCw size={16} /> Retry</button>{commission.status !== "reversed" && <button type="button" className="danger" onClick={() => handleReverse(commission)} disabled={Boolean(actionId)}><RotateCcw size={16} /> Reverse Order</button>}</div></td>
            </tr>
          ))}</tbody></table></div>
        ) : <div className="admin-orders-empty"><Share2 size={30} /><h3>No referral rewards match these filters</h3></div>}
      </section>

      <section className="admin-referral-two-column">
        <article className="admin-orders-panel">
          <div className="admin-orders-toolbar"><div><span>PERMANENT ATTRIBUTION</span><h2>Referral Relationships</h2></div></div>
          <div className="admin-referral-relationship-list">{data.relationships.length ? data.relationships.map((relationship) => (
            <div key={relationship.id}><Users size={19} /><span><strong>{relationship.customer_name || "Customer"}</strong><small>{relationship.referral_code} · joined {formatDate(relationship.joined_at)}</small><small>Network L1/L2/L3: {relationship.level_1_count || 0}/{relationship.level_2_count || 0}/{relationship.level_3_count || 0}</small></span><span><small>Direct referrer</small><strong>{relationship.referrer_name || "Customer"}</strong><small>{relationship.referrer_code}</small></span></div>
          )) : <p className="admin-referral-empty-copy">No permanent referral relationships yet.</p>}</div>
        </article>

        <article className="admin-orders-panel">
          <div className="admin-orders-toolbar"><div><span>WALLET PAYOUTS</span><h2>Withdrawal Requests</h2></div></div>
          <div className="admin-referral-relationship-list">{data.withdrawals.length ? data.withdrawals.map((request) => (
            <div key={request.id}><ArrowDownToLine size={19} /><span><strong>{request.customer_name || "Customer"}</strong><small>{request.upi_id} · {formatDate(request.requested_at)}</small></span><span><strong>{formatCurrency(request.amount)}</strong><span className={`referral-status-badge ${request.status}`}>{request.status}</span></span>{["requested", "processing"].includes(request.status) && <div className="admin-referral-actions"><button type="button" onClick={() => handleWithdrawal(request, "processing")} disabled={Boolean(actionId)}>Processing</button><button type="button" onClick={() => handleWithdrawal(request, "paid")} disabled={Boolean(actionId)}>Paid</button><button type="button" className="danger" onClick={() => handleWithdrawal(request, "rejected")} disabled={Boolean(actionId)}>Reject</button></div>}</div>
          )) : <p className="admin-referral-empty-copy">No withdrawal requests yet.</p>}</div>
        </article>
      </section>
    </div>
  );
}

export default AdminReferrals;
