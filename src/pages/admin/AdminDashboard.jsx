import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Headphones,
  IndianRupee,
  PackageCheck,
  ShoppingBag,
  Share2,
  Users,
} from "lucide-react";

import { supabase } from "../../services/supabase";
import { getAdminReferralMetrics } from "../../services/referrals";

function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [supportTicketCount, setSupportTicketCount] =
    useState(0);
  const [referralMetrics, setReferralMetrics] = useState({
    total: 0,
    pending: 0,
    available: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAdminDashboard = async () => {
      try {
        setIsLoading(true);
        setError("");

        const [
          ordersResult,
          customersResult,
          supportTicketsResult,
          referralMetricsResult,
        ] = await Promise.all([
          supabase
            .from("orders")
            .select(
              `
                id,
                customer_name,
                phone,
                service,
                size,
                quantity,
                delivery_type,
                status,
                estimated_price,
                final_price,
                created_at
              `,
            )
            .order("created_at", {
              ascending: false,
            }),

          supabase
            .from("profiles")
            .select("id", {
              count: "exact",
              head: true,
            })
            .eq("role", "customer"),

          supabase
            .from("support_tickets")
            .select("id", {
              count: "exact",
              head: true,
            }),

          getAdminReferralMetrics(),
        ]);

        if (ordersResult.error) {
          throw ordersResult.error;
        }

        if (customersResult.error) {
          throw customersResult.error;
        }

        if (supportTicketsResult.error) {
          throw supportTicketsResult.error;
        }

        if (!isMounted) {
          return;
        }

        setOrders(ordersResult.data || []);
        setCustomerCount(
          customersResult.count || 0,
        );

        setSupportTicketCount(
          supportTicketsResult.count || 0,
        );

        setReferralMetrics({
          total: referralMetricsResult?.total || 0,
          pending: referralMetricsResult?.pending || 0,
          available:
            referralMetricsResult?.available || 0,
        });
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError.message ||
              "Unable to load admin dashboard.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadAdminDashboard();

    return () => {
      isMounted = false;
    };
  }, []);

  const pendingOrders = useMemo(() => {
    return orders.filter(
      (order) => order.status === "pending",
    ).length;
  }, [orders]);

  const activeOrders = useMemo(() => {
    return orders.filter((order) =>
      [
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

  const totalRevenue = useMemo(() => {
    return orders
      .filter(
        (order) => order.status === "completed",
      )
      .reduce((total, order) => {
        return (
          total +
          Number(
            order.final_price ||
              order.estimated_price ||
              0,
          )
        );
      }, 0);
  }, [orders]);

  const latestOrders = useMemo(() => {
    return orders.slice(0, 5);
  }, [orders]);

  const stats = [
    {
      label: "Total Orders",
      value: orders.length,
      description:
        "All customer service orders",
      icon: ShoppingBag,
      className: "purple",
      to: "/admin/orders",
    },
    {
      label: "Pending Orders",
      value: pendingOrders,
      description:
        "Waiting for admin confirmation",
      icon: Clock3,
      className: "yellow",
      to: "/admin/orders",
    },
    {
      label: "Active Orders",
      value: activeOrders,
      description:
        "Confirmed or currently processing",
      icon: PackageCheck,
      className: "cyan",
      to: "/admin/orders",
    },
    {
      label: "Completed Orders",
      value: completedOrders,
      description:
        "Successfully completed services",
      icon: CheckCircle2,
      className: "green",
      to: "/admin/orders",
    },
    {
      label: "Customers",
      value: customerCount,
      description:
        "Registered customer accounts",
      icon: Users,
      className: "blue",
      to: "/admin/customers",
    },
    {
      label: "Support Tickets",
      value: supportTicketCount,
      description:
        "Customer support requests",
      icon: Headphones,
      className: "cyan",
      to: "/admin/support",
    },
    {
      label: "Completed Revenue",
      value: `₹${totalRevenue.toLocaleString(
        "en-IN",
      )}`,
      description:
        "Revenue from completed orders",
      icon: IndianRupee,
      className: "orange",
      to: null,
    },
    {
      label: "Referral Rewards",
      value: new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(Number(referralMetrics.total)),
      description: `${new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(Number(referralMetrics.available))} available · ${new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(Number(referralMetrics.pending))} pending`,
      icon: Share2,
      className: "green",
      to: "/admin/referrals",
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
    <div className="admin-dashboard-page">
      <section className="admin-dashboard-hero">
        <div>
          <span>ADMIN OVERVIEW</span>

          <h1>
            Kushi Digitals
            <strong> Business Dashboard</strong>
          </h1>

          <p>
            Manage customer orders, monitor
            service progress and track business
            activity from one secure admin panel.
          </p>
        </div>

        <Link
          to="/admin/orders"
          className="primary-button"
        >
          Manage All Orders
          <ArrowRight size={18} />
        </Link>
      </section>

      {error && (
        <div
          className="admin-data-message error"
          role="alert"
        >
          <AlertCircle size={19} />
          <span>{error}</span>
        </div>
      )}

      <section className="admin-stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;

          const cardContent = (
            <>
              <div className="admin-stat-icon">
                <Icon size={23} />
              </div>

              <span>{stat.label}</span>

              <strong>
                {isLoading ? "..." : stat.value}
              </strong>

              <p>{stat.description}</p>

              {stat.to && (
                <small className="admin-stat-card-link-label">
                  Open Details
                  <ArrowRight size={14} />
                </small>
              )}
            </>
          );

          if (stat.to) {
            return (
              <Link
                key={stat.label}
                to={stat.to}
                className={`admin-stat-card admin-stat-card-link ${stat.className}`}
              >
                {cardContent}
              </Link>
            );
          }

          return (
            <article
              key={stat.label}
              className={`admin-stat-card ${stat.className}`}
            >
              {cardContent}
            </article>
          );
        })}
      </section>

      <section className="admin-dashboard-grid">
        <article className="admin-panel">
          <div className="admin-panel-header">
            <div>
              <span>RECENT ACTIVITY</span>
              <h2>Latest Customer Orders</h2>
            </div>

            <Link to="/admin/orders">
              View All
              <ArrowRight size={16} />
            </Link>
          </div>

          {isLoading ? (
            <div className="admin-loading-state">
              <Clock3 size={24} />
              <span>
                Loading latest orders...
              </span>
            </div>
          ) : latestOrders.length > 0 ? (
            <div className="admin-latest-orders">
              {latestOrders.map((order) => (
                <article
                  className="admin-latest-order-card"
                  key={order.id}
                >
                  <div className="admin-latest-order-main">
                    <span>
                      KD-
                      {getShortOrderId(order.id)}
                    </span>

                    <h3>{order.service}</h3>

                    <p>
                      {order.customer_name}
                      {" · "}
                      {order.phone}
                    </p>

                    <small>
                      {formatDate(
                        order.created_at,
                      )}
                      {" · "}
                      {order.delivery_type}
                    </small>
                  </div>

                  <div className="admin-latest-order-meta">
                    <strong
                      className={`order-status ${order.status}`}
                    >
                      {getStatusLabel(
                        order.status,
                      )}
                    </strong>

                    <span>
                      {order.size ||
                        "Not Applicable"}
                      {" · "}
                      Qty {order.quantity}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">
              <PackageCheck size={33} />

              <h3>No Customer Orders Yet</h3>

              <p>
                New website service orders will
                appear here automatically.
              </p>
            </div>
          )}
        </article>

        <aside className="admin-dashboard-side">
          <article className="admin-panel admin-summary-card">
            <span>ORDER PIPELINE</span>

            <h2>Current Workload</h2>

            <div>
              <p>
                Pending Confirmation
                <strong>{pendingOrders}</strong>
              </p>

              <p>
                In Production
                <strong>{activeOrders}</strong>
              </p>

              <p>
                Completed
                <strong>{completedOrders}</strong>
              </p>
            </div>

            <Link to="/admin/orders">
              Open Order Manager
              <ArrowRight size={16} />
            </Link>
          </article>

          <article className="admin-panel admin-security-card">
            <span>SECURE ADMIN ACCESS</span>

            <h2>Protected Control Panel</h2>

            <p>
              This section is available only to
              accounts with the protected admin
              role in Supabase.
            </p>
          </article>
        </aside>
      </section>
    </div>
  );
}

export default AdminDashboard;
