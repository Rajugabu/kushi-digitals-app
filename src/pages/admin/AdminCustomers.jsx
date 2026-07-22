import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ClipboardList,
  Headphones,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { supabase } from "../../services/supabase";

function AdminCustomers() {
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState(null);
  const [searchTerm, setSearchTerm] =
    useState("");
  const [isLoading, setIsLoading] =
    useState(true);
  const [error, setError] = useState("");

  const loadCustomers = async () => {
    try {
      setIsLoading(true);
      setError("");

      const [
        profilesResult,
        ordersResult,
        ticketsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select(
            `
              id,
              full_name,
              role,
              phone,
              whatsapp_number,
              address_line,
              city,
              district,
              state,
              postal_code,
              profile_updated_at
            `,
          )
          .neq("role", "admin")
          .order("full_name", {
            ascending: true,
          }),

        supabase
          .from("orders")
          .select(
            `
              id,
              user_id,
              status,
              created_at
            `,
          ),

        supabase
          .from("support_tickets")
          .select(
            `
              id,
              user_id,
              status
            `,
          ),
      ]);

      if (profilesResult.error) {
        throw profilesResult.error;
      }

      if (ordersResult.error) {
        throw ordersResult.error;
      }

      if (ticketsResult.error) {
        throw ticketsResult.error;
      }

      const orders = ordersResult.data || [];
      const tickets = ticketsResult.data || [];

      const customerRows =
        (profilesResult.data || []).map(
          (profile) => {
            const customerOrders =
              orders.filter(
                (order) =>
                  order.user_id === profile.id,
              );

            const customerTickets =
              tickets.filter(
                (ticket) =>
                  ticket.user_id === profile.id,
              );

            const activeTickets =
              customerTickets.filter(
                (ticket) =>
                  ticket.status === "open" ||
                  ticket.status ===
                    "in_progress",
              ).length;

            const latestOrderDate =
              customerOrders
                .map((order) =>
                  order.created_at
                    ? new Date(
                        order.created_at,
                      ).getTime()
                    : 0,
                )
                .sort(
                  (first, second) =>
                    second - first,
                )[0] || 0;

            return {
              ...profile,
              orderCount:
                customerOrders.length,
              supportCount:
                customerTickets.length,
              activeTicketCount:
                activeTickets,
              latestOrderDate,
            };
          },
        );

      setCustomers(customerRows);
    } catch (loadError) {
      setError(
        loadError.message ||
          "Unable to load customer records.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const term = searchTerm
      .trim()
      .toLowerCase();

    if (!term) {
      return customers;
    }

    return customers.filter((customer) => {
      const searchableValues = [
        customer.full_name,
        customer.phone,
        customer.whatsapp_number,
        customer.address_line,
        customer.city,
        customer.district,
        customer.state,
        customer.postal_code,
      ];

      return searchableValues.some((value) =>
        value
          ?.toString()
          .toLowerCase()
          .includes(term),
      );
    });
  }, [customers, searchTerm]);

  const totalOrders = customers.reduce(
    (total, customer) =>
      total + customer.orderCount,
    0,
  );

  const activeSupportTickets =
    customers.reduce(
      (total, customer) =>
        total +
        customer.activeTicketCount,
      0,
    );

  const customersWithPhone =
    customers.filter(
      (customer) =>
        customer.phone ||
        customer.whatsapp_number,
    ).length;

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Not available";
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateValue));
  };

  const getAddress = (customer) => {
    return [
      customer.address_line,
      customer.city,
      customer.district,
      customer.state,
      customer.postal_code,
    ]
      .filter(Boolean)
      .join(", ");
  };

  const getInitials = (name) => {
    const words = (name || "Customer")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return words
      .slice(0, 2)
      .map((word) =>
        word.charAt(0).toUpperCase(),
      )
      .join("");
  };

  return (
    <div className="admin-customers-page">
      <section className="admin-orders-hero">
        <div>
          <span>CUSTOMER MANAGEMENT</span>
          <h1>Registered Customers</h1>
          <p>
            Review customer contact details,
            addresses, order activity and support
            history.
          </p>
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={loadCustomers}
          disabled={isLoading}
        >
          <RefreshCw size={18} />
          Refresh Customers
        </button>
      </section>

      <section className="admin-order-summary-grid">
        <article>
          <Users size={22} />

          <div>
            <span>Total Customers</span>
            <strong>{customers.length}</strong>
          </div>
        </article>

        <article>
          <ClipboardList size={22} />

          <div>
            <span>Total Orders</span>
            <strong>{totalOrders}</strong>
          </div>
        </article>

        <article>
          <Headphones size={22} />

          <div>
            <span>Active Tickets</span>
            <strong>
              {activeSupportTickets}
            </strong>
          </div>
        </article>

        <article>
          <Phone size={22} />

          <div>
            <span>Contact Available</span>
            <strong>
              {customersWithPhone}
            </strong>
          </div>
        </article>
      </section>

      <section className="admin-orders-panel">
        <div className="admin-orders-toolbar">
          <div>
            <span>CUSTOMER DIRECTORY</span>
            <h2>Customer Accounts</h2>
          </div>

          <div className="admin-orders-search admin-customer-search">
            <Search size={18} />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value,
                )
              }
              placeholder="Search name, phone, village, district..."
            />
          </div>
        </div>

        {error && (
          <div className="admin-order-message error">
            <AlertCircle size={19} />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="admin-orders-loading">
            <Users size={28} />
            <span>
              Loading customer accounts...
            </span>
          </div>
        ) : filteredCustomers.length > 0 ? (
          <div className="admin-customer-list">
            {filteredCustomers.map(
              (customer) => (
                <article
                  key={customer.id}
                  className="admin-customer-card"
                >
                  <div className="admin-customer-main">
                    <div className="admin-customer-avatar">
                      {getInitials(
                        customer.full_name,
                      )}
                    </div>

                    <div className="admin-customer-copy">
                      <span>
                        Registered Customer
                      </span>

                      <h3>
                        {customer.full_name ||
                          "Unnamed Customer"}
                      </h3>

                      <p>
                        {customer.phone ||
                          customer.whatsapp_number ||
                          "Phone number not saved"}
                      </p>
                    </div>
                  </div>

                  <div className="admin-customer-stats">
                    <div>
                      <span>Orders</span>
                      <strong>
                        {customer.orderCount}
                      </strong>
                    </div>

                    <div>
                      <span>Tickets</span>
                      <strong>
                        {customer.supportCount}
                      </strong>
                    </div>
                  </div>

                  <div className="admin-customer-location">
                    <MapPin size={17} />

                    <span>
                      {customer.city ||
                        customer.district ||
                        "Address not saved"}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="admin-view-order-button"
                    onClick={() =>
                      setSelectedCustomer(
                        customer,
                      )
                    }
                  >
                    <UserRound size={17} />
                    View Details
                  </button>
                </article>
              ),
            )}
          </div>
        ) : (
          <div className="admin-orders-empty">
            <Users size={34} />
            <h3>No Customers Found</h3>
            <p>
              No customer records match your
              search.
            </p>
          </div>
        )}
      </section>

      {selectedCustomer && (
        <div
          className="admin-order-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedCustomer(null);
            }
          }}
        >
          <section
            className="admin-customer-modal"
            role="dialog"
            aria-modal="true"
          >
            <header className="admin-order-modal-header">
              <div>
                <span>CUSTOMER PROFILE</span>

                <h2>
                  {selectedCustomer.full_name ||
                    "Customer Details"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedCustomer(null)
                }
                aria-label="Close customer details"
              >
                <X size={21} />
              </button>
            </header>

            <div className="admin-customer-modal-content">
              <div className="admin-customer-profile-summary">
                <div className="admin-customer-avatar large">
                  {getInitials(
                    selectedCustomer.full_name,
                  )}
                </div>

                <div>
                  <span>Customer Account</span>

                  <h3>
                    {selectedCustomer.full_name ||
                      "Unnamed Customer"}
                  </h3>

                  <p>
                    Profile updated:{" "}
                    {formatDate(
                      selectedCustomer
                        .profile_updated_at,
                    )}
                  </p>
                </div>
              </div>

              <div className="admin-customer-detail-grid">
                <div>
                  <span>Phone Number</span>
                  <strong>
                    {selectedCustomer.phone ||
                      "Not saved"}
                  </strong>
                </div>

                <div>
                  <span>WhatsApp Number</span>
                  <strong>
                    {selectedCustomer
                      .whatsapp_number ||
                      "Not saved"}
                  </strong>
                </div>

                <div>
                  <span>Total Orders</span>
                  <strong>
                    {selectedCustomer.orderCount}
                  </strong>
                </div>

                <div>
                  <span>Support Tickets</span>
                  <strong>
                    {
                      selectedCustomer.supportCount
                    }
                  </strong>
                </div>

                <div>
                  <span>Latest Order</span>
                  <strong>
                    {selectedCustomer
                      .latestOrderDate
                      ? formatDate(
                          selectedCustomer
                            .latestOrderDate,
                        )
                      : "No orders yet"}
                  </strong>
                </div>

                <div>
                  <span>Active Tickets</span>
                  <strong>
                    {
                      selectedCustomer
                        .activeTicketCount
                    }
                  </strong>
                </div>
              </div>

              <div className="admin-customer-address-card">
                <MapPin size={20} />

                <div>
                  <span>Saved Address</span>

                  <p>
                    {getAddress(
                      selectedCustomer,
                    ) ||
                      "Customer has not saved an address yet."}
                  </p>
                </div>
              </div>

              <div className="admin-customer-contact-actions">
                {selectedCustomer.phone && (
                  <a
                    href={`tel:${selectedCustomer.phone}`}
                  >
                    <Phone size={18} />
                    Call Customer
                  </a>
                )}

                {(selectedCustomer
                  .whatsapp_number ||
                  selectedCustomer.phone) && (
                  <a
                    href={`https://wa.me/91${(
                      selectedCustomer
                        .whatsapp_number ||
                      selectedCustomer.phone
                    ).replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Phone size={18} />
                    Open WhatsApp
                  </a>
                )}
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminCustomers;
