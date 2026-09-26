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
  Download,
  Eye,
  FileImage,
  ImagePlus,
  Images,
  Search,
  Sparkles,
  UploadCloud,
} from "lucide-react";

import { supabase } from "../../services/supabase";

function Photos() {
  const [photos, setPhotos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadPhotos = async () => {
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
            "Please login to view your photos.",
          );
        }

        const {
          data: orderRows,
          error: ordersError,
        } = await supabase
          .from("orders")
          .select(
            `
              id,
              user_id,
              service,
              photo_path,
              photo_name,
              completed_photo_path,
              completed_photo_name,
              completed_photo_uploaded_at,
              files_expire_at,
              status,
              created_at
            `,
          )
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: false,
          });

        if (ordersError) {
          throw ordersError;
        }

        const rows = orderRows || [];
        const orderIds = rows.map(
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
                user_id,
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

        if (
          rows.length === 0 &&
          orderFileRows.length === 0
        ) {
          if (isMounted) {
            setPhotos([]);
          }

          return;
        }

        const orderMap = new Map(
          rows.map((order) => [
            order.id,
            order,
          ]),
        );

        const originalPaths = orderFileRows
          .filter(
            (file) =>
              file.file_type === "original" &&
              file.file_path,
          )
          .map((file) => file.file_path);

        const completedPaths = orderFileRows
          .filter(
            (file) =>
              file.file_type === "completed" &&
              file.file_path,
          )
          .map((file) => file.file_path);

        rows.forEach((order) => {
          const hasOriginal = orderFileRows.some(
            (file) =>
              file.order_id === order.id &&
              file.file_type === "original",
          );

          const hasCompleted = orderFileRows.some(
            (file) =>
              file.order_id === order.id &&
              file.file_type === "completed",
          );

          if (
            order.photo_path &&
            !hasOriginal
          ) {
            originalPaths.push(
              order.photo_path,
            );
          }

          if (
            order.completed_photo_path &&
            !hasCompleted
          ) {
            completedPaths.push(
              order.completed_photo_path,
            );
          }
        });

        const uniqueOriginalPaths = [
          ...new Set(originalPaths),
        ];

        const uniqueCompletedPaths = [
          ...new Set(completedPaths),
        ];

        const originalSignedUrlMap =
          new Map();

        const completedSignedUrlMap =
          new Map();

        if (uniqueOriginalPaths.length > 0) {
          const {
            data: originalSignedFiles,
            error: originalSignedError,
          } = await supabase.storage
            .from("order-photos")
            .createSignedUrls(
              uniqueOriginalPaths,
              60 * 60,
            );

          if (originalSignedError) {
            console.error(
              "Unable to create original previews:",
              originalSignedError,
            );
          } else {
            (originalSignedFiles || []).forEach(
              (file) => {
                originalSignedUrlMap.set(
                  file.path,
                  file.signedUrl,
                );
              },
            );
          }
        }

        if (uniqueCompletedPaths.length > 0) {
          const {
            data: completedSignedFiles,
            error: completedSignedError,
          } = await supabase.storage
            .from("completed-photos")
            .createSignedUrls(
              uniqueCompletedPaths,
              60 * 60,
            );

          if (completedSignedError) {
            console.error(
              "Unable to create completed previews:",
              completedSignedError,
            );
          } else {
            (completedSignedFiles || []).forEach(
              (file) => {
                completedSignedUrlMap.set(
                  file.path,
                  file.signedUrl,
                );
              },
            );
          }
        }

        const preparedPhotos = [];

        orderFileRows.forEach((file) => {
          const order = orderMap.get(
            file.order_id,
          );

          if (!order) {
            return;
          }

          const isCompleted =
            file.file_type === "completed";

          preparedPhotos.push({
            recordKey: file.id,
            orderId: file.order_id,
            service: order.service,
            type: isCompleted
              ? "completed"
              : "original",
            label: isCompleted
              ? "Final Photo"
              : "Original Upload",
            filePath: file.file_path,
            fileName:
              file.file_name ||
              (isCompleted
                ? "Completed Photo"
                : "Order Photo"),
            bucketName:
              file.storage_bucket ||
              (isCompleted
                ? "completed-photos"
                : "order-photos"),
            signedUrl: isCompleted
              ? completedSignedUrlMap.get(
                  file.file_path,
                ) || ""
              : originalSignedUrlMap.get(
                  file.file_path,
                ) || "",
            status: order.status,
            displayDate:
              file.created_at ||
              (isCompleted
                ? order.completed_photo_uploaded_at
                : order.created_at),
            expiresAt:
              order.files_expire_at || null,
          });
        });

        rows.forEach((order) => {
          const hasOriginal = orderFileRows.some(
            (file) =>
              file.order_id === order.id &&
              file.file_type === "original",
          );

          const hasCompleted = orderFileRows.some(
            (file) =>
              file.order_id === order.id &&
              file.file_type === "completed",
          );

          if (
            order.photo_path &&
            !hasOriginal
          ) {
            preparedPhotos.push({
              recordKey:
                `${order.id}-legacy-original`,
              orderId: order.id,
              service: order.service,
              type: "original",
              label: "Original Upload",
              filePath: order.photo_path,
              fileName:
                order.photo_name ||
                "Order Photo",
              bucketName: "order-photos",
              signedUrl:
                originalSignedUrlMap.get(
                  order.photo_path,
                ) || "",
              status: order.status,
              displayDate: order.created_at,
              expiresAt:
                order.files_expire_at || null,
            });
          }

          if (
            order.completed_photo_path &&
            !hasCompleted
          ) {
            preparedPhotos.push({
              recordKey:
                `${order.id}-legacy-completed`,
              orderId: order.id,
              service: order.service,
              type: "completed",
              label: "Final Photo",
              filePath:
                order.completed_photo_path,
              fileName:
                order.completed_photo_name ||
                "Completed Photo",
              bucketName:
                "completed-photos",
              signedUrl:
                completedSignedUrlMap.get(
                  order.completed_photo_path,
                ) || "",
              status: order.status,
              displayDate:
                order.completed_photo_uploaded_at ||
                order.created_at,
              expiresAt:
                order.files_expire_at || null,
            });
          }
        });

        preparedPhotos.sort(
          (firstPhoto, secondPhoto) =>
            new Date(
              secondPhoto.displayDate || 0,
            ).getTime() -
            new Date(
              firstPhoto.displayDate || 0,
            ).getTime(),
        );

        if (isMounted) {
          setPhotos(preparedPhotos);
        }
      } catch (loadError) {
        if (isMounted) {
          setError(
            loadError.message ||
              "Unable to load your photos.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadPhotos();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredPhotos = useMemo(() => {
    const term = searchTerm
      .trim()
      .toLowerCase();

    return photos.filter((photo) => {
      const shortOrderId = photo.orderId
        .replace(/-/g, "")
        .slice(0, 10)
        .toLowerCase();

      const matchesSearch =
        !term ||
        photo.service
          ?.toLowerCase()
          .includes(term) ||
        photo.fileName
          ?.toLowerCase()
          .includes(term) ||
        photo.label
          ?.toLowerCase()
          .includes(term) ||
        shortOrderId.includes(term);

      const matchesFilter =
        filter === "all" ||
        (filter === "uploaded" &&
          photo.type === "original") ||
        (filter === "completed" &&
          photo.type === "completed") ||
        (filter === "processing" &&
          photo.type === "original" &&
          [
            "pending",
            "confirmed",
            "in_progress",
            "ready",
          ].includes(photo.status));

      return matchesSearch && matchesFilter;
    });
  }, [photos, searchTerm, filter]);

  const uploadedCount = photos.filter(
    (photo) => photo.type === "original",
  ).length;

  const completedCount = photos.filter(
    (photo) => photo.type === "completed",
  ).length;

  const processingCount = new Set(
    photos
      .filter(
        (photo) =>
          [
            "pending",
            "confirmed",
            "in_progress",
            "ready",
          ].includes(photo.status),
      )
      .map((photo) => photo.orderId),
  ).size;

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Date unavailable";
    }

    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateValue));
  };

  const getShortOrderId = (orderId) => {
    return orderId
      .replace(/-/g, "")
      .slice(0, 10)
      .toUpperCase();
  };

  const getExpiryDetails = (expiresAt) => {
    if (!expiresAt) {
      return {
        isExpired: false,
        daysRemaining: null,
        label: "Expiry date will appear after the order is completed.",
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

    const daysRemaining = Math.ceil(
      (expiryStart.getTime() -
        todayStart.getTime()) /
        (1000 * 60 * 60 * 24),
    );

    if (daysRemaining < 0) {
      return {
        isExpired: true,
        daysRemaining: 0,
        label: "This file has expired.",
      };
    }

    if (daysRemaining === 0) {
      return {
        isExpired: false,
        daysRemaining: 0,
        label: "Expires today — download now.",
      };
    }

    if (daysRemaining === 1) {
      return {
        isExpired: false,
        daysRemaining: 1,
        label: "1 day remaining — download soon.",
      };
    }

    return {
      isExpired: false,
      daysRemaining,
      label: `${daysRemaining} days remaining`,
    };
  };

  const getStatusLabel = (photo) => {
    if (photo.type === "completed") {
      return "READY TO DOWNLOAD";
    }

    return photo.status
      .replace(/_/g, " ")
      .toUpperCase();
  };

  const handleDownload = async (photo) => {
    try {
      setError("");

      const expiryDetails =
        getExpiryDetails(photo.expiresAt);

      if (expiryDetails.isExpired) {
        throw new Error(
          "This completed photo has expired and is no longer available.",
        );
      }

      const { data, error: downloadError } =
        await supabase.storage
          .from(photo.bucketName)
          .download(photo.filePath);

      if (downloadError) {
        throw downloadError;
      }

      const objectUrl =
        URL.createObjectURL(data);

      const anchor =
        document.createElement("a");

      anchor.href = objectUrl;
      anchor.download =
        photo.fileName ||
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

  return (
    <div className="customer-photos-page">
      <section className="dashboard-page-header">
        <div>
          <span>My Photos</span>

          <h1>Your Photo Library</h1>

          <p>
            View original uploads and download
            completed photos securely from your
            Kushi Digitals account.
          </p>
        </div>

        <Link
          to="/ai-photo-studio"
          className="primary-button"
        >
          <ImagePlus size={18} />
          Create with AI
          <ArrowRight size={18} />
        </Link>
      </section>

      <section className="photos-summary-grid">
        <article className="photos-summary-card">
          <div className="photos-summary-icon purple">
            <UploadCloud size={22} />
          </div>

          <div>
            <span>Uploaded Photos</span>
            <strong>
              {isLoading ? "..." : uploadedCount}
            </strong>
            <p>Original customer uploads</p>
          </div>
        </article>

        <article className="photos-summary-card">
          <div className="photos-summary-icon cyan">
            <Eye size={22} />
          </div>

          <div>
            <span>Processing Files</span>
            <strong>
              {isLoading ? "..." : processingCount}
            </strong>
            <p>Photos connected to active orders</p>
          </div>
        </article>

        <article className="photos-summary-card">
          <div className="photos-summary-icon green">
            <Download size={22} />
          </div>

          <div>
            <span>Completed Files</span>
            <strong>
              {isLoading ? "..." : completedCount}
            </strong>
            <p>Final photos ready to download</p>
          </div>
        </article>
      </section>

      <section className="dashboard-panel customer-photos-panel">
        <div className="photos-toolbar">
          <div>
            <span>Customer Library</span>
            <h2>All Photos</h2>
          </div>

          <div className="photos-toolbar-actions">
            <div className="photos-search">
              <Search size={18} />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value,
                  )
                }
                placeholder="Search photos or orders..."
                aria-label="Search customer photos"
              />
            </div>

            <select
              aria-label="Filter customer photos"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value)
              }
            >
              <option value="all">
                All Photos
              </option>

              <option value="uploaded">
                Original Uploads
              </option>

              <option value="processing">
                Processing
              </option>

              <option value="completed">
                Final Photos
              </option>
            </select>
          </div>
        </div>

        {error && (
          <div className="photos-load-message error">
            <AlertCircle size={19} />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="photos-load-message">
            <Images size={22} />
            <span>
              Loading your private photos...
            </span>
          </div>
        ) : filteredPhotos.length > 0 ? (
          <div className="customer-photo-grid">
            {filteredPhotos.map((photo) => (
              <article
                className={`customer-photo-card ${
                  photo.type === "completed"
                    ? "final-photo-card"
                    : ""
                }`}
                key={photo.recordKey}
              >
                <div className="customer-photo-preview">
                  {photo.signedUrl ? (
                    <img
                      src={photo.signedUrl}
                      alt={
                        photo.fileName ||
                        photo.service
                      }
                    />
                  ) : (
                    <div className="photo-preview-unavailable">
                      <FileImage size={31} />
                      <span>
                        Preview unavailable
                      </span>
                    </div>
                  )}

                  <span
                    className={`customer-photo-status ${
                      photo.type === "completed"
                        ? "completed"
                        : photo.status
                    }`}
                  >
                    {getStatusLabel(photo)}
                  </span>

                  <span
                    className={`customer-photo-type-badge ${photo.type}`}
                  >
                    {photo.type === "completed" ? (
                      <>
                        <Sparkles size={14} />
                        Final Photo
                      </>
                    ) : (
                      <>
                        <UploadCloud size={14} />
                        Original
                      </>
                    )}
                  </span>
                </div>

                <div className="customer-photo-information">
                  <span>{photo.service}</span>

                  <h3>{photo.fileName}</h3>

                  <p>
                    KD-
                    {getShortOrderId(
                      photo.orderId,
                    )}
                    {" · "}
                    {formatDate(
                      photo.displayDate,
                    )}
                  </p>

                  {photo.type === "completed" && (
                    <div className="customer-final-photo-note">
                      <CheckCircle2 size={17} />

                      <span>
                        Your finished photo is
                        ready to view and
                        download.
                      </span>
                    </div>
                  )}

                  {(() => {
                    const expiryDetails =
                      getExpiryDetails(
                        photo.expiresAt,
                      );

                    return (
                      <div
                        className={`customer-photo-expiry-note ${
                          expiryDetails.isExpired
                            ? "expired"
                            : expiryDetails.daysRemaining !== null &&
                                expiryDetails.daysRemaining <= 7
                              ? "urgent"
                              : ""
                        }`}
                      >
                        <strong>
                          {photo.expiresAt
                            ? `Available Until: ${formatDate(
                                photo.expiresAt,
                              )}`
                            : "Expiry Pending"}
                        </strong>

                        <span>
                          {expiryDetails.label}
                        </span>

                        {!expiryDetails.isExpired && (
                          <small>
                            Please download this photo
                            before it expires.
                          </small>
                        )}
                      </div>
                    );
                  })()}

                  <div className="customer-photo-actions">
                    {photo.signedUrl &&
                      !getExpiryDetails(
                        photo.expiresAt,
                      ).isExpired && (
                        <a
                          href={photo.signedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Eye size={17} />
                          View Photo
                        </a>
                      )}

                    <button
                      type="button"
                      onClick={() =>
                        handleDownload(photo)
                      }
                      disabled={
                        getExpiryDetails(
                          photo.expiresAt,
                        ).isExpired
                      }
                    >
                      <Download size={17} />
                      {getExpiryDetails(
                        photo.expiresAt,
                      ).isExpired
                        ? "Expired"
                        : photo.type === "completed"
                          ? "Download Final"
                          : "Download"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="photos-empty-state">
            <div className="photos-empty-visual">
              <span className="photos-empty-icon">
                <Images size={34} />
              </span>

              <span className="photos-floating-file file-one">
                <FileImage size={20} />
              </span>

              <span className="photos-floating-file file-two">
                <FileImage size={18} />
              </span>
            </div>

            <h3>No Photos Available Yet</h3>

            <p>
              Original uploads and completed
              customer photos will appear
              securely in this section.
            </p>

            <Link
              to="/poster-studio"
              className="primary-button"
            >
              <UploadCloud size={18} />
              Upload Your First Photo
              <ArrowRight size={17} />
            </Link>
          </div>
        )}
      </section>

      <section className="photo-security-note">
        <div>
          <FileImage size={23} />

          <div>
            <strong>
              Private Customer Photo Storage
            </strong>

            <p>
              Original and completed photos are
              stored in private Supabase buckets
              and are accessible only through
              your authenticated customer
              account.
            </p>
          </div>
        </div>

        <span>Secure Access</span>
      </section>
    </div>
  );
}

export default Photos;
