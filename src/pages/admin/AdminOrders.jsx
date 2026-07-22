import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Clock3,
  Download,
  Eye,
  FileImage,
  IndianRupee,
  MessageCircle,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";

import { supabase } from "../../services/supabase";
import { createWhatsAppLink } from "../../config/business";

const orderStatuses = [
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
  {
    value: "cancelled",
    label: "Cancelled",
  },
  {
    value: "rejected",
    label: "Rejected",
  },
];

const paymentStatuses = [
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
  { value: "refunded", label: "Refunded" },
];

const paymentMethods = [
  { value: "", label: "Not Selected" },
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("all");

  const [archiveFilter, setArchiveFilter] =
    useState("active");

  const [archiveReason, setArchiveReason] =
    useState("");

  const [isArchiving, setIsArchiving] =
    useState(false);

  const [selectedOrder, setSelectedOrder] =
    useState(null);

  const [editData, setEditData] = useState({
    status: "pending",
    estimatedPrice: "",
    finalPrice: "",
    paymentStatus: "pending",
    amountPaid: "",
    paymentMethod: "",
    paymentReference: "",
  });

  const [isLoading, setIsLoading] =
    useState(true);

  const [isSaving, setIsSaving] =
    useState(false);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [completedFiles, setCompletedFiles] =
    useState([]);

  const [completedPreviewUrls, setCompletedPreviewUrls] =
    useState([]);

  const [isUploadingCompleted, setIsUploadingCompleted] =
    useState(false);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      setError("");

      const { data: orderRows, error: ordersError } =
        await supabase
          .from("orders")
          .select("*")
          .order("created_at", {
            ascending: false,
          });

      if (ordersError) {
        throw ordersError;
      }

      const rows = orderRows || [];
      const orderIds = rows.map((order) => order.id);

      let orderFileRows = [];

      if (orderIds.length > 0) {
        const {
          data: fileRows,
          error: filesError,
        } = await supabase
          .from("order_files")
          .select("*")
          .in("order_id", orderIds)
          .order("created_at", {
            ascending: true,
          });

        if (filesError) {
          throw filesError;
        }

        orderFileRows = fileRows || [];
      }

      const originalPaths = orderFileRows
        .filter(
          (file) =>
            file.file_type === "original",
        )
        .map((file) => file.file_path);

      const completedPaths = orderFileRows
        .filter(
          (file) =>
            file.file_type === "completed",
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

        if (order.photo_path && !hasOriginal) {
          originalPaths.push(order.photo_path);
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

      const originalSignedUrlMap = new Map();
      const completedSignedUrlMap = new Map();

      if (originalPaths.length > 0) {
        const {
          data: signedFiles,
          error: signedError,
        } = await supabase.storage
          .from("order-photos")
          .createSignedUrls(
            [...new Set(originalPaths)],
            60 * 60,
          );

        if (!signedError) {
          (signedFiles || []).forEach((file) => {
            originalSignedUrlMap.set(
              file.path,
              file.signedUrl,
            );
          });
        }
      }

      if (completedPaths.length > 0) {
        const {
          data: signedFiles,
          error: signedError,
        } = await supabase.storage
          .from("completed-photos")
          .createSignedUrls(
            [...new Set(completedPaths)],
            60 * 60,
          );

        if (!signedError) {
          (signedFiles || []).forEach((file) => {
            completedSignedUrlMap.set(
              file.path,
              file.signedUrl,
            );
          });
        }
      }

      const preparedOrders = rows.map((order) => {
        let originalFiles = orderFileRows
          .filter(
            (file) =>
              file.order_id === order.id &&
              file.file_type === "original",
          )
          .map((file) => ({
            ...file,
            signedUrl:
              originalSignedUrlMap.get(
                file.file_path,
              ) || "",
          }));

        let completedFilesForOrder = orderFileRows
          .filter(
            (file) =>
              file.order_id === order.id &&
              file.file_type === "completed",
          )
          .map((file) => ({
            ...file,
            signedUrl:
              completedSignedUrlMap.get(
                file.file_path,
              ) || "",
          }));

        if (
          originalFiles.length === 0 &&
          order.photo_path
        ) {
          originalFiles = [
            {
              id: `legacy-original-${order.id}`,
              order_id: order.id,
              file_type: "original",
              storage_bucket: "order-photos",
              file_path: order.photo_path,
              file_name:
                order.photo_name ||
                "Customer Photo",
              signedUrl:
                originalSignedUrlMap.get(
                  order.photo_path,
                ) || "",
              isLegacy: true,
            },
          ];
        }

        if (
          completedFilesForOrder.length === 0 &&
          order.completed_photo_path
        ) {
          completedFilesForOrder = [
            {
              id: `legacy-completed-${order.id}`,
              order_id: order.id,
              file_type: "completed",
              storage_bucket:
                "completed-photos",
              file_path:
                order.completed_photo_path,
              file_name:
                order.completed_photo_name ||
                "Completed Photo",
              signedUrl:
                completedSignedUrlMap.get(
                  order.completed_photo_path,
                ) || "",
              isLegacy: true,
            },
          ];
        }

        return {
          ...order,
          originalFiles,
          completedFiles:
            completedFilesForOrder,
          signedPhotoUrl:
            originalFiles[0]?.signedUrl || "",
          signedCompletedPhotoUrl:
            completedFilesForOrder[0]
              ?.signedUrl || "",
        };
      });

      setOrders(preparedOrders);
    } catch (loadError) {
      setError(
        loadError.message ||
          "Unable to load customer orders.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    const urls = completedFiles.map((file) =>
      URL.createObjectURL(file),
    );

    setCompletedPreviewUrls(urls);

    return () => {
      urls.forEach((url) =>
        URL.revokeObjectURL(url),
      );
    };
  }, [completedFiles]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm
      .trim()
      .toLowerCase();

    return orders.filter((order) => {
      const shortOrderId = order.id
        .replace(/-/g, "")
        .slice(0, 10)
        .toLowerCase();

      const matchesSearch =
        !term ||
        shortOrderId.includes(term) ||
        order.customer_name
          ?.toLowerCase()
          .includes(term) ||
        order.phone
          ?.toLowerCase()
          .includes(term) ||
        order.service
          ?.toLowerCase()
          .includes(term);

      const matchesStatus =
        statusFilter === "all" ||
        order.status === statusFilter;

      const matchesArchive =
        archiveFilter === "all" ||
        (archiveFilter === "active" &&
          !order.archived_at) ||
        (archiveFilter === "archived" &&
          Boolean(order.archived_at));

      return (
        matchesSearch &&
        matchesStatus &&
        matchesArchive
      );
    });
  }, [
    orders,
    searchTerm,
    statusFilter,
    archiveFilter,
  ]);

  const activeOrders = orders.filter(
    (order) => !order.archived_at,
  );

  const archivedCount = orders.filter(
    (order) => Boolean(order.archived_at),
  ).length;

  const pendingCount = activeOrders.filter(
    (order) => order.status === "pending",
  ).length;

  const processingCount = activeOrders.filter(
    (order) =>
      [
        "confirmed",
        "in_progress",
        "ready",
      ].includes(order.status),
  ).length;

  const completedCount = activeOrders.filter(
    (order) =>
      order.status === "completed",
  ).length;

  const openOrderDetails = (order) => {
    setSelectedOrder(order);

    setEditData({
      status: order.status || "pending",

      estimatedPrice:
        order.estimated_price ?? "",

      finalPrice:
        order.final_price ?? "",
      paymentStatus:
        order.payment_status || "pending",
      amountPaid:
        order.amount_paid ?? "",
      paymentMethod:
        order.payment_method || "",
      paymentReference:
        order.payment_reference || "",
    });

    setCompletedFiles([]);
    setArchiveReason(
      order.archive_reason || "",
    );
    setError("");
    setSuccessMessage("");
  };

  const closeOrderDetails = () => {
    if (isSaving) {
      return;
    }

    setSelectedOrder(null);
    setCompletedFiles([]);
    setArchiveReason("");
    setSuccessMessage("");
    setError("");
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    setEditData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setError("");
    setSuccessMessage("");
  };

  const handleSaveOrder = async () => {
    if (!selectedOrder) {
      return;
    }

    try {
      setIsSaving(true);
      setError("");
      setSuccessMessage("");

      const estimatedPrice =
        editData.estimatedPrice === ""
          ? null
          : Number(editData.estimatedPrice);

      const finalPrice =
        editData.finalPrice === ""
          ? null
          : Number(editData.finalPrice);

      const amountPaid =
        editData.amountPaid === ""
          ? 0
          : Number(editData.amountPaid);

      if (
        estimatedPrice !== null &&
        (Number.isNaN(estimatedPrice) ||
          estimatedPrice < 0)
      ) {
        setError(
          "Please enter a valid estimated price.",
        );
        return;
      }

      if (
        finalPrice !== null &&
        (Number.isNaN(finalPrice) ||
          finalPrice < 0)
      ) {
        setError(
          "Please enter a valid final price.",
        );
        return;
      }

      const {
        data: updatedOrder,
        error: updateError,
      } = await supabase
        .from("orders")
        .update({
          status: editData.status,
          estimated_price: estimatedPrice,
          final_price: finalPrice,
          payment_status: editData.paymentStatus,
          amount_paid: amountPaid,
          payment_method:
            editData.paymentMethod || null,
          payment_reference:
            editData.paymentReference.trim() || null,
        })
        .eq("id", selectedOrder.id)
        .select("*")
        .single();

      if (updateError) {
        throw updateError;
      }

      const preservedPhotoUrl =
        selectedOrder.signedPhotoUrl || "";

      const preservedCompletedPhotoUrl =
        selectedOrder.signedCompletedPhotoUrl ||
        "";

      const preparedUpdatedOrder = {
        ...updatedOrder,

        signedPhotoUrl:
          preservedPhotoUrl,

        signedCompletedPhotoUrl:
          preservedCompletedPhotoUrl,
        originalFiles:
          selectedOrder.originalFiles || [],
        completedFiles:
          selectedOrder.completedFiles || [],
      };

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === selectedOrder.id
            ? preparedUpdatedOrder
            : order,
        ),
      );

      setSelectedOrder(
        preparedUpdatedOrder,
      );

      setSuccessMessage(
        "Order, payment and invoice details updated successfully.",
      );
    } catch (saveError) {
      setError(
        saveError.message ||
          "Unable to update this order.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveOrder = async () => {
    if (!selectedOrder) {
      return;
    }

    const reason = archiveReason.trim();

    if (!reason) {
      setError(
        "Please enter a reason before archiving this order.",
      );
      return;
    }

    const confirmed = window.confirm(
      "Archive this order? It will move to Archived Orders and can be restored later.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsArchiving(true);
      setError("");
      setSuccessMessage("");

      const archivedAt =
        new Date().toISOString();

      const {
        data: updatedOrder,
        error: archiveError,
      } = await supabase
        .from("orders")
        .update({
          archived_at: archivedAt,
          archive_reason: reason,
        })
        .eq("id", selectedOrder.id)
        .select("*")
        .single();

      if (archiveError) {
        throw archiveError;
      }

      const preparedUpdatedOrder = {
        ...selectedOrder,
        ...updatedOrder,
      };

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === selectedOrder.id
            ? preparedUpdatedOrder
            : order,
        ),
      );

      setSelectedOrder(
        preparedUpdatedOrder,
      );

      setSuccessMessage(
        "Order archived successfully.",
      );
    } catch (archiveError) {
      setError(
        archiveError.message ||
          "Unable to archive this order.",
      );
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestoreOrder = async () => {
    if (!selectedOrder) {
      return;
    }

    const confirmed = window.confirm(
      "Restore this order to Active Orders?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsArchiving(true);
      setError("");
      setSuccessMessage("");

      const {
        data: updatedOrder,
        error: restoreError,
      } = await supabase
        .from("orders")
        .update({
          archived_at: null,
          archive_reason: null,
        })
        .eq("id", selectedOrder.id)
        .select("*")
        .single();

      if (restoreError) {
        throw restoreError;
      }

      const preparedUpdatedOrder = {
        ...selectedOrder,
        ...updatedOrder,
      };

      setOrders((currentOrders) =>
        currentOrders.map((order) =>
          order.id === selectedOrder.id
            ? preparedUpdatedOrder
            : order,
        ),
      );

      setSelectedOrder(
        preparedUpdatedOrder,
      );

      setArchiveReason("");

      setSuccessMessage(
        "Order restored successfully.",
      );
    } catch (restoreError) {
      setError(
        restoreError.message ||
          "Unable to restore this order.",
      );
    } finally {
      setIsArchiving(false);
    }
  };

  const handleCompletedFileChange = (
    event,
  ) => {
    const incomingFiles = Array.from(
      event.target.files || [],
    );

    if (incomingFiles.length === 0) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    const maximumFileSize =
      10 * 1024 * 1024;
    const maximumFiles = 10;
    const maximumTotalSize =
      50 * 1024 * 1024;

    const combinedFiles = [
      ...completedFiles,
      ...incomingFiles,
    ];

    if (combinedFiles.length > maximumFiles) {
      setError(
        `You can upload a maximum of ${maximumFiles} completed photos at once.`,
      );
      event.target.value = "";
      return;
    }

    const invalidTypeFile =
      incomingFiles.find(
        (file) =>
          !allowedTypes.includes(file.type),
      );

    if (invalidTypeFile) {
      setError(
        `${invalidTypeFile.name}: Please select JPG, JPEG, PNG or WEBP files only.`,
      );
      event.target.value = "";
      return;
    }

    const oversizedFile =
      incomingFiles.find(
        (file) =>
          file.size > maximumFileSize,
      );

    if (oversizedFile) {
      setError(
        `${oversizedFile.name}: Each completed photo must be below 10 MB.`,
      );
      event.target.value = "";
      return;
    }

    const totalSize = combinedFiles.reduce(
      (total, file) =>
        total + file.size,
      0,
    );

    if (totalSize > maximumTotalSize) {
      setError(
        "Combined completed photo size must be below 50 MB.",
      );
      event.target.value = "";
      return;
    }

    setCompletedFiles(combinedFiles);
    setError("");
    setSuccessMessage("");
    event.target.value = "";
  };

  const removeSelectedCompletedFile = (
    fileIndex,
  ) => {
    setCompletedFiles((currentFiles) =>
      currentFiles.filter(
        (_, index) => index !== fileIndex,
      ),
    );
    setError("");
  };

  const getCompletedFileExtension = (
    file,
  ) => {
    const extensionByType = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
    };

    return (
      extensionByType[file.type] || "jpg"
    );
  };

  const handleUploadCompletedPhoto =
    async () => {
      if (
        !selectedOrder ||
        completedFiles.length === 0
      ) {
        setError(
          "Please select at least one completed photo.",
        );
        return;
      }

      const uploadedItems = [];

      try {
        setIsUploadingCompleted(true);
        setError("");
        setSuccessMessage("");

        for (
          let fileIndex = 0;
          fileIndex < completedFiles.length;
          fileIndex += 1
        ) {
          const file =
            completedFiles[fileIndex];

          const extension =
            getCompletedFileExtension(file);

          const uniqueId =
            typeof crypto.randomUUID ===
            "function"
              ? crypto.randomUUID()
              : `${Date.now()}-${fileIndex}-${Math.random()
                  .toString(36)
                  .slice(2)}`;

          const filePath =
            `${selectedOrder.user_id}/${selectedOrder.id}/${uniqueId}.${extension}`;

          const { error: uploadError } =
            await supabase.storage
              .from("completed-photos")
              .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
                contentType: file.type,
              });

          if (uploadError) {
            throw new Error(
              `${file.name} upload failed: ${uploadError.message}`,
            );
          }

          uploadedItems.push({
            file,
            filePath,
          });
        }

        const orderFileRows =
          uploadedItems.map(
            ({ file, filePath }) => ({
              order_id: selectedOrder.id,
              user_id:
                selectedOrder.user_id,
              file_type: "completed",
              storage_bucket:
                "completed-photos",
              file_path: filePath,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: "admin",
            }),
          );

        const {
          data: insertedFiles,
          error: insertError,
        } = await supabase
          .from("order_files")
          .insert(orderFileRows)
          .select("*");

        if (insertError) {
          throw new Error(
            `Completed photos could not be linked: ${insertError.message}`,
          );
        }

        const uploadedAt =
          new Date().toISOString();

        const firstAvailableFile =
          selectedOrder.completedFiles?.[0] ||
          insertedFiles?.[0];

        const {
          data: updatedOrder,
          error: orderUpdateError,
        } = await supabase
          .from("orders")
          .update({
            completed_photo_path:
              firstAvailableFile.file_path,
            completed_photo_name:
              firstAvailableFile.file_name,
            completed_photo_uploaded_at:
              uploadedAt,
          })
          .eq("id", selectedOrder.id)
          .select("*")
          .single();

        if (orderUpdateError) {
          throw orderUpdateError;
        }

        await loadOrders();

        setSelectedOrder((currentOrder) => {
          if (!currentOrder) {
            return currentOrder;
          }

          return {
            ...currentOrder,
            ...updatedOrder,
          };
        });

        setCompletedFiles([]);
        setSuccessMessage(
          `${uploadedItems.length} completed photo(s) uploaded successfully.`,
        );
      } catch (uploadError) {
        if (uploadedItems.length > 0) {
          await supabase.storage
            .from("completed-photos")
            .remove(
              uploadedItems.map(
                (item) => item.filePath,
              ),
            );
        }

        setError(
          uploadError.message ||
            "Unable to upload completed photos.",
        );
      } finally {
        setIsUploadingCompleted(false);
      }
    };

  const handleDownloadPhoto = async (
    file,
  ) => {
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

  const handleDeleteCompletedPhoto =
    async (file) => {
      if (!selectedOrder || !file) {
        return;
      }

      const shouldDelete =
        window.confirm(
          `Remove ${file.file_name} from this order?`,
        );

      if (!shouldDelete) {
        return;
      }

      try {
        setIsUploadingCompleted(true);
        setError("");
        setSuccessMessage("");

        if (!file.isLegacy) {
          const { error: rowDeleteError } =
            await supabase
              .from("order_files")
              .delete()
              .eq("id", file.id);

          if (rowDeleteError) {
            throw rowDeleteError;
          }
        }

        const { error: removeError } =
          await supabase.storage
            .from("completed-photos")
            .remove([file.file_path]);

        if (removeError) {
          throw removeError;
        }

        const remainingFiles =
          (
            selectedOrder.completedFiles ||
            []
          ).filter(
            (item) =>
              item.file_path !==
              file.file_path,
          );

        if (
          selectedOrder.completed_photo_path ===
          file.file_path
        ) {
          const nextFile =
            remainingFiles[0] || null;

          const { error: updateError } =
            await supabase
              .from("orders")
              .update({
                completed_photo_path:
                  nextFile?.file_path || null,
                completed_photo_name:
                  nextFile?.file_name || null,
                completed_photo_uploaded_at:
                  nextFile
                    ? new Date().toISOString()
                    : null,
              })
              .eq("id", selectedOrder.id);

          if (updateError) {
            throw updateError;
          }
        }

        await loadOrders();

        setSelectedOrder((currentOrder) =>
          currentOrder
            ? {
                ...currentOrder,
                completedFiles:
                  remainingFiles,
                completed_photo_path:
                  remainingFiles[0]
                    ?.file_path || null,
                completed_photo_name:
                  remainingFiles[0]
                    ?.file_name || null,
              }
            : currentOrder,
        );

        setSuccessMessage(
          "Completed photo removed successfully.",
        );
      } catch (deleteError) {
        setError(
          deleteError.message ||
            "Unable to remove the completed photo.",
        );
      } finally {
        setIsUploadingCompleted(false);
      }
    };

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

  const getShortOrderId = (orderId) => {
    return orderId
      .replace(/-/g, "")
      .slice(0, 10)
      .toUpperCase();
  };

  const getStatusLabel = (status) => {
    return (
      orderStatuses.find(
        (item) => item.value === status,
      )?.label || status
    );
  };

  const getPaymentStatusLabel = (status) => {
    return (
      paymentStatuses.find(
        (item) => item.value === status,
      )?.label || status || "Pending"
    );
  };

  const getPaymentMethodLabel = (method) => {
    return (
      paymentMethods.find(
        (item) => item.value === method,
      )?.label || "Not Selected"
    );
  };

  const formatCurrency = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "₹0";
    }

    return `₹${Number(value).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      },
    )}`;
  };

  const getBalanceAmount = (order) => {
    const payable =
      Number(
        order.final_price ??
          order.estimated_price ??
          0,
      ) || 0;

    const paid =
      Number(order.amount_paid || 0) || 0;

    return Math.max(payable - paid, 0);
  };

  const sendWhatsAppUpdate = (order) => {
    const shortOrderId =
      getShortOrderId(order.id);

    const message = `
Hello ${order.customer_name},

This is an update from Kushi Digitals regarding your service order.

ORDER ID
KD-${shortOrderId}

SERVICE
${order.service}

CURRENT STATUS
${getStatusLabel(order.status)}

ESTIMATED PRICE
${
  order.estimated_price !== null &&
  order.estimated_price !== undefined
    ? `₹${Number(
        order.estimated_price,
      ).toLocaleString("en-IN")}`
    : "Not confirmed yet"
}

FINAL PRICE
${
  order.final_price !== null &&
  order.final_price !== undefined
    ? `₹${Number(
        order.final_price,
      ).toLocaleString("en-IN")}`
    : "Not confirmed yet"
}

INVOICE NUMBER
${order.invoice_number || "Not generated"}

PAYMENT STATUS
${getPaymentStatusLabel(order.payment_status)}

AMOUNT PAID
${formatCurrency(order.amount_paid)}

BALANCE
${formatCurrency(getBalanceAmount(order))}

PAYMENT METHOD
${getPaymentMethodLabel(order.payment_method)}

Delivery Type: ${order.delivery_type}

Please contact Kushi Digitals if you need any clarification.

Thank you,
Kushi Digitals
    `.trim();

    window.open(
      createWhatsAppLink(
        message,
        order.phone,
      ),
      "_blank",
      "noopener,noreferrer",
    );
  };


  const sendInvoiceWhatsApp = (order) => {
    const shortOrderId =
      getShortOrderId(order.id);

    const payableAmount =
      order.final_price ??
      order.estimated_price ??
      0;

    const message = `
Hello ${order.customer_name},

Thank you for choosing Kushi Digitals.

Your invoice and payment details are ready.

INVOICE NUMBER
${order.invoice_number || "Not generated"}

ORDER ID
KD-${shortOrderId}

SERVICE
${order.service}

QUANTITY
${order.quantity}

TOTAL AMOUNT
${formatCurrency(payableAmount)}

AMOUNT PAID
${formatCurrency(order.amount_paid)}

BALANCE
${formatCurrency(getBalanceAmount(order))}

PAYMENT STATUS
${getPaymentStatusLabel(order.payment_status)}

PAYMENT METHOD
${getPaymentMethodLabel(order.payment_method)}

PAYMENT REFERENCE
${order.payment_reference || "Not available"}

You can view and print this invoice from:
Customer Dashboard → My Orders → View Details → View Invoice

Thank you,
Kushi Digitals
Phone: +91 7337471733
    `.trim();

    window.open(
      createWhatsAppLink(
        message,
        order.phone,
      ),
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <div className="admin-orders-page">
      <section className="admin-orders-hero">
        <div>
          <span>
            ORDER MANAGEMENT
          </span>

          <h1>
            Manage Customer Orders
          </h1>

          <p>
            Review customer requirements,
            update order status, confirm
            pricing and send WhatsApp updates.
          </p>
        </div>

        <button
          type="button"
          className="admin-refresh-button"
          onClick={loadOrders}
          disabled={isLoading}
        >
          <RefreshCw
            size={18}
            className={
              isLoading
                ? "admin-spin"
                : ""
            }
          />

          Refresh Orders
        </button>
      </section>

      <section className="admin-order-summary-grid">
        <article>
          <Clock3 size={22} />

          <div>
            <span>Pending</span>
            <strong>{pendingCount}</strong>
          </div>
        </article>

        <article>
          <PackageCheck size={22} />

          <div>
            <span>Processing</span>
            <strong>
              {processingCount}
            </strong>
          </div>
        </article>

        <article>
          <CheckCircle2 size={22} />

          <div>
            <span>Completed</span>
            <strong>
              {completedCount}
            </strong>
          </div>
        </article>

        <article>
          <UserRound size={22} />

          <div>
            <span>Active / Archived</span>
            <strong>
              {activeOrders.length} / {archivedCount}
            </strong>
          </div>
        </article>
      </section>

      <section className="admin-orders-panel">
        <div className="admin-orders-toolbar">
          <div>
            <span>ALL CUSTOMER ORDERS</span>
            <h2>Order Directory</h2>
          </div>

          <div className="admin-orders-filters">
            <div className="admin-orders-search">
              <Search size={18} />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value,
                  )
                }
                placeholder="Search order, customer or phone..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value,
                )
              }
            >
              <option value="all">
                All Statuses
              </option>

              {orderStatuses.map(
                (status) => (
                  <option
                    key={status.value}
                    value={status.value}
                  >
                    {status.label}
                  </option>
                ),
              )}
            </select>

            <select
              value={archiveFilter}
              onChange={(event) =>
                setArchiveFilter(
                  event.target.value,
                )
              }
              aria-label="Filter archived orders"
            >
              <option value="active">
                Active Orders
              </option>

              <option value="archived">
                Archived Orders
              </option>

              <option value="all">
                Active + Archived
              </option>
            </select>
          </div>
        </div>

        {error && !selectedOrder && (
          <div className="admin-order-message error">
            <AlertCircle size={19} />
            <span>{error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="admin-orders-loading">
            <Clock3 size={25} />
            <span>
              Loading customer orders...
            </span>
          </div>
        ) : filteredOrders.length > 0 ? (
          <div className="admin-orders-table-wrapper">
            <table className="admin-orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Price</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Placed On</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map(
                  (order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>
                          KD-
                          {getShortOrderId(
                            order.id,
                          )}
                        </strong>

                        <span>
                          {order.delivery_type}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {
                            order.customer_name
                          }
                        </strong>

                        <span>
                          {order.phone}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {order.service}
                        </strong>

                        <span>
                          {order.size ||
                            "Not Applicable"}
                          {" · "}
                          Qty{" "}
                          {order.quantity}
                        </span>

                        {(order.completedFiles?.length > 0 || order.completed_photo_path) && (
                          <span className="admin-completed-file-label">
                            Completed photos ready
                          </span>
                        )}

                        {order.archived_at && (
                          <span className="admin-archived-order-label">
                            Archived
                          </span>
                        )}
                      </td>

                      <td>
                        <strong>
                          {order.final_price !==
                            null &&
                          order.final_price !==
                            undefined
                            ? `₹${Number(
                                order.final_price,
                              ).toLocaleString(
                                "en-IN",
                              )}`
                            : order.estimated_price !==
                                  null &&
                                order.estimated_price !==
                                  undefined
                              ? `₹${Number(
                                  order.estimated_price,
                                ).toLocaleString(
                                  "en-IN",
                                )}`
                              : "Not Set"}
                        </strong>

                        <span>
                          {order.final_price !==
                            null &&
                          order.final_price !==
                            undefined
                            ? "Final price"
                            : "Estimated price"}
                        </span>
                      </td>

                      <td>
                        <strong
                          className={`admin-payment-status ${order.payment_status || "pending"}`}
                        >
                          {getPaymentStatusLabel(
                            order.payment_status,
                          )}
                        </strong>

                        <span>
                          {formatCurrency(
                            order.amount_paid,
                          )}{" "}
                          paid
                        </span>
                      </td>

                      <td>
                        <span
                          className={`order-status ${order.status}`}
                        >
                          {getStatusLabel(
                            order.status,
                          )}
                        </span>
                      </td>

                      <td>
                        <span>
                          {formatDate(
                            order.created_at,
                          )}
                        </span>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="admin-view-order-button"
                          onClick={() =>
                            openOrderDetails(
                              order,
                            )
                          }
                        >
                          <Eye size={17} />
                          Manage
                        </button>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-orders-empty">
            <PackageCheck size={34} />

            <h3>No Orders Found</h3>

            <p>
              No customer orders match the
              selected search or status.
            </p>
          </div>
        )}
      </section>

      {selectedOrder && (
        <div
          className="admin-order-modal-backdrop"
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
            className="admin-order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-order-title"
          >
            <header className="admin-order-modal-header">
              <div>
                <span>
                  ORDER KD-
                  {getShortOrderId(
                    selectedOrder.id,
                  )}
                </span>

                <h2 id="admin-order-title">
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

            <div className="admin-order-modal-content">
              <div className="admin-order-detail-grid">
                <article>
                  <span>Customer</span>
                  <strong>
                    {
                      selectedOrder.customer_name
                    }
                  </strong>
                </article>

                <article>
                  <span>Phone</span>
                  <strong>
                    {selectedOrder.phone}
                  </strong>
                </article>

                <article>
                  <span>Size</span>
                  <strong>
                    {selectedOrder.size ||
                      "Not Applicable"}
                  </strong>
                </article>

                <article>
                  <span>Quantity</span>
                  <strong>
                    {selectedOrder.quantity}
                  </strong>
                </article>

                <article>
                  <span>Delivery</span>
                  <strong>
                    {
                      selectedOrder.delivery_type
                    }
                  </strong>
                </article>

                <article>
                  <span>Placed On</span>
                  <strong>
                    {formatDate(
                      selectedOrder.created_at,
                    )}
                  </strong>
                </article>

                <article>
                  <span>Invoice Number</span>
                  <strong>
                    {selectedOrder.invoice_number ||
                      "Not Generated"}
                  </strong>
                </article>

                <article>
                  <span>Payment Status</span>
                  <strong>
                    {getPaymentStatusLabel(
                      selectedOrder.payment_status,
                    )}
                  </strong>
                </article>

                {selectedOrder.archived_at && (
                  <>
                    <article>
                      <span>Archived On</span>
                      <strong>
                        {formatDate(
                          selectedOrder.archived_at,
                        )}
                      </strong>
                    </article>

                    <article>
                      <span>Archive Reason</span>
                      <strong>
                        {selectedOrder.archive_reason ||
                          "Not provided"}
                      </strong>
                    </article>
                  </>
                )}
              </div>

              <div className="admin-order-modal-layout">
                <div className="admin-order-photo-section">
                  <span>
                    CUSTOMER PHOTOS
                  </span>

                  {selectedOrder.originalFiles?.length > 0 ? (
                    <div className="admin-multiple-photo-grid">
                      {selectedOrder.originalFiles.map(
                        (file, index) => (
                          <article
                            key={file.id || file.file_path}
                            className="admin-multiple-photo-card"
                          >
                            <div className="admin-multiple-photo-preview">
                              {file.signedUrl ? (
                                <img
                                  src={file.signedUrl}
                                  alt={file.file_name}
                                />
                              ) : (
                                <FileImage size={34} />
                              )}

                              <span>{index + 1}</span>
                            </div>

                            <strong>
                              {file.file_name}
                            </strong>

                            <div className="admin-multiple-photo-actions">
                              {file.signedUrl && (
                                <a
                                  href={file.signedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Eye size={16} />
                                  View
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadPhoto(
                                    file,
                                  )
                                }
                              >
                                <Download size={16} />
                                Download
                              </button>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="admin-order-photo-preview">
                      <div>
                        <FileImage size={38} />
                        <p>
                          No customer photos uploaded
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="admin-order-update-section">
                  <span>
                    UPDATE ORDER
                  </span>

                  <div className="admin-order-field">
                    <label htmlFor="adminOrderStatus">
                      Order Status
                    </label>

                    <select
                      id="adminOrderStatus"
                      name="status"
                      value={editData.status}
                      onChange={
                        handleEditChange
                      }
                    >
                      {orderStatuses.map(
                        (status) => (
                          <option
                            key={
                              status.value
                            }
                            value={
                              status.value
                            }
                          >
                            {status.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div className="admin-order-price-grid">
                    <div className="admin-order-field">
                      <label htmlFor="estimatedPrice">
                        Estimated Price
                      </label>

                      <div className="admin-price-input">
                        <IndianRupee
                          size={17}
                        />

                        <input
                          id="estimatedPrice"
                          name="estimatedPrice"
                          type="number"
                          min="0"
                          step="1"
                          value={
                            editData.estimatedPrice
                          }
                          onChange={
                            handleEditChange
                          }
                          placeholder="Enter amount"
                        />
                      </div>
                    </div>

                    <div className="admin-order-field">
                      <label htmlFor="finalPrice">
                        Final Price
                      </label>

                      <div className="admin-price-input">
                        <IndianRupee
                          size={17}
                        />

                        <input
                          id="finalPrice"
                          name="finalPrice"
                          type="number"
                          min="0"
                          step="1"
                          value={
                            editData.finalPrice
                          }
                          onChange={
                            handleEditChange
                          }
                          placeholder="Enter amount"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="admin-payment-section">
                    <div className="admin-payment-heading">
                      <span>PAYMENT & INVOICE</span>
                      <strong>
                        {selectedOrder.invoice_number ||
                          "Invoice Pending"}
                      </strong>
                    </div>

                    <div className="admin-payment-grid">
                      <div className="admin-order-field">
                        <label htmlFor="paymentStatus">
                          Payment Status
                        </label>
                        <select
                          id="paymentStatus"
                          name="paymentStatus"
                          value={editData.paymentStatus}
                          onChange={handleEditChange}
                        >
                          {paymentStatuses.map((item) => (
                            <option key={item.value} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="admin-order-field">
                        <label htmlFor="amountPaid">
                          Amount Paid
                        </label>
                        <div className="admin-price-input">
                          <IndianRupee size={17} />
                          <input
                            id="amountPaid"
                            name="amountPaid"
                            type="number"
                            min="0"
                            step="0.01"
                            value={editData.amountPaid}
                            onChange={handleEditChange}
                            placeholder="Enter paid amount"
                          />
                        </div>
                      </div>

                      <div className="admin-order-field">
                        <label htmlFor="paymentMethod">
                          Payment Method
                        </label>
                        <select
                          id="paymentMethod"
                          name="paymentMethod"
                          value={editData.paymentMethod}
                          onChange={handleEditChange}
                        >
                          {paymentMethods.map((item) => (
                            <option key={item.value || "none"} value={item.value}>
                              {item.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="admin-order-field">
                        <label htmlFor="paymentReference">
                          Payment Reference
                        </label>
                        <input
                          id="paymentReference"
                          name="paymentReference"
                          type="text"
                          value={editData.paymentReference}
                          onChange={handleEditChange}
                          placeholder="UPI ID / transaction reference"
                        />
                      </div>
                    </div>

                    <div className="admin-payment-summary">
                      <div>
                        <span>Payable</span>
                        <strong>
                          {formatCurrency(
                            editData.finalPrice ||
                              editData.estimatedPrice ||
                              0,
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Paid</span>
                        <strong>
                          {formatCurrency(
                            editData.amountPaid || 0,
                          )}
                        </strong>
                      </div>
                      <div>
                        <span>Balance</span>
                        <strong>
                          {formatCurrency(
                            Math.max(
                              Number(
                                editData.finalPrice ||
                                  editData.estimatedPrice ||
                                  0,
                              ) - Number(editData.amountPaid || 0),
                              0,
                            ),
                          )}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="admin-invoice-whatsapp-button"
                      onClick={() =>
                        sendInvoiceWhatsApp(
                          selectedOrder,
                        )
                      }
                    >
                      <MessageCircle size={18} />
                      Send Invoice via WhatsApp
                    </button>
                  </div>

                  <div className={`admin-order-archive-section ${
                    selectedOrder.archived_at
                      ? "archived"
                      : ""
                  }`}>
                    <div className="admin-order-archive-heading">
                      <div>
                        <span>
                          ORDER ARCHIVE
                        </span>

                        <strong>
                          {selectedOrder.archived_at
                            ? "This order is archived"
                            : "Move completed or old orders out of the active list"}
                        </strong>
                      </div>

                      {selectedOrder.archived_at ? (
                        <RotateCcw size={20} />
                      ) : (
                        <Archive size={20} />
                      )}
                    </div>

                    {selectedOrder.archived_at ? (
                      <>
                        <div className="admin-archive-current-details">
                          <div>
                            <span>Archived On</span>
                            <strong>
                              {formatDate(
                                selectedOrder.archived_at,
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>Reason</span>
                            <strong>
                              {selectedOrder.archive_reason ||
                                "Not provided"}
                            </strong>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="admin-restore-order-button"
                          onClick={handleRestoreOrder}
                          disabled={isArchiving}
                        >
                          <RotateCcw size={18} />
                          {isArchiving
                            ? "Restoring..."
                            : "Restore to Active Orders"}
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="admin-order-field">
                          <label htmlFor="archiveReason">
                            Archive Reason
                          </label>

                          <textarea
                            id="archiveReason"
                            value={archiveReason}
                            onChange={(event) => {
                              setArchiveReason(
                                event.target.value,
                              );
                              setError("");
                              setSuccessMessage("");
                            }}
                            rows="3"
                            placeholder="Example: Order completed and delivered"
                          />
                        </div>

                        <button
                          type="button"
                          className="admin-archive-order-button"
                          onClick={handleArchiveOrder}
                          disabled={isArchiving}
                        >
                          <Archive size={18} />
                          {isArchiving
                            ? "Archiving..."
                            : "Archive Order"}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="admin-order-instructions">
                    <span>
                      Customer Instructions
                    </span>

                    <p>
                      {selectedOrder.instructions ||
                        "No additional instructions provided."}
                    </p>
                  </div>

                  {error && (
                    <div className="admin-order-message error">
                      <AlertCircle
                        size={18}
                      />

                      <span>{error}</span>
                    </div>
                  )}

                  {successMessage && (
                    <div className="admin-order-message success">
                      <CheckCircle2
                        size={18}
                      />

                      <span>
                        {successMessage}
                      </span>
                    </div>
                  )}

                  <div className="admin-order-modal-actions">
                    <button
                      type="button"
                      className="admin-save-order-button"
                      onClick={
                        handleSaveOrder
                      }
                      disabled={isSaving}
                    >
                      <CheckCircle2
                        size={18}
                      />

                      {isSaving
                        ? "Saving..."
                        : "Save Order Update"}
                    </button>

                    <button
                      type="button"
                      className="admin-whatsapp-order-button"
                      onClick={() =>
                        sendWhatsAppUpdate(
                          selectedOrder,
                        )
                      }
                    >
                      <MessageCircle
                        size={18}
                      />
                      Send WhatsApp Update
                    </button>
                  </div>
                </div>
              </div>

              <section className="admin-completed-photo-section">
                <div className="admin-completed-photo-heading">
                  <div>
                    <span>
                      COMPLETED / EDITED PHOTOS
                    </span>

                    <h3>
                      Deliver Final Photos to Customer
                    </h3>

                    <p>
                      Upload one or more finished images. They will appear securely in the customer My Photos page.
                    </p>
                  </div>
                </div>

                <label className="admin-completed-upload-area">
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    onChange={handleCompletedFileChange}
                  />

                  <UploadCloud size={25} />

                  <strong>
                    Choose Completed Photos
                  </strong>

                  <span>
                    Maximum 10 photos · 10 MB each · 50 MB combined
                  </span>
                </label>

                {completedFiles.length > 0 && (
                  <>
                    <div className="admin-selected-files-summary">
                      <strong>
                        {completedFiles.length} photo(s) selected
                      </strong>

                      <button
                        type="button"
                        onClick={() =>
                          setCompletedFiles([])
                        }
                      >
                        <Trash2 size={16} />
                        Remove All
                      </button>
                    </div>

                    <div className="admin-multiple-photo-grid selected">
                      {completedFiles.map(
                        (file, index) => (
                          <article
                            key={`${file.name}-${file.size}-${file.lastModified}`}
                            className="admin-multiple-photo-card"
                          >
                            <div className="admin-multiple-photo-preview">
                              <img
                                src={
                                  completedPreviewUrls[index]
                                }
                                alt={file.name}
                              />

                              <span>{index + 1}</span>
                            </div>

                            <strong>
                              {file.name}
                            </strong>

                            <button
                              type="button"
                              className="admin-remove-selected-photo"
                              onClick={() =>
                                removeSelectedCompletedFile(
                                  index,
                                )
                              }
                            >
                              <Trash2 size={16} />
                              Remove
                            </button>
                          </article>
                        ),
                      )}
                    </div>

                    <button
                      type="button"
                      className="admin-upload-completed-button"
                      onClick={handleUploadCompletedPhoto}
                      disabled={
                        isUploadingCompleted
                      }
                    >
                      <UploadCloud size={18} />

                      {isUploadingCompleted
                        ? "Uploading..."
                        : `Upload ${completedFiles.length} Completed Photo(s)`}
                    </button>
                  </>
                )}

                {selectedOrder.completedFiles?.length > 0 && (
                  <div className="admin-current-completed-files">
                    <div className="admin-current-completed-heading">
                      <strong>
                        Uploaded Completed Photos
                      </strong>

                      <span>
                        {selectedOrder.completedFiles.length} file(s)
                      </span>
                    </div>

                    <div className="admin-multiple-photo-grid">
                      {selectedOrder.completedFiles.map(
                        (file, index) => (
                          <article
                            key={file.id || file.file_path}
                            className="admin-multiple-photo-card"
                          >
                            <div className="admin-multiple-photo-preview">
                              {file.signedUrl ? (
                                <img
                                  src={file.signedUrl}
                                  alt={file.file_name}
                                />
                              ) : (
                                <FileImage size={34} />
                              )}

                              <span>{index + 1}</span>
                            </div>

                            <strong>
                              {file.file_name}
                            </strong>

                            <div className="admin-multiple-photo-actions">
                              {file.signedUrl && (
                                <a
                                  href={file.signedUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <Eye size={16} />
                                  View
                                </a>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadPhoto(
                                    file,
                                  )
                                }
                              >
                                <Download size={16} />
                                Download
                              </button>

                              <button
                                type="button"
                                className="danger"
                                onClick={() =>
                                  handleDeleteCompletedPhoto(
                                    file,
                                  )
                                }
                                disabled={
                                  isUploadingCompleted
                                }
                              >
                                <Trash2 size={16} />
                                Remove
                              </button>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminOrders;