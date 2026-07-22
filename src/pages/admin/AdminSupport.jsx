import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Headphones,
  MessageCircle,
  RefreshCw,
  Search,
  UserRound,
} from "lucide-react";

import { supabase } from "../../services/supabase";

const ticketStatuses = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

function AdminSupport() {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [replyText, setReplyText] = useState("");
  const [ticketStatus, setTicketStatus] = useState("open");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadTickets = async () => {
    try {
      setIsLoading(true);
      setError("");

      const { data, error: ticketsError } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (ticketsError) throw ticketsError;
      setTickets(data || []);
    } catch (loadError) {
      setError(loadError.message || "Unable to load support tickets.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const filteredTickets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return tickets.filter((ticket) => {
      const matchesStatus =
        statusFilter === "all" || ticket.status === statusFilter;

      const matchesSearch =
        !term ||
        ticket.subject?.toLowerCase().includes(term) ||
        ticket.message?.toLowerCase().includes(term) ||
        ticket.id?.toLowerCase().includes(term);

      return matchesStatus && matchesSearch;
    });
  }, [tickets, searchTerm, statusFilter]);

  const openCount = tickets.filter((ticket) => ticket.status === "open").length;
  const progressCount = tickets.filter(
    (ticket) => ticket.status === "in_progress",
  ).length;
  const resolvedCount = tickets.filter(
    (ticket) => ticket.status === "resolved",
  ).length;

  const formatDate = (dateValue) => {
    if (!dateValue) return "Date unavailable";

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateValue));
  };

  const getStatusLabel = (status) =>
    ticketStatuses.find((item) => item.value === status)?.label || status;

  const openTicket = (ticket) => {
    setSelectedTicket(ticket);
    setReplyText(ticket.admin_reply || "");
    setTicketStatus(ticket.status || "open");
    setError("");
    setSuccessMessage("");
  };

  const closeTicket = () => {
    if (isSaving) return;
    setSelectedTicket(null);
    setReplyText("");
    setError("");
    setSuccessMessage("");
  };

  const saveReply = async () => {
    if (!selectedTicket) return;

    if (!replyText.trim()) {
      setError("Please enter an admin reply.");
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");

      const { data: updatedTicket, error: updateError } = await supabase
        .from("support_tickets")
        .update({
          admin_reply: replyText.trim(),
          status: ticketStatus,
          replied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedTicket.id)
        .select("*")
        .single();

      if (updateError) throw updateError;

      setTickets((currentTickets) =>
        currentTickets.map((ticket) =>
          ticket.id === updatedTicket.id ? updatedTicket : ticket,
        ),
      );

      setSelectedTicket(updatedTicket);
      setSuccessMessage("Support reply saved successfully.");
    } catch (saveError) {
      setError(saveError.message || "Unable to save support reply.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-support-page">
      <section className="admin-orders-hero">
        <div>
          <span>SUPPORT MANAGEMENT</span>
          <h1>Customer Support Tickets</h1>
          <p>Review customer issues, update ticket status and send replies.</p>
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={loadTickets}
          disabled={isLoading}
        >
          <RefreshCw size={18} />
          Refresh Tickets
        </button>
      </section>

      <section className="admin-order-summary-grid">
        <article><Headphones size={22} /><div><span>Open</span><strong>{openCount}</strong></div></article>
        <article><Clock3 size={22} /><div><span>In Progress</span><strong>{progressCount}</strong></div></article>
        <article><CheckCircle2 size={22} /><div><span>Resolved</span><strong>{resolvedCount}</strong></div></article>
        <article><UserRound size={22} /><div><span>Total Tickets</span><strong>{tickets.length}</strong></div></article>
      </section>

      <section className="admin-orders-panel">
        <div className="admin-orders-toolbar">
          <div><span>ALL SUPPORT REQUESTS</span><h2>Ticket Directory</h2></div>

          <div className="admin-orders-filters">
            <div className="admin-orders-search">
              <Search size={18} />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search subject or message..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All Statuses</option>
              {ticketStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && !selectedTicket && (
          <div className="admin-order-message error">
            <AlertCircle size={19} /><span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="admin-orders-loading">
            <Clock3 size={25} /><span>Loading support tickets...</span>
          </div>
        ) : filteredTickets.length > 0 ? (
          <div className="admin-support-ticket-list">
            {filteredTickets.map((ticket) => (
              <article key={ticket.id} className="admin-support-ticket-card">
                <div>
                  <span>{formatDate(ticket.created_at)}</span>
                  <h3>{ticket.subject}</h3>
                  <p>{ticket.message}</p>
                </div>

                <div>
                  <strong className={`support-ticket-status ${ticket.status}`}>
                    {getStatusLabel(ticket.status)}
                  </strong>
                  <button
                    type="button"
                    className="admin-view-order-button"
                    onClick={() => openTicket(ticket)}
                  >
                    <MessageCircle size={17} /> Manage
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-orders-empty">
            <Headphones size={34} />
            <h3>No Support Tickets Found</h3>
            <p>No customer support requests match the selected filters.</p>
          </div>
        )}
      </section>

      {selectedTicket && (
        <div
          className="admin-order-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeTicket();
          }}
        >
          <section className="admin-support-modal" role="dialog" aria-modal="true">
            <header className="admin-order-modal-header">
              <div><span>SUPPORT TICKET</span><h2>{selectedTicket.subject}</h2></div>
              <button type="button" onClick={closeTicket}>×</button>
            </header>

            <div className="admin-support-modal-content">
              <div className="admin-support-ticket-message">
                <span>Customer Message</span>
                <p>{selectedTicket.message}</p>
                <small>{formatDate(selectedTicket.created_at)}</small>
              </div>

              <div className="admin-order-field">
                <label htmlFor="ticketStatus">Ticket Status</label>
                <select
                  id="ticketStatus"
                  value={ticketStatus}
                  onChange={(event) => setTicketStatus(event.target.value)}
                >
                  {ticketStatuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-order-field">
                <label htmlFor="adminReply">Admin Reply</label>
                <textarea
                  id="adminReply"
                  rows="7"
                  value={replyText}
                  onChange={(event) => setReplyText(event.target.value)}
                  placeholder="Enter your reply to the customer..."
                />
              </div>

              {error && <div className="admin-order-message error"><AlertCircle size={18} /><span>{error}</span></div>}
              {successMessage && <div className="admin-order-message success"><CheckCircle2 size={18} /><span>{successMessage}</span></div>}

              <button
                type="button"
                className="admin-save-order-button"
                onClick={saveReply}
                disabled={isSaving}
              >
                <CheckCircle2 size={18} />
                {isSaving ? "Saving Reply..." : "Save Reply"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminSupport;
