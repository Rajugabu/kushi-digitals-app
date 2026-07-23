import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { Link } from "react-router-dom";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileImage,
  FileText,
  IndianRupee,
  Printer,
  MapPin,
  MessageCircle,
  PackageCheck,
  PhoneCall,
  Search,
  Truck,
  X,
  XCircle,
} from "lucide-react";

import { supabase } from "../../services/supabase";
import { createWhatsAppLink } from "../../config/business";

const progressStatuses = [
  {
    value: "pending",
    label: "Pending",
  },
  {
    value: "confirmed",
    label: "Confirmed",
  },
  {
    value: "in_progress",
    label: "In Progress",
  },
  {
    value: "ready",
    label: "Ready",
  },
  {
    value: "completed",
    label: "Completed",
  },
];

function Orders() {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] =
    useState("");

  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const [invoiceOrder, setInvoiceOrder] =
    useState(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadOrders = async () => {
      try {
        setIsLoading(true);
        setError("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          throw new Error(
            "Please login to view your orders.",
          );
        }

        const {
          data,
          error: ordersError,
        } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (ordersError) {
          throw ordersError;
        }

        const orderRows = data || [];
        const orderIds = orderRows.map(
          (order) => order.id,
        );

        let orderFileRows = [];

        if (orderIds.length > 0) {
          const {
            data: filesData,
            error: filesError,
          } = await supabase
            .from("order_files")
            .select(
              `
                id,
                order_id,
                file_type,
                storage_bucket,
                file_path,
                file_name,
                file_size,
                mime_type,
                created_at
              `,
            )
            .in("order_id", orderIds)
            .order("created_at", {
              ascending: true,
            });

          if (filesError) {
            throw filesError;
          }

          orderFileRows = filesData || [];
        }

        const originalPaths = orderFileRows
          .filter(
            (file) =>
              file.storage_bucket ===
                "order-photos" &&
              file.file_path,
          )
          .map((file) => file.file_path);

        const completedPaths = orderFileRows
          .filter(
            (file) =>
              file.storage_bucket ===
                "completed-photos" &&
              file.file_path,
          )
          .map((file) => file.file_path);

        const originalSignedUrlMap =
          new Map();

        const completedSignedUrlMap =
          new Map();

        if (originalPaths.length > 0) {
          const {
            data: signedFiles,
            error: signedUrlError,
          } = await supabase.storage
            .from("order-photos")
            .createSignedUrls(
              originalPaths,
              60 * 60,
            );

          if (signedUrlError) {
            console.error(
              "Unable to create original photo previews:",
              signedUrlError,
            );
          } else {
            (signedFiles || []).forEach(
              (file) => {
                originalSignedUrlMap.set(
                  file.path,
                  file.signedUrl,
                );
              },
            );
          }
        }

        if (completedPaths.length > 0) {
          const {
            data: signedFiles,
            error: signedUrlError,
          } = await supabase.storage
            .from("completed-photos")
            .createSignedUrls(
              completedPaths,
              60 * 60,
            );

          if (signedUrlError) {
            console.error(
              "Unable to create completed photo previews:",
              signedUrlError,
            );
          } else {
            (signedFiles || []).forEach(
              (file) => {
                completedSignedUrlMap.set(
                  file.path,
                  file.signedUrl,
                );
              },
            );
          }
        }

        const filesByOrderId = new Map();

        orderFileRows.forEach((file) => {
          const currentGroup =
            filesByOrderId.get(file.order_id) || {
              originalFiles: [],
              completedFiles: [],
            };

          const preparedFile = {
            ...file,
            signedUrl:
              file.storage_bucket ===
              "completed-photos"
                ? completedSignedUrlMap.get(
                    file.file_path,
                  ) || ""
                : originalSignedUrlMap.get(
                    file.file_path,
                  ) || "",
          };

          if (file.file_type === "completed") {
            currentGroup.completedFiles.push(
              preparedFile,
            );
          } else {
            currentGroup.originalFiles.push(
              preparedFile,
            );
          }

          filesByOrderId.set(
            file.order_id,
            currentGroup,
          );
        });

        const preparedOrders =
          orderRows.map((order) => {
            const groupedFiles =
              filesByOrderId.get(order.id) || {
                originalFiles: [],
                completedFiles: [],
              };

            const originalFiles = [
              ...groupedFiles.originalFiles,
            ];

            const completedFiles = [
              ...groupedFiles.completedFiles,
            ];

            if (
              originalFiles.length === 0 &&
              order.photo_path
            ) {
              originalFiles.push({
                id: `${order.id}-legacy-original`,
                order_id: order.id,
                file_type: "original",
                storage_bucket: "order-photos",
                file_path: order.photo_path,
                file_name:
                  order.photo_name ||
                  "Original Photo",
                signedUrl: "",
              });
            }

            if (
              completedFiles.length === 0 &&
              order.completed_photo_path
            ) {
              completedFiles.push({
                id: `${order.id}-legacy-completed`,
                order_id: order.id,
                file_type: "completed",
                storage_bucket:
                  "completed-photos",
                file_path:
                  order.completed_photo_path,
                file_name:
                  order.completed_photo_name ||
                  "Completed Photo",
                signedUrl: "",
              });
            }

            return {
              ...order,
              originalFiles,
              completedFiles,
            };
          });

        if (isMounted) {
          setOrders(preparedOrders);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError.message ||
              "Unable to load your orders. Please try again.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredOrders = useMemo(() => {
    const term = searchTerm
      .trim()
      .toLowerCase();

    if (!term) {
      return orders;
    }

    return orders.filter((order) => {
      const shortId = order.id
        ?.replace(/-/g, "")
        .slice(0, 10)
        .toLowerCase();

      return (
        order.service
          ?.toLowerCase()
          .includes(term) ||
        order.status
          ?.toLowerCase()
          .includes(term) ||
        shortId?.includes(term)
      );
    });
  }, [orders, searchTerm]);

  const activeOrders = orders.filter(
    (order) =>
      [
        "pending",
        "confirmed",
        "in_progress",
        "ready",
      ].includes(order.status),
  ).length;

  const completedOrders = orders.filter(
    (order) =>
      order.status === "completed",
  ).length;

  const cancelledOrders = orders.filter(
    (order) =>
      ["cancelled", "rejected"].includes(
        order.status,
      ),
  ).length;

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Date unavailable";
    }

    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      },
    ).format(new Date(dateValue));
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

  const getShortOrderId = (orderId) => {
    return orderId
      .replace(/-/g, "")
      .slice(0, 10)
      .toUpperCase();
  };

  const formatPrice = (price) => {
    if (
      price === null ||
      price === undefined ||
      price === ""
    ) {
      return "Not confirmed";
    }

    return `₹${Number(price).toLocaleString(
      "en-IN",
    )}`;
  };

  const getPaymentStatusLabel = (status) => {
    const labels = {
      pending: "Pending",
      partial: "Partial",
      paid: "Paid",
      refunded: "Refunded",
    };

    return labels[status] || "Pending";
  };

  const getPaymentMethodLabel = (method) => {
    const labels = {
      cash: "Cash",
      upi: "UPI",
      bank_transfer: "Bank Transfer",
      card: "Card",
      other: "Other",
    };

    return labels[method] || "Not Selected";
  };

  const formatCurrency = (value) => {
    return `₹${Number(value || 0).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      },
    )}`;
  };

  const getPayableAmount = (order) => {
    return Number(
      order.final_price ??
        order.estimated_price ??
        0,
    ) || 0;
  };

  const getBalanceAmount = (order) => {
    return Math.max(
      getPayableAmount(order) -
        Number(order.amount_paid || 0),
      0,
    );
  };

  const openInvoice = (order) => {
    setInvoiceOrder(order);
  };

  const closeInvoice = () => {
    setInvoiceOrder(null);
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const getProgressIndex = (status) => {
    return progressStatuses.findIndex(
      (item) => item.value === status,
    );
  };

  const getExpiryDetails = (expiresAt) => {
    if (!expiresAt) {
      return {
        isExpired: false,
        daysRemaining: null,
        label:
          "The 60-day download period starts after the order is completed.",
      };
    }

    const today = new Date();
    const expiryDate = new Date(expiresAt);

    const todayStart = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );

    const expiryStart = new Date(
      expiryDate.getFullYear(),
      expiryDate.getMonth(),
      expiryDate.getDate(),
    );

    const differenceInDays = Math.ceil(
      (expiryStart.getTime() -
        todayStart.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (differenceInDays < 0) {
      return {
        isExpired: true,
        daysRemaining: 0,
        label: "These photos have expired.",
      };
    }

    if (differenceInDays === 0) {
      return {
        isExpired: false,
        daysRemaining: 0,
        label:
          "Expires today — download all photos now.",
      };
    }

    return {
      isExpired: false,
      daysRemaining: differenceInDays,
      label: `${differenceInDays} days remaining`,
    };
  };

  const handleDownloadFile = async (file) => {
    try {
      setError("");

      const { data, error: downloadError } =
        await supabase.storage
          .from(file.storage_bucket)
          .download(file.file_path);

      if (downloadError) {
        throw downloadError;
      }

      const objectUrl =
        URL.createObjectURL(data);

      const anchor =
        document.createElement("a");

      anchor.href = objectUrl;
      anchor.download =
        file.file_name ||
        "kushi-digitals-photo";

      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      URL.revokeObjectURL(objectUrl);
    } catch (downloadError) {
      setError(
        downloadError.message ||
          "Unable to download this photo.",
      );
    }
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
  };

  const closeOrderDetails = () => {
    setSelectedOrder(null);
  };

  const handleWhatsAppSupport = (order) => {
    const message = `
Hello Kushi Digitals,

I need help regarding my service order.

Order ID: KD-${getShortOrderId(
      order.id,
    )}
Service: ${order.service}
Service Option: ${
      order.size || "Not Applicable"
    }
Current Status: ${getStatusLabel(
      order.status,
    )}

Please check and guide me.
    `.trim();

    window.open(
      createWhatsAppLink(message),
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="orders-page">
      <section className="dashboard-page-header">
        <div>
          <span>My Orders</span>

          <h1>
            Track Your Service Orders
          </h1>

          <p>
            View current, completed and
            cancelled Kushi Digitals service
            orders from one place.
          </p>
        </div>

        <Link
          to="/book-service"
          className="primary-button"
        >
          <PackageCheck size={18} />
          Place New Order
          <ArrowRight size={18} />
        </Link>
      </section>

      <section className="orders-summary-grid">
        <article className="orders-summary-card">
          <div className="orders-summary-icon purple">
            <Clock3 size={22} />
          </div>

          <span>Active Orders</span>
          <strong>{activeOrders}</strong>

          <p>
            Orders currently being processed
          </p>
        </article>

        <article className="orders-summary-card">
          <div className="orders-summary-icon green">
            <CheckCircle2 size={22} />
          </div>

          <span>Completed Orders</span>
          <strong>{completedOrders}</strong>

          <p>
            Successfully delivered services
          </p>
        </article>

        <article className="orders-summary-card">
          <div className="orders-summary-icon red">
            <XCircle size={22} />
          </div>

          <span>Cancelled Orders</span>
          <strong>{cancelledOrders}</strong>

          <p>
            Cancelled or rejected service
            requests
          </p>
        </article>
      </section>

      <section className="dashboard-panel orders-panel">
        <div className="orders-toolbar">
          <div>
            <span>Order History</span>
            <h2>All Orders</h2>
          </div>

          <div className="orders-search">
            <Search size={18} />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value,
                )
              }
              placeholder="Search by order ID or service..."
              aria-label="Search orders"
            />
          </div>
        </div>

        {error && (
          <div className="orders-load-message error">
            <AlertCircle size={19} />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="orders-load-message">
            <Clock3 size={20} />

            <span>
              Loading your orders...
            </span>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="orders-list">
            {filteredOrders.map(
              (order) => {
                const shortOrderId =
                  getShortOrderId(
                    order.id,
                  );

                return (
                  <article
                    key={order.id}
                    className="order-card customer-order-card"
                  >
                    <div className="customer-order-main">
                      <span>
                        KD-{shortOrderId}
                      </span>

                      <h3>
                        {order.service}
                      </h3>

                      <p>
                        {formatDate(
                          order.created_at,
                        )}
                        {" · "}
                        {order.size ||
                          "Not Applicable"}
                        {" · "}
                        Qty {order.quantity}
                      </p>
                    </div>

                    <div className="customer-order-price">
                      <span>
                        Final Price
                      </span>

                      <strong>
                        {formatPrice(
                          order.final_price ??
                            order.estimated_price,
                        )}
                      </strong>
                    </div>

                    <div className="order-card-right">
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

                    <button
                      type="button"
                      className="customer-view-order-button"
                      onClick={() =>
                        openOrderDetails(
                          order,
                        )
                      }
                    >
                      <Eye size={17} />
                      View Details
                    </button>
                  </article>
                );
              },
            )}
          </div>
        ) : (
          <div className="dashboard-empty-state orders-empty-state">
            <div>
              <PackageCheck size={31} />
            </div>

            <h3>No Orders Found</h3>

            <p>
              Once you place a service order,
              its status and details will
              appear here.
            </p>

            <Link
              to="/book-service"
              className="primary-button"
            >
              Book Your First Service
              <ArrowRight size={17} />
            </Link>
          </div>
        )}
      </section>

      {selectedOrder && (
        <div
          className="customer-order-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeOrderDetails();
            }
          }}
        >
          <section
            className="customer-order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-order-title"
          >
            <header className="customer-order-modal-header">
              <div>
                <span>
                  ORDER KD-
                  {getShortOrderId(
                    selectedOrder.id,
                  )}
                </span>

                <h2 id="customer-order-title">
                  {selectedOrder.service}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeOrderDetails}
                aria-label="Close order details"
              >
                <X size={21} />
              </button>
            </header>

            <div className="customer-order-modal-content">
              {[
                "cancelled",
                "rejected",
              ].includes(
                selectedOrder.status,
              ) ? (
                <div className="customer-order-cancelled-note">
                  <XCircle size={21} />

                  <div>
                    <strong>
                      Order{" "}
                      {getStatusLabel(
                        selectedOrder.status,
                      )}
                    </strong>

                    <p>
                      Contact Kushi Digitals
                      for further clarification.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="customer-order-progress">
                  {progressStatuses.map(
                    (step, index) => {
                      const currentIndex =
                        getProgressIndex(
                          selectedOrder.status,
                        );

                      const isCompleted =
                        index <= currentIndex;

                      const isCurrent =
                        index === currentIndex;

                      return (
                        <div
                          key={step.value}
                          className={`customer-progress-step ${
                            isCompleted
                              ? "completed"
                              : ""
                          } ${
                            isCurrent
                              ? "current"
                              : ""
                          }`}
                        >
                          <div>
                            {isCompleted ? (
                              <CheckCircle2
                                size={18}
                              />
                            ) : (
                              <span>
                                {index + 1}
                              </span>
                            )}
                          </div>

                          <strong>
                            {step.label}
                          </strong>
                        </div>
                      );
                    },
                  )}
                </div>
              )}

              <div className="customer-order-detail-grid">
                <article>
                  <PackageCheck size={19} />

                  <div>
                    <span>Service</span>
                    <strong>
                      {
                        selectedOrder.service
                      }
                    </strong>
                  </div>
                </article>

                <article>
                  <FileImage size={19} />

                  <div>
                    <span>Service Option</span>
                    <strong>
                      {selectedOrder.size ||
                        "Not Applicable"}
                    </strong>
                  </div>
                </article>

                <article>
                  <PackageCheck size={19} />

                  <div>
                    <span>Quantity</span>
                    <strong>
                      {
                        selectedOrder.quantity
                      }
                    </strong>
                  </div>
                </article>

                <article>
                  <Truck size={19} />

                  <div>
                    <span>Delivery</span>
                    <strong>
                      {
                        selectedOrder.delivery_type
                      }
                    </strong>
                  </div>
                </article>

                <article>
                  <IndianRupee size={19} />

                  <div>
                    <span>
                      Estimated Price
                    </span>

                    <strong>
                      {formatPrice(
                        selectedOrder.estimated_price,
                      )}
                    </strong>
                  </div>
                </article>

                <article>
                  <IndianRupee size={19} />

                  <div>
                    <span>
                      Final Price
                    </span>

                    <strong>
                      {formatPrice(
                        selectedOrder.final_price,
                      )}
                    </strong>
                  </div>
                </article>

                <article>
                  <FileText size={19} />

                  <div>
                    <span>
                      Invoice Number
                    </span>

                    <strong>
                      {selectedOrder.invoice_number ||
                        "Not Generated"}
                    </strong>
                  </div>
                </article>

                <article>
                  <IndianRupee size={19} />

                  <div>
                    <span>
                      Payment Status
                    </span>

                    <strong>
                      {getPaymentStatusLabel(
                        selectedOrder.payment_status,
                      )}
                    </strong>
                  </div>
                </article>
              </div>

              <div className="customer-order-modal-layout">
                <div className="customer-order-photo-section customer-order-files-section">
                  <div className="customer-order-files-heading">
                    <div>
                      <span>
                        ORIGINAL PHOTOS
                      </span>

                      <strong>
                        {
                          selectedOrder
                            .originalFiles.length
                        }{" "}
                        file(s)
                      </strong>
                    </div>

                    {selectedOrder.files_expire_at && (
                      <small>
                        Available until{" "}
                        {formatDate(
                          selectedOrder
                            .files_expire_at,
                        )}
                      </small>
                    )}
                  </div>

                  {selectedOrder.originalFiles
                    .length > 0 ? (
                    <div className="customer-order-files-grid">
                      {selectedOrder.originalFiles.map(
                        (file, index) => (
                          <article
                            className="customer-order-file-card"
                            key={file.id}
                          >
                            <div className="customer-order-file-preview">
                              {file.signedUrl ? (
                                <img
                                  src={
                                    file.signedUrl
                                  }
                                  alt={
                                    file.file_name
                                  }
                                />
                              ) : (
                                <div>
                                  <FileImage
                                    size={28}
                                  />
                                </div>
                              )}

                              <span>
                                {index + 1}
                              </span>
                            </div>

                            <strong>
                              {file.file_name}
                            </strong>

                            <div className="customer-order-file-actions">
                              {file.signedUrl && (
                                <a
                                  href={
                                    file.signedUrl
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Eye
                                    size={15}
                                  />
                                  View
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadFile(
                                    file,
                                  )
                                }
                              >
                                <Download
                                  size={15}
                                />
                                Download
                              </button>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="customer-order-no-files">
                      <FileImage size={32} />
                      <p>
                        No original photos uploaded
                        with this order.
                      </p>
                    </div>
                  )}

                  <div className="customer-order-files-divider" />

                  <div className="customer-order-files-heading">
                    <div>
                      <span>
                        FINAL PHOTOS
                      </span>

                      <strong>
                        {
                          selectedOrder
                            .completedFiles.length
                        }{" "}
                        file(s)
                      </strong>
                    </div>

                    {selectedOrder.status ===
                      "completed" && (
                      <small>
                        {
                          getExpiryDetails(
                            selectedOrder
                              .files_expire_at,
                          ).label
                        }
                      </small>
                    )}
                  </div>

                  {selectedOrder.completedFiles
                    .length > 0 ? (
                    <div className="customer-order-files-grid">
                      {selectedOrder.completedFiles.map(
                        (file, index) => {
                          const expiry =
                            getExpiryDetails(
                              selectedOrder
                                .files_expire_at,
                            );

                          return (
                            <article
                              className={`customer-order-file-card final ${
                                expiry.isExpired
                                  ? "expired"
                                  : ""
                              }`}
                              key={file.id}
                            >
                              <div className="customer-order-file-preview">
                                {file.signedUrl &&
                                !expiry.isExpired ? (
                                  <img
                                    src={
                                      file.signedUrl
                                    }
                                    alt={
                                      file.file_name
                                    }
                                  />
                                ) : (
                                  <div>
                                    <FileImage
                                      size={28}
                                    />
                                  </div>
                                )}

                                <span>
                                  {index + 1}
                                </span>
                              </div>

                              <strong>
                                {file.file_name}
                              </strong>

                              <div className="customer-order-file-actions">
                                {file.signedUrl &&
                                  !expiry.isExpired && (
                                  <a
                                    href={
                                      file.signedUrl
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Eye
                                      size={15}
                                    />
                                    View
                                  </a>
                                )}

                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDownloadFile(
                                      file,
                                    )
                                  }
                                  disabled={
                                    expiry.isExpired
                                  }
                                >
                                  <Download
                                    size={15}
                                  />
                                  {expiry.isExpired
                                    ? "Expired"
                                    : "Download"}
                                </button>
                              </div>
                            </article>
                          );
                        },
                      )}
                    </div>
                  ) : (
                    <div className="customer-order-no-files">
                      <FileImage size={32} />
                      <p>
                        Final photos are not uploaded
                        yet.
                      </p>
                    </div>
                  )}

                  {selectedOrder.status ===
                    "completed" && (
                    <div
                      className={`customer-order-expiry-banner ${
                        getExpiryDetails(
                          selectedOrder
                            .files_expire_at,
                        ).isExpired
                          ? "expired"
                          : getExpiryDetails(
                                selectedOrder
                                  .files_expire_at,
                              ).daysRemaining !==
                                null &&
                              getExpiryDetails(
                                selectedOrder
                                  .files_expire_at,
                              ).daysRemaining <= 7
                            ? "urgent"
                            : ""
                      }`}
                    >
                      <strong>
                        {selectedOrder
                          .files_expire_at
                          ? `Available Until: ${formatDate(
                              selectedOrder
                                .files_expire_at,
                            )}`
                          : "Expiry Pending"}
                      </strong>

                      <span>
                        {
                          getExpiryDetails(
                            selectedOrder
                              .files_expire_at,
                          ).label
                        }
                      </span>
                    </div>
                  )}
                </div>

                <div className="customer-order-information-section">
                  <span>
                    ORDER INFORMATION
                  </span>

                  <div className="customer-order-current-status">
                    <span>
                      Current Status
                    </span>

                    <strong
                      className={`order-status ${selectedOrder.status}`}
                    >
                      {getStatusLabel(
                        selectedOrder.status,
                      )}
                    </strong>
                  </div>

                  <div className="customer-order-information-item">
                    <Clock3 size={18} />

                    <div>
                      <span>
                        Order Placed On
                      </span>

                      <strong>
                        {formatDate(
                          selectedOrder.created_at,
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="customer-order-information-item">
                    <MapPin size={18} />

                    <div>
                      <span>
                        Service Requirements / Address
                      </span>

                      <p>
                        {selectedOrder.instructions ||
                          "No additional instructions provided."}
                      </p>
                    </div>
                  </div>

                  <div className="customer-invoice-summary-card">
                    <div className="customer-invoice-summary-heading">
                      <div>
                        <span>
                          PAYMENT & INVOICE
                        </span>

                        <strong>
                          {selectedOrder.invoice_number ||
                            "Invoice Pending"}
                        </strong>
                      </div>

                      <span
                        className={`customer-payment-badge ${
                          selectedOrder.payment_status ||
                          "pending"
                        }`}
                      >
                        {getPaymentStatusLabel(
                          selectedOrder.payment_status,
                        )}
                      </span>
                    </div>

                    <div className="customer-invoice-summary-grid">
                      <div>
                        <span>Payable</span>
                        <strong>
                          {formatCurrency(
                            getPayableAmount(
                              selectedOrder,
                            ),
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Paid</span>
                        <strong>
                          {formatCurrency(
                            selectedOrder.amount_paid,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Balance</span>
                        <strong>
                          {formatCurrency(
                            getBalanceAmount(
                              selectedOrder,
                            ),
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="customer-invoice-meta">
                      <div>
                        <span>Payment Method</span>
                        <strong>
                          {getPaymentMethodLabel(
                            selectedOrder.payment_method,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Payment Reference</span>
                        <strong>
                          {selectedOrder.payment_reference ||
                            "Not Available"}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="customer-view-invoice-button"
                      onClick={() =>
                        openInvoice(selectedOrder)
                      }
                    >
                      <FileText size={18} />
                      View Invoice
                    </button>
                  </div>

                  <div className="customer-order-support-note">
                    <MessageCircle
                      size={19}
                    />

                    <p>
                      Need help with this order?
                      Contact Kushi Digitals
                      using WhatsApp or phone.
                    </p>
                  </div>

                  <div className="customer-order-contact-actions">
                    <button
                      type="button"
                      onClick={() =>
                        handleWhatsAppSupport(
                          selectedOrder,
                        )
                      }
                    >
                      <MessageCircle
                        size={18}
                      />
                      WhatsApp Support
                    </button>

                    <a href="tel:+917337471733">
                      <PhoneCall size={18} />
                      Call Kushi Digitals
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {invoiceOrder && (
        <div
          className="customer-invoice-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeInvoice();
            }
          }}
        >
          <section
            className="customer-invoice-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="customer-invoice-title"
          >
            <header className="customer-invoice-modal-header no-print">
              <div>
                <span>Customer Invoice</span>

                <h2 id="customer-invoice-title">
                  {invoiceOrder.invoice_number ||
                    "Kushi Digitals Invoice"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeInvoice}
                aria-label="Close invoice"
              >
                <X size={21} />
              </button>
            </header>

            <div
              className="customer-invoice-print-area"
              id="customer-invoice-print-area"
            >
              <div className="customer-invoice-brand">
                <div>
                  <span>KUSHI DIGITALS</span>
                  <h1>INVOICE</h1>
                </div>

                <div>
                  <strong>
                    {invoiceOrder.invoice_number ||
                      "Not Generated"}
                  </strong>

                  <span>
                    {formatDate(
                      invoiceOrder.invoice_created_at ||
                        invoiceOrder.created_at,
                    )}
                  </span>
                </div>
              </div>

              <div className="customer-invoice-parties">
                <div>
                  <span>Billed To</span>
                  <strong>
                    {invoiceOrder.customer_name}
                  </strong>
                  <p>{invoiceOrder.phone}</p>
                </div>

                <div>
                  <span>From</span>
                  <strong>Kushi Digitals</strong>
                  <p>Phone: +91 7337471733</p>
                </div>
              </div>

              <div className="customer-invoice-table-wrapper">
                <table className="customer-invoice-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th>Service Option</th>
                      <th>Qty</th>
                      <th>Amount</th>
                    </tr>
                  </thead>

                  <tbody>
                    <tr>
                      <td>
                        {invoiceOrder.service}
                      </td>
                      <td>
                        {invoiceOrder.size ||
                          "Not Applicable"}
                      </td>
                      <td>
                        {invoiceOrder.quantity}
                      </td>
                      <td>
                        {formatCurrency(
                          getPayableAmount(
                            invoiceOrder,
                          ),
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="customer-invoice-totals">
                <div>
                  <span>Payable</span>
                  <strong>
                    {formatCurrency(
                      getPayableAmount(
                        invoiceOrder,
                      ),
                    )}
                  </strong>
                </div>

                <div>
                  <span>Paid</span>
                  <strong>
                    {formatCurrency(
                      invoiceOrder.amount_paid,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Balance</span>
                  <strong>
                    {formatCurrency(
                      getBalanceAmount(
                        invoiceOrder,
                      ),
                    )}
                  </strong>
                </div>
              </div>

              <div className="customer-invoice-payment-details">
                <div>
                  <span>Payment Status</span>
                  <strong>
                    {getPaymentStatusLabel(
                      invoiceOrder.payment_status,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Payment Method</span>
                  <strong>
                    {getPaymentMethodLabel(
                      invoiceOrder.payment_method,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Payment Reference</span>
                  <strong>
                    {invoiceOrder.payment_reference ||
                      "Not Available"}
                  </strong>
                </div>

                <div>
                  <span>Order ID</span>
                  <strong>
                    KD-
                    {getShortOrderId(
                      invoiceOrder.id,
                    )}
                  </strong>
                </div>
              </div>

              <div className="customer-invoice-footer">
                <strong>
                  Thank you for choosing Kushi Digitals.
                </strong>

                <span>
                  This computer-generated invoice does
                  not require a signature.
                </span>
              </div>
            </div>

            <div className="customer-invoice-actions no-print">
              <button
                type="button"
                onClick={handlePrintInvoice}
              >
                <Printer size={18} />
                Print / Save PDF
              </button>

              <button
                type="button"
                onClick={closeInvoice}
              >
                <X size={18} />
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Orders;
