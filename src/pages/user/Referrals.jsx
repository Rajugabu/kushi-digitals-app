import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertCircle,
  Check,
  Copy,
  Gift,
  IndianRupee,
  Link2,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  Share2,
  TrendingUp,
  UserCheck,
  UsersRound,
} from "lucide-react";
import { getMyReferralDashboard } from "../../services/referrals";

const emptyDashboard = {
  referral_code: "",
  has_referrer: false,
  summary: {
    direct_referrals: 0,
    network_members: 0,
    level_1_count: 0,
    level_2_count: 0,
    level_3_count: 0,
    pending_earnings: 0,
    available_earnings: 0,
    lifetime_earnings: 0,
    buyer_cashback: 0,
  },
  network: [],
  earnings: [],
};

const rewardLabels = {
  buyer_cashback: "Buyer Cashback",
  level_1: "Level 1 Commission",
  level_2: "Level 2 Commission",
  level_3: "Level 3 Commission",
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
      }).format(new Date(value))
    : "Not available";

function Referrals() {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedItem, setCopiedItem] = useState("");
  const [filter, setFilter] = useState("all");

  const loadDashboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const result = await getMyReferralDashboard();
      setDashboard({
        ...emptyDashboard,
        ...(result || {}),
        summary: {
          ...emptyDashboard.summary,
          ...(result?.summary || {}),
        },
        network: result?.network || [],
        earnings: result?.earnings || [],
      });
    } catch (loadError) {
      setError(
        loadError.message ||
          "Unable to load your referral dashboard.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(loadDashboard, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  const referralCode =
    dashboard.referral_code || "Code unavailable";
  const referralLink = useMemo(
    () =>
      dashboard.referral_code
        ? `${window.location.origin}/signup?ref=${dashboard.referral_code}`
        : "",
    [dashboard.referral_code],
  );
  const shareMessage = `Join Kushi Digitals using my referral link. Referral rewards are generated only from eligible completed and paid orders.\n\nReferral Code: ${referralCode}\n${referralLink}`;
  const whatsappShareLink = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  const copyText = async (text, itemName) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(itemName);
      window.setTimeout(() => setCopiedItem(""), 1800);
    } catch {
      window.alert(
        "Unable to copy automatically. Please copy it manually.",
      );
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Kushi Digitals",
          text: shareMessage,
          url: referralLink,
        });
      } catch {
        return;
      }
    } else {
      await copyText(shareMessage, "message");
    }
  };

  const filteredEarnings = dashboard.earnings.filter((earning) => {
    if (filter === "all") return true;
    if (["pending", "available", "reversed"].includes(filter)) {
      return earning.status === filter;
    }
    return earning.reward_type === filter;
  });

  if (isLoading) {
    return (
      <div className="referral-system-state">
        <LoaderCircle className="spin-icon" size={34} />
        <h2>Loading referral network...</h2>
        <p>Securely calculating your three-level activity.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="referral-system-state error">
        <AlertCircle size={34} />
        <h2>Referral dashboard unavailable</h2>
        <p>{error}</p>
        <button className="primary-button" onClick={loadDashboard}>
          <RefreshCw size={18} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="referral-dashboard-page">
      <section className="dashboard-page-header referral-page-header">
        <div>
          <span>Refer & Earn</span>
          <h1>Share Kushi Digitals. Earn Real Rewards.</h1>
          <p>
            Earn buyer cashback and up to three referral levels only
            from genuine eligible completed and paid orders.
          </p>
        </div>
        <div className="referral-header-icon"><Gift size={35} /></div>
      </section>

      <section className="referral-summary-grid">
        <article className="referral-summary-card purple">
          <div className="referral-summary-icon"><UsersRound size={22} /></div>
          <span>Direct Referrals</span>
          <strong>{dashboard.summary.direct_referrals}</strong>
          <p>{dashboard.summary.network_members} members across three levels</p>
        </article>
        <article className="referral-summary-card cyan">
          <div className="referral-summary-icon"><UserCheck size={22} /></div>
          <span>Network Breakdown</span>
          <strong>
            {dashboard.summary.level_1_count} / {dashboard.summary.level_2_count} / {dashboard.summary.level_3_count}
          </strong>
          <p>Level 1 / Level 2 / Level 3</p>
        </article>
        <article className="referral-summary-card green">
          <div className="referral-summary-icon"><IndianRupee size={22} /></div>
          <span>Lifetime Earnings</span>
          <strong>{formatCurrency(dashboard.summary.lifetime_earnings)}</strong>
          <p>Includes {formatCurrency(dashboard.summary.buyer_cashback)} cashback</p>
        </article>
        <article className="referral-summary-card yellow">
          <div className="referral-summary-icon"><TrendingUp size={22} /></div>
          <span>Available Balance</span>
          <strong>{formatCurrency(dashboard.summary.available_earnings)}</strong>
          <p>{formatCurrency(dashboard.summary.pending_earnings)} pending</p>
        </article>
      </section>

      <section className="referral-main-grid">
        <article className="dashboard-panel referral-share-panel">
          <div className="referral-panel-heading">
            <div><span>Your Referral Tools</span><h2>Invite Friends & Customers</h2></div>
            <div className="referral-panel-icon"><Share2 size={24} /></div>
          </div>
          <div className="referral-code-section">
            <label>Your Permanent Referral Code</label>
            <div className="referral-copy-field">
              <div><Gift size={19} /><strong>{referralCode}</strong></div>
              <button type="button" disabled={!dashboard.referral_code} onClick={() => copyText(dashboard.referral_code, "code")}>
                {copiedItem === "code" ? <Check size={18} /> : <Copy size={18} />}
                {copiedItem === "code" ? "Copied" : "Copy Code"}
              </button>
            </div>
          </div>
          <div className="referral-link-section">
            <label>Your Unique Signup Link</label>
            <div className="referral-copy-field referral-link-field">
              <div><Link2 size={19} /><span>{referralLink || "Referral link unavailable"}</span></div>
              <button type="button" disabled={!referralLink} onClick={() => copyText(referralLink, "link")}>
                {copiedItem === "link" ? <Check size={18} /> : <Copy size={18} />}
                {copiedItem === "link" ? "Copied" : "Copy Link"}
              </button>
            </div>
          </div>
          <div className="referral-share-actions">
            <a href={whatsappShareLink} target="_blank" rel="noopener noreferrer" className="referral-whatsapp-button">
              <MessageCircle size={19} /> Share Through WhatsApp
            </a>
            <button type="button" className="referral-native-share-button" onClick={handleNativeShare} disabled={!referralLink}>
              <Share2 size={19} /> More Share Options
            </button>
          </div>
          <div className="referral-notice">
            <Gift size={19} />
            <p>
              Referral rewards are generated only from eligible completed orders. Earnings are not guaranteed. Cancelled, rejected, refunded, fraud-related, or invalid orders do not earn rewards and may be reversed.
            </p>
          </div>
        </article>

        <aside className="referral-side-column">
          <article className="dashboard-panel referral-how-card">
            <span>Reward Structure</span><h2>Maximum Three Levels</h2>
            <div className="referral-rate-list">
              <div><b>Buyer Cashback</b><strong>10%</strong></div>
              <div><b>Direct Referrer</b><strong>10%</strong></div>
              <div><b>Level 2 Upliner</b><strong>3%</strong></div>
              <div><b>Level 3 Upliner</b><strong>2%</strong></div>
            </div>
            <p className="referral-policy-copy">
              Amounts use the actual final paid order value. Missing upliners are skipped and no Level 4 reward is created.
            </p>
          </article>
          <article className="dashboard-panel referral-status-card">
            <div><span>Referral Account</span><strong><i />Active</strong></div>
            <p>{dashboard.has_referrer ? "You have a permanent referral parent." : "You can share your code; no parent is currently assigned to your account."}</p>
          </article>
        </aside>
      </section>

      <section className="dashboard-panel referral-history-panel">
        <div className="referral-history-header">
          <div><span>Network Activity</span><h2>Your Three-Level Network</h2></div>
        </div>
        {dashboard.network.length ? (
          <div className="referral-data-list">
            {dashboard.network.map((member) => (
              <div key={`${member.id}-${member.level}`} className="referral-network-row">
                <span className={`referral-level-badge level-${member.level}`}>Level {member.level}</span>
                <strong>{member.label}</strong>
                <small>Joined {formatDate(member.joined_at)}</small>
              </div>
            ))}
          </div>
        ) : (
          <div className="referral-empty-state"><UsersRound size={31} /><h3>No Referrals Yet</h3><p>People who join with your code will appear here without exposing their private details.</p></div>
        )}
      </section>

      <section className="dashboard-panel referral-history-panel">
        <div className="referral-history-header">
          <div><span>Financial Activity</span><h2>Referral Earnings History</h2></div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter referral earnings">
            <option value="all">All Rewards</option>
            <option value="pending">Pending</option>
            <option value="available">Available</option>
            <option value="reversed">Reversed</option>
            <option value="buyer_cashback">Buyer Cashback</option>
            <option value="level_1">Level 1</option>
            <option value="level_2">Level 2</option>
            <option value="level_3">Level 3</option>
          </select>
        </div>
        {filteredEarnings.length ? (
          <div className="referral-table-wrapper">
            <table className="referral-data-table">
              <thead><tr><th>Order</th><th>Reward</th><th>Calculation</th><th>Amount</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>{filteredEarnings.map((earning) => (
                <tr key={earning.id}>
                  <td>KD-{earning.order_id.replace(/-/g, "").slice(0, 8).toUpperCase()}</td>
                  <td>{rewardLabels[earning.reward_type]}</td>
                  <td>{Number(earning.percentage)}% of {formatCurrency(earning.base)}</td>
                  <td>{formatCurrency(earning.amount)}</td>
                  <td><span className={`referral-status-badge ${earning.status}`}>{earning.status}</span></td>
                  <td>{formatDate(earning.created_at)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        ) : (
          <div className="referral-empty-state"><IndianRupee size={31} /><h3>No Matching Rewards</h3><p>Eligible completed and paid orders will appear here automatically.</p></div>
        )}
      </section>
    </div>
  );
}

export default Referrals;
