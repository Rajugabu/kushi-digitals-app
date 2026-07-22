import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Headphones,
  Mail,
  MessageCircle,
  PackageCheck,
  Phone,
  Send,
  UploadCloud,
  WalletCards,
} from "lucide-react";

import { supabase } from "../../services/supabase";

const supportCategories = [
  {
    id: "order",
    label: "Order Support",
    description: "Order status, delivery or service requirement",
    icon: PackageCheck,
  },
  {
    id: "payment",
    label: "Payment & Wallet",
    description: "Payment, earnings or withdrawal-related issue",
    icon: WalletCards,
  },
  {
    id: "upload",
    label: "Photo Upload",
    description: "Photo upload, preview or download problem",
    icon: UploadCloud,
  },
  {
    id: "general",
    label: "General Enquiry",
    description: "Any other question or customer assistance",
    icon: MessageCircle,
  },
];

function Support() {
  const outletContext = useOutletContext();

  const user = outletContext?.user ?? null;
  const displayName =
    outletContext?.displayName ?? "Customer";

  const [selectedCategory, setSelectedCategory] =
    useState("order");

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [tickets, setTickets] = useState([]);
  const [ticketFilter, setTicketFilter] =
    useState("all");
  const [isLoadingTickets, setIsLoadingTickets] =
    useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTickets = async () => {
      try {
        setIsLoadingTickets(true);

        if (!user?.id) {
          if (isMounted) {
            setTickets([]);
          }
          return;
        }

        const { data, error } = await supabase
          .from("support_tickets")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        if (isMounted) {
          setTickets(data || []);
        }
      } catch (loadError) {
        if (isMounted) {
          setMessage(
            loadError.message ||
              "Unable to load support tickets.",
          );
          setMessageType("error");
        }
      } finally {
        if (isMounted) {
          setIsLoadingTickets(false);
        }
      }
    };

    loadTickets();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const selectedCategoryDetails = useMemo(() => {
    return supportCategories.find(
      (category) => category.id === selectedCategory,
    );
  }, [selectedCategory]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setMessageType("");

    if (!user?.id) {
      setMessage(
        "Please login before submitting a support request.",
      );
      setMessageType("error");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);

    const subject =
      formData.get("subject")?.trim();
    const supportMessage =
      formData.get("supportMessage")?.trim();

    if (!subject || !supportMessage) {
      setMessage(
        "Please enter both the subject and support message.",
      );
      setMessageType("error");
      return;
    }

    try {
      setIsSubmitting(true);

      const {
        data: savedTicket,
        error: ticketError,
      } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          subject,
          message: supportMessage,
          status: "open",
          priority:
            selectedCategory === "payment"
              ? "high"
              : "normal",
        })
        .select("*")
        .single();

      if (ticketError) {
        throw ticketError;
      }

      setTickets((currentTickets) => [
        savedTicket,
        ...currentTickets,
      ]);

      setMessage(
        "Your support ticket was submitted successfully.",
      );
      setMessageType("success");
      form.reset();
      setSelectedCategory("order");
    } catch (submitError) {
      setMessage(
        submitError.message ||
          "Unable to submit your support ticket.",
      );
      setMessageType("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTickets = useMemo(() => {
    if (ticketFilter === "all") {
      return tickets;
    }

    return tickets.filter(
      (ticket) => ticket.status === ticketFilter,
    );
  }, [tickets, ticketFilter]);

  const formatTicketDate = (dateValue) => {
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

  const getTicketStatusLabel = (status) => {
    const labels = {
      open: "Open",
      in_progress: "In Progress",
      resolved: "Resolved",
      closed: "Closed",
    };

    return labels[status] || status;
  };

  const whatsappText = encodeURIComponent(
    `Hello Kushi Digitals,

I need customer support.

Customer Name: ${displayName}
Email: ${user?.email || "Not available"}
Category: ${
      selectedCategoryDetails?.label || "General Enquiry"
    }

Please assist me.`,
  );

  const whatsappLink = `https://wa.me/917337471733?text=${whatsappText}`;

  return (
    <div className="customer-support-page">
      <section className="dashboard-page-header support-page-header">
        <div>
          <span>Customer Support</span>

          <h1>How Can We Help You?</h1>

          <p>
            Contact Kushi Digitals regarding service orders,
            payments, wallet activity, photo uploads or any other
            customer-related enquiry.
          </p>
        </div>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="primary-button support-header-button"
        >
          <MessageCircle size={18} />
          Chat on WhatsApp
        </a>
      </section>

      <section className="support-summary-grid">
        <article className="support-summary-card">
          <div className="support-summary-icon purple">
            <Headphones size={23} />
          </div>

          <div>
            <span>Customer Assistance</span>
            <strong>Personal Support</strong>
            <p>
              Guidance for orders, photos and digital services.
            </p>
          </div>
        </article>

        <article className="support-summary-card">
          <div className="support-summary-icon cyan">
            <Clock3 size={23} />
          </div>

          <div>
            <span>Support Hours</span>
            <strong>9:00 AM – 8:00 PM</strong>
            <p>
              Support availability may vary on holidays.
            </p>
          </div>
        </article>

        <article className="support-summary-card">
          <div className="support-summary-icon green">
            <CheckCircle2 size={23} />
          </div>

          <div>
            <span>Response Method</span>
            <strong>WhatsApp / Phone</strong>
            <p>
              We will respond using your registered details.
            </p>
          </div>
        </article>
      </section>

      <section className="support-content-grid">
        <article className="dashboard-panel support-form-panel">
          <div className="support-panel-heading">
            <div>
              <span>New Support Request</span>
              <h2>Submit Your Issue</h2>

              <p>
                Select a support category and explain your issue
                clearly so we can assist you faster.
              </p>
            </div>

            <div className="support-panel-heading-icon">
              <Headphones size={25} />
            </div>
          </div>

          {message && (
            <div
              className={`support-message ${
                messageType === "error"
                  ? "error"
                  : "success"
              }`}
              role="alert"
            >
              {messageType === "error" ? (
                <AlertCircle size={19} />
              ) : (
                <CheckCircle2 size={19} />
              )}

              <span>{message}</span>
            </div>
          )}

          <form
            className="support-form"
            onSubmit={handleSubmit}
          >
            <div className="support-customer-details">
              <div>
                <span>Customer Name</span>
                <strong>{displayName}</strong>
              </div>

              <div>
                <span>Registered Email</span>
                <strong>
                  {user?.email || "Not available"}
                </strong>
              </div>
            </div>

            <div className="support-category-group">
              <label>Choose Support Category</label>

              <div className="support-category-grid">
                {supportCategories.map((category) => {
                  const Icon = category.icon;
                  const isActive =
                    selectedCategory === category.id;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      className={`support-category-card ${
                        isActive ? "active" : ""
                      }`}
                      onClick={() =>
                        setSelectedCategory(category.id)
                      }
                    >
                      <span>
                        <Icon size={21} />
                      </span>

                      <div>
                        <strong>{category.label}</strong>
                        <small>
                          {category.description}
                        </small>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <input
              type="hidden"
              name="category"
              value={selectedCategory}
            />

            <div className="auth-input-group">
              <label htmlFor="supportSubject">
                Subject
              </label>

              <div className="auth-input-wrapper">
                <MessageCircle size={19} />

                <input
                  id="supportSubject"
                  name="subject"
                  type="text"
                  placeholder="Enter a short subject"
                  maxLength="120"
                  required
                />
              </div>
            </div>

            <div className="support-textarea-group">
              <label htmlFor="supportMessage">
                Explain Your Issue
              </label>

              <textarea
                id="supportMessage"
                name="supportMessage"
                placeholder="Describe your order, payment, photo upload or service issue clearly..."
                rows="7"
                maxLength="1500"
                required
              />
            </div>

            <button
              type="submit"
              className="primary-button support-submit-button"
              disabled={isSubmitting}
            >
              <Send size={18} />

              {isSubmitting
                ? "Submitting Request..."
                : "Submit Support Request"}
            </button>

            <p className="support-form-note">
              Your support request will be connected to your
              customer account.
            </p>
          </form>
        </article>

        <aside className="support-side-column">
          <article className="dashboard-panel support-contact-card">
            <div className="support-side-icon">
              <MessageCircle size={23} />
            </div>

            <span>Quick Assistance</span>
            <h2>Contact Kushi Digitals</h2>

            <p>
              For faster assistance, contact us directly through
              WhatsApp, phone or email.
            </p>

            <div className="support-contact-list">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={19} />

                <span>
                  <small>WhatsApp Support</small>
                  <strong>7337471733</strong>
                </span>
              </a>

              <a href="tel:+917337471733">
                <Phone size={19} />

                <span>
                  <small>Call Customer Support</small>
                  <strong>7337471733</strong>
                </span>
              </a>

              <a href="mailto:kushidigitals8@gmail.com">
                <Mail size={19} />

                <span>
                  <small>Email Support</small>
                  <strong>
                    kushidigitals8@gmail.com
                  </strong>
                </span>
              </a>
            </div>
          </article>

          <article className="dashboard-panel support-guide-card">
            <div className="support-side-icon">
              <CheckCircle2 size={23} />
            </div>

            <span>Before Contacting Us</span>
            <h2>Provide Clear Details</h2>

            <ul>
              <li>
                Mention your order ID when available.
              </li>

              <li>
                Explain the exact issue clearly.
              </li>

              <li>
                Attach the relevant photo through WhatsApp.
              </li>

              <li>
                Use your registered phone number or email.
              </li>
            </ul>
          </article>
        </aside>
      </section>

      <section className="dashboard-panel support-history-panel">
        <div className="support-history-header">
          <div>
            <span>Support Activity</span>
            <h2>Your Support Tickets</h2>
          </div>

          <select
            aria-label="Filter support tickets"
            value={ticketFilter}
            onChange={(event) =>
              setTicketFilter(event.target.value)
            }
          >
            <option value="all">All Tickets</option>
            <option value="open">Open</option>
            <option value="in_progress">
              In Progress
            </option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {isLoadingTickets ? (
          <div className="support-empty-state">
            <Clock3 size={28} />
            <h3>Loading Support Tickets...</h3>
          </div>
        ) : filteredTickets.length > 0 ? (
          <div className="customer-support-ticket-list">
            {filteredTickets.map((ticket) => (
              <article
                key={ticket.id}
                className="customer-support-ticket-card"
              >
                <div className="customer-support-ticket-header">
                  <div>
                    <span>
                      {formatTicketDate(ticket.created_at)}
                    </span>
                    <h3>{ticket.subject}</h3>
                  </div>

                  <strong
                    className={`support-ticket-status ${ticket.status}`}
                  >
                    {getTicketStatusLabel(ticket.status)}
                  </strong>
                </div>

                <p>{ticket.message}</p>

                {ticket.admin_reply && (
                  <div className="customer-support-admin-reply">
                    <strong>Kushi Digitals Reply</strong>
                    <p>{ticket.admin_reply}</p>
                    <span>
                      {formatTicketDate(ticket.replied_at)}
                    </span>
                  </div>
                )}
              </article>
            ))}
          </div>
        ) : (
          <div className="support-empty-state">
            <div>
              <Headphones size={31} />
            </div>
            <h3>No Support Tickets Yet</h3>
            <p>
              Your submitted support requests and their status will
              appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

export default Support;