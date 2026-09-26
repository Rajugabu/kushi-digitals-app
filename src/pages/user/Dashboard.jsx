import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  useOutletContext,
} from "react-router-dom";

import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ImagePlus,
  PackageCheck,
  Share2,
  Sparkles,
  WalletCards,
} from "lucide-react";

import { supabase } from "../../services/supabase";
import { getMyWalletDashboard } from "../../services/referrals";

function Dashboard() {
  const outletContext = useOutletContext();

  const user = outletContext?.user ?? null;

  const displayName =
    outletContext?.displayName ?? "Customer";

  const [orders, setOrders] = useState([]);
  const [walletSummary, setWalletSummary] = useState({
    lifetime_earnings: 0,
    available_balance: 0,
  });
  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDashboardOrders = async () => {
      try {
        setIsLoading(true);
        setError("");

        const {
          data: { user: currentUser },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!currentUser) {
          throw new Error(
            "Please login to view your dashboard.",
          );
        }

        const {
          data,
          error: ordersError,
        } = await supabase
          .from("orders")
          .select(
            `
              id,
              service,
              size,
              quantity,
              delivery_type,
              status,
              created_at
            `,
          )
          .eq("user_id", currentUser.id)
          .order("created_at", {
            ascending: false,
          });

        if (ordersError) {
          throw ordersError;
        }

        if (isMounted) {
          setOrders(data || []);

          try {
            const walletData = await getMyWalletDashboard();
            setWalletSummary({
              lifetime_earnings:
                walletData?.lifetime_earnings || 0,
              available_balance:
                walletData?.available_balance || 0,
            });
          } catch (walletError) {
            console.error(
              "Unable to load wallet summary:",
              walletError,
            );
          }
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError.message ||
              "Unable to load dashboard orders.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboardOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const memberSince = useMemo(() => {
    if (!user?.created_at) {
      return "Recently joined";
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(user.created_at));
  }, [user]);

  const activeOrders = useMemo(() => {
    return orders.filter((order) =>
      [
        "pending",
        "confirmed",
        "in_progress",
        "ready",
      ].includes(order.status),
    ).length;
  }, [orders]);

  const completedOrders = useMemo(() => {
    return orders.filter(
      (order) => order.status === "completed",
    ).length;
  }, [orders]);

  const latestOrders = useMemo(() => {
    return orders.slice(0, 3);
  }, [orders]);

  const overviewCards = [
    {
      label: "Active Orders",
      value: activeOrders,
      description:
        "Orders currently being processed",
      icon: PackageCheck,
      className: "purple",
    },
    {
      label: "Completed Orders",
      value: completedOrders,
      description:
        "Successfully delivered services",
      icon: CheckCircle2,
      className: "cyan",
    },
    {
      label: "Referral Earnings",
      value: new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(Number(walletSummary.lifetime_earnings)),
      description:
        "Commission earned from referrals",
      icon: Share2,
      className: "green",
    },
    {
      label: "Wallet Balance",
      value: new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(Number(walletSummary.available_balance)),
      description:
        "Available rewards and earnings",
      icon: WalletCards,
      className: "yellow",
    },
  ];

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateValue));
  };

  const getShortOrderId = (orderId) => {
    return orderId
      .replace(/-/g, "")
      .slice(0, 10)
      .toUpperCase();
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: "Pending",
      confirmed: "Confirmed",
      in_progress: "In Progress",
      ready: "Ready",
      completed: "Completed",
      cancelled: "Cancelled",
      rejected: "Rejected",
    };

    return labels[status] || status;
  };

  return (
    <div className="customer-dashboard-page">
      <section className="dashboard-welcome-banner">
        <div>
          <span className="dashboard-eyebrow">
            <Sparkles size={16} />
            Customer Dashboard
          </span>

          <h1>
            Welcome Back,
            <span className="gradient-text">
              {" "}
              {displayName}
            </span>
          </h1>

          <p>
            Manage your photography orders,
            uploaded photos, referral rewards and
            account activity from one secure place.
          </p>

          <div className="dashboard-welcome-actions">
            <Link
              to="/ai-photo-studio"
              className="primary-button"
            >
              <ImagePlus size={18} />
              Start Creating
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/dashboard/orders"
              className="dashboard-secondary-button"
            >
              View My Orders
            </Link>
          </div>
        </div>

        <div className="dashboard-account-summary">
          <span>Account Status</span>

          <strong>
            <i />
            Active Customer
          </strong>

          <div>
            <CalendarDays size={18} />

            <span>
              Member since
              <strong>{memberSince}</strong>
            </span>
          </div>
        </div>
      </section>

      {error && (
        <div
          className="dashboard-data-message error"
          role="alert"
        >
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      <section className="dashboard-overview-grid">
        {overviewCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className={`dashboard-overview-card ${card.className}`}
            >
              <div className="dashboard-overview-icon">
                <Icon size={23} />
              </div>

              <span>{card.label}</span>

              <strong>
                {isLoading &&
                typeof card.value === "number"
                  ? "..."
                  : card.value}
              </strong>

              <p>{card.description}</p>
            </article>
          );
        })}
      </section>

      <section className="dashboard-content-grid">
        <article className="dashboard-panel">
          <div className="dashboard-panel-header">
            <div>
              <span>Recent Activity</span>
              <h2>Your Latest Orders</h2>
            </div>

            <Link to="/dashboard/orders">
              View All
              <ArrowRight size={16} />
            </Link>
          </div>

          {isLoading ? (
            <div className="dashboard-orders-loading">
              <Clock3 size={24} />
              <span>
                Loading your latest orders...
              </span>
            </div>
          ) : latestOrders.length > 0 ? (
            <div className="dashboard-latest-orders">
              {latestOrders.map((order) => (
                <article
                  key={order.id}
                  className="dashboard-latest-order-card"
                >
                  <div className="dashboard-latest-order-icon">
                    <PackageCheck size={21} />
                  </div>

                  <div className="dashboard-latest-order-info">
                    <span>
                      KD-
                      {getShortOrderId(order.id)}
                    </span>

                    <h3>{order.service}</h3>

                    <p>
                      {formatDate(order.created_at)}
                      {" · "}
                      {order.size ||
                        "Not Applicable"}
                      {" · "}
                      Qty {order.quantity}
                    </p>
                  </div>

                  <div className="dashboard-latest-order-status">
                    <strong
                      className={`order-status ${order.status}`}
                    >
                      {getStatusLabel(
                        order.status,
                      )}
                    </strong>

                    <small>
                      {order.delivery_type}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty-state">
              <div>
                <PackageCheck size={30} />
              </div>

              <h3>No Orders Yet</h3>

              <p>
                Your new service orders and their
                progress will appear here.
              </p>

              <Link
                to="/poster-studio"
                className="primary-button"
              >
                Create Your First Poster
                <ArrowRight size={17} />
              </Link>
            </div>
          )}
        </article>

        <aside className="dashboard-side-panels">
          <article className="dashboard-panel referral-mini-card">
            <div className="dashboard-panel-icon">
              <Share2 size={22} />
            </div>

            <span>Refer & Earn</span>

            <h2>Share Kushi Digitals</h2>

            <p>
              Invite customers using your unique
              referral link and earn rewards from
              eligible orders.
            </p>

            <Link to="/dashboard/referrals">
              Open Referral Dashboard
              <ArrowRight size={16} />
            </Link>
          </article>

          <article className="dashboard-panel support-mini-card">
            <div className="dashboard-panel-icon">
              <Clock3 size={22} />
            </div>

            <span>Need Assistance?</span>

            <h2>Customer Support</h2>

            <p>
              Contact Kushi Digitals regarding
              orders, payments or service
              requirements.
            </p>

            <Link to="/dashboard/support">
              Contact Support
              <ArrowRight size={16} />
            </Link>
          </article>
        </aside>
      </section>
    </div>
  );
}

export default Dashboard;
