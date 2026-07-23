import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useSearchParams,
} from "react-router-dom";

import {
  ArrowRight,
  CheckCircle2,
  FileImage,
  ImagePlus,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";

import PageHero from "../../components/PageHero";
import ServiceCard from "../../components/ServiceCard";
import { createWhatsAppLink } from "../../config/business";
import {
  findService,
  servicesData,
} from "../../config/services";
import { supabase } from "../../services/supabase";

const initialFormData = {
  customerName: "",
  phone: "",
  service: "",
  passportPackage: "",
  restorationDeliveryOption: "",
  printSize: "",
  customPrintSize: "",
  frameSize: "",
  customFrameSize: "",
  albumSize: "",
  numberOfPages: "",
  eventType: "",
  customEventType: "",
  eventDate: "",
  eventLocation: "",
  digitalServiceRequired: "",
  customServiceDescription: "",
  quantity: "1",
  deliveryType: "Studio Pickup",
  address: "",
  notes: "",
};

const passportPackages = [
  "Passport Size - 1 Sheet - 8 Photos",
  "Passport Size & Stamp Size - 1 Sheet - 4+4 Photos",
];

const restorationDeliveryOptions = [
  "Digital Only",
  "Digital + Print",
];

const printSizes = [
  "4 x 6 Inches",
  "5 x 7 Inches",
  "8 x 10 Inches",
  "8 x 12 Inches",
  "10 x 15 Inches",
  "12 x 18 Inches",
  "Custom Size",
];

const frameSizes = [
  "8 x 12 Inches",
  "10 x 15 Inches",
  "12 x 18 Inches",
  "Custom Size",
];

const albumSizes = [
  "15 x 24 Inches",
  "12 x 30 Inches",
  "12 x 36 Inches",
];

const eventTypes = [
  "Wedding",
  "Engagement",
  "Birthday",
  "Naming Ceremony",
  "Housewarming",
  "Outdoor Shoot",
  "Studio Shoot",
  "Other",
];

const serviceSpecificFields = [
  "passportPackage",
  "restorationDeliveryOption",
  "printSize",
  "customPrintSize",
  "frameSize",
  "customFrameSize",
  "albumSize",
  "numberOfPages",
  "eventType",
  "customEventType",
  "eventDate",
  "eventLocation",
  "digitalServiceRequired",
  "customServiceDescription",
];

const clearServiceSpecificFields = (formState) => {
  const nextState = { ...formState };

  serviceSpecificFields.forEach((fieldName) => {
    nextState[fieldName] = "";
  });

  return nextState;
};

const formatEventDate = (value) => {
  if (!value) {
    return "";
  }

  const [year, month, day] = value.split("-");
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
  );

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

const getServiceDetailEntries = (formState) => {
  switch (formState.service) {
    case "Passport Photos":
      return [
        {
          label: "Passport Photo Package",
          value: formState.passportPackage,
        },
      ];

    case "Photo Restoration":
      return [
        {
          label: "Delivery Option",
          value: formState.restorationDeliveryOption,
        },
        ...(formState.restorationDeliveryOption ===
          "Digital + Print" && formState.printSize
          ? [
              {
                label: "Print Size",
                value:
                  formState.printSize === "Custom Size"
                    ? formState.customPrintSize.trim()
                    : formState.printSize,
              },
            ]
          : []),
      ];

    case "Premium Frames":
      return [
        {
          label: "Frame Size",
          value:
            formState.frameSize === "Custom Size"
              ? formState.customFrameSize.trim()
              : formState.frameSize,
        },
      ];

    case "Album Designing":
      return [
        {
          label: "Album Size",
          value: formState.albumSize,
        },
        {
          label: "Number of Pages",
          value: formState.numberOfPages,
        },
      ];

    case "Photography":
      return [
        {
          label: "Event Type",
          value:
            formState.eventType === "Other"
              ? formState.customEventType.trim()
              : formState.eventType,
        },
        {
          label: "Event Date",
          value: formatEventDate(formState.eventDate),
        },
        {
          label: "Event Location",
          value: formState.eventLocation.trim(),
        },
      ];

    case "Digital Services":
      return [
        {
          label: "Digital Service Required",
          value: formState.digitalServiceRequired.trim(),
        },
      ];

    case "Other Service":
      return [
        {
          label: "Custom Service Description",
          value: formState.customServiceDescription.trim(),
        },
      ];

    default:
      return [];
  }
};

const getPrimaryOrderOption = (formState) => {
  const details = getServiceDetailEntries(formState);

  switch (formState.service) {
    case "Photo Restoration":
      return details
        .map((detail) => detail.value)
        .filter(Boolean)
        .join(" - ");

    case "Album Designing":
      return formState.albumSize
        ? `${formState.albumSize} - ${formState.numberOfPages} Pages`
        : "";

    case "Photography":
      return details
        .slice(0, 2)
        .map((detail) => detail.value)
        .filter(Boolean)
        .join(" - ");

    case "Digital Services":
      return "Digital Service Request";

    case "Other Service":
      return "Custom Service Request";

    default:
      return details[0]?.value || "";
  }
};

const getServiceValidationError = (formState) => {
  switch (formState.service) {
    case "Passport Photos":
      return formState.passportPackage
        ? ""
        : "Please select a passport photo package.";

    case "Photo Restoration":
      if (!formState.restorationDeliveryOption) {
        return "Please select a restoration delivery option.";
      }

      if (
        formState.restorationDeliveryOption ===
          "Digital + Print" &&
        formState.printSize === "Custom Size" &&
        !formState.customPrintSize.trim()
      ) {
        return "Please enter the required custom print size.";
      }

      return "";

    case "Premium Frames":
      if (!formState.frameSize) {
        return "Please select a frame size.";
      }

      if (
        formState.frameSize === "Custom Size" &&
        !formState.customFrameSize.trim()
      ) {
        return "Please enter the required custom frame size.";
      }

      return "";

    case "Album Designing": {
      if (!formState.albumSize) {
        return "Please select an album size.";
      }

      const numberOfPages = Number(
        formState.numberOfPages,
      );

      if (
        !Number.isInteger(numberOfPages) ||
        numberOfPages < 1
      ) {
        return "Please enter a whole number of album pages (minimum 1).";
      }

      return "";
    }

    case "Photography":
      if (!formState.eventType) {
        return "Please select an event type.";
      }

      if (
        formState.eventType === "Other" &&
        !formState.customEventType.trim()
      ) {
        return "Please enter the custom event type.";
      }

      if (!formState.eventDate) {
        return "Please select the event date.";
      }

      if (!formState.eventLocation.trim()) {
        return "Please enter the event location.";
      }

      return "";

    case "Digital Services":
      return formState.digitalServiceRequired.trim()
        ? ""
        : "Please describe the digital service you need.";

    case "Other Service":
      return formState.customServiceDescription.trim()
        ? ""
        : "Please describe the custom service you need.";

    default:
      return "";
  }
};

function BookService() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] =
    useSearchParams();
  const requestedServiceValue =
    searchParams.get("service");
  const initialService = findService(
    requestedServiceValue,
  );

  const [formData, setFormData] =
    useState(() => ({
      ...initialFormData,
      service: initialService?.name || "",
    }));

  const [selectedFiles, setSelectedFiles] =
    useState([]);

  const [previewUrls, setPreviewUrls] =
    useState([]);

  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [savedProfileAddress, setSavedProfileAddress] =
    useState("");

  useEffect(() => {
    if (!requestedServiceValue) {
      return;
    }

    const matchingService = findService(
      requestedServiceValue,
    );

    if (!matchingService) {
      return;
    }

    const updateTimer = window.setTimeout(
      () => {
        setFormData((currentData) => {
          if (
            currentData.service ===
            matchingService.name
          ) {
            return currentData;
          }

          return {
            ...clearServiceSpecificFields(
              currentData,
            ),
            service: matchingService.name,
          };
        });
      },
      0,
    );

    return () =>
      window.clearTimeout(updateTimer);
  }, [requestedServiceValue]);

  useEffect(() => {
    let isMounted = true;

    const loadCustomerDetails = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Unable to load signed-in customer:",
          userError,
        );
        return;
      }

      if (!isMounted || !user) {
        return;
      }

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          `
            full_name,
            phone,
            whatsapp_number,
            address_line,
            city,
            district,
            state,
            postal_code
          `,
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Unable to load customer profile:",
          profileError,
        );
      }

      const savedAddress = [
        profile?.address_line,
        profile?.city,
        profile?.district,
        profile?.state,
        profile?.postal_code,
      ]
        .filter(Boolean)
        .join(", ");

      setSavedProfileAddress(savedAddress);

      setFormData((currentData) => ({
        ...currentData,

        customerName:
          currentData.customerName ||
          profile?.full_name ||
          user.user_metadata?.full_name ||
          "",

        phone:
          currentData.phone ||
          profile?.phone ||
          profile?.whatsapp_number ||
          user.user_metadata?.phone ||
          "",

        address:
          currentData.address ||
          savedAddress,
      }));
    };

    loadCustomerDetails();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const urls = selectedFiles.map((file) =>
      URL.createObjectURL(file),
    );
    const previewTimer = window.setTimeout(
      () => setPreviewUrls(urls),
      0,
    );

    return () => {
      window.clearTimeout(previewTimer);
      urls.forEach((url) =>
        URL.revokeObjectURL(url),
      );
    };
  }, [selectedFiles]);

  const orderSummary = useMemo(() => {
    const serviceDetails =
      getServiceDetailEntries(formData).map(
        (detail) => ({
          ...detail,
          value:
            detail.value || "Not selected",
        }),
      );

    return [
      {
        label: "Service",
        value:
          formData.service || "Not selected",
      },
      ...serviceDetails,
      {
        label: "Quantity",
        value: formData.quantity || "1",
      },
      {
        label: "Delivery",
        value: formData.deliveryType,
      },
    ];
  }, [formData]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    if (name === "service") {
      setFormData((currentData) => {
        if (
          currentData.service === value
        ) {
          return currentData;
        }

        return {
          ...clearServiceSpecificFields(
            currentData,
          ),
          service: value,
        };
      });

      setSearchParams(
        (currentParams) => {
          const nextParams =
            new URLSearchParams(
              currentParams,
            );

          if (value) {
            nextParams.set(
              "service",
              value,
            );
          } else {
            nextParams.delete("service");
          }

          return nextParams;
        },
        { replace: true },
      );

      setError("");
      setSuccessMessage("");
      return;
    }

    setFormData((currentData) => {
      const nextData = {
        ...currentData,
        [name]: value,
      };

      if (
        name ===
          "restorationDeliveryOption" &&
        value !== "Digital + Print"
      ) {
        nextData.printSize = "";
        nextData.customPrintSize = "";
      }

      if (
        name === "printSize" &&
        value !== "Custom Size"
      ) {
        nextData.customPrintSize = "";
      }

      if (
        name === "frameSize" &&
        value !== "Custom Size"
      ) {
        nextData.customFrameSize = "";
      }

      if (
        name === "eventType" &&
        value !== "Other"
      ) {
        nextData.customEventType = "";
      }

      return nextData;
    });

    setError("");
    setSuccessMessage("");
  };

  const handleServiceCardSelect = (
    service,
  ) => {
    handleInputChange({
      target: {
        name: "service",
        value: service.name,
      },
    });

    window.requestAnimationFrame(() => {
      document
        .getElementById(
          "service-requirements",
        )
        ?.scrollIntoView({
          behavior: window.matchMedia(
            "(prefers-reduced-motion: reduce)",
          ).matches
            ? "auto"
            : "smooth",
          block: "nearest",
        });
    });
  };

  const handleFileChange = (event) => {
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
      ...selectedFiles,
      ...incomingFiles,
    ];

    if (combinedFiles.length > maximumFiles) {
      setError(
        `You can upload a maximum of ${maximumFiles} photos per order.`,
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
        `${invalidTypeFile.name}: Please upload JPG, JPEG, PNG or WEBP images only.`,
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
        `${oversizedFile.name}: Each photo must be below 10 MB.`,
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
        "Combined photo size must be below 50 MB.",
      );
      event.target.value = "";
      return;
    }

    const uniqueFiles = combinedFiles.filter(
      (file, index, files) =>
        index ===
        files.findIndex(
          (candidate) =>
            candidate.name === file.name &&
            candidate.size === file.size &&
            candidate.lastModified ===
              file.lastModified,
        ),
    );

    setSelectedFiles(uniqueFiles);
    setError("");
    setSuccessMessage("");
    event.target.value = "";
  };

  const removeSelectedFile = (fileIndex) => {
    setSelectedFiles((currentFiles) =>
      currentFiles.filter(
        (_, index) => index !== fileIndex,
      ),
    );

    setError("");
  };

  const createSafeFileName = (fileName) => {
    const extension =
      fileName.split(".").pop()?.toLowerCase() ||
      "jpg";

    const baseName = fileName
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 70);

    return `${baseName || "order-photo"}.${extension}`;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccessMessage("");

    if (!formData.customerName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!formData.phone.trim()) {
      setError("Please enter your phone number.");
      return;
    }

    if (!formData.service) {
      setError("Please select a service.");
      return;
    }

    const serviceValidationError =
      getServiceValidationError(formData);

    if (serviceValidationError) {
      setError(serviceValidationError);
      return;
    }

    if (
      formData.deliveryType ===
        "Home Delivery" &&
      !formData.address.trim()
    ) {
      setError(
        "Please enter the delivery address.",
      );

      return;
    }

    const quantity =
      Number.parseInt(formData.quantity, 10);

    if (
      Number.isNaN(quantity) ||
      quantity < 1 ||
      quantity > 100
    ) {
      setError(
        "Quantity must be between 1 and 100.",
      );

      return;
    }

    const uploadedPhotoPaths = [];
    let whatsappWindow = null;

    try {
      setIsSubmitting(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError(
          "Please login before placing your order.",
        );

        window.setTimeout(() => {
          navigate("/login", {
            state: {
              from:
                window.location.pathname +
                window.location.search,
            },
          });
        }, 900);

        return;
      }

      const enteredAddress =
        formData.address.trim();

      const addressWasChanged =
        formData.deliveryType ===
          "Home Delivery" &&
        enteredAddress &&
        enteredAddress !==
          savedProfileAddress.trim();

      const profileUpdate = {
        full_name:
          formData.customerName.trim(),
        phone: formData.phone.trim(),
      };

      if (addressWasChanged) {
        profileUpdate.address_line =
          enteredAddress;

        profileUpdate.city = null;
        profileUpdate.district = null;
        profileUpdate.state = null;
        profileUpdate.postal_code = null;
      }

      const { error: profileUpdateError } =
        await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("id", user.id);

      if (profileUpdateError) {
        throw new Error(
          `Profile details could not be updated: ${profileUpdateError.message}`,
        );
      }

      const { error: metadataUpdateError } =
        await supabase.auth.updateUser({
          data: {
            full_name:
              formData.customerName.trim(),
            phone: formData.phone.trim(),
          },
        });

      if (metadataUpdateError) {
        console.error(
          "Order profile metadata could not be refreshed:",
          metadataUpdateError,
        );
      }

      if (addressWasChanged) {
        setSavedProfileAddress(
          enteredAddress,
        );
      }

      whatsappWindow = window.open(
        "about:blank",
        "_blank",
      );

      for (
        let fileIndex = 0;
        fileIndex < selectedFiles.length;
        fileIndex += 1
      ) {
        const file = selectedFiles[fileIndex];

        const safeFileName =
          createSafeFileName(file.name);

        const uniqueFileName =
          typeof crypto.randomUUID ===
          "function"
            ? crypto.randomUUID()
            : `${Date.now()}-${fileIndex}-${Math.random()
                .toString(36)
                .slice(2)}`;

        const photoPath =
          `${user.id}/${uniqueFileName}-${safeFileName}`;

        const { error: uploadError } =
          await supabase.storage
            .from("order-photos")
            .upload(photoPath, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type,
            });

        if (uploadError) {
          throw new Error(
            `${file.name} upload failed: ${uploadError.message}`,
          );
        }

        uploadedPhotoPaths.push({
          path: photoPath,
          file,
        });
      }

      const serviceDetailEntries =
        getServiceDetailEntries(formData).filter(
          (detail) => detail.value,
        );

      const serviceRequirements =
        serviceDetailEntries.length > 0
          ? [
              "Service Requirements:",
              ...serviceDetailEntries.map(
                (detail) =>
                  `${detail.label}: ${detail.value}`,
              ),
            ].join("\n")
          : null;

      const combinedInstructions = [
        serviceRequirements,

        formData.address.trim()
          ? `Delivery Address: ${formData.address.trim()}`
          : null,

        formData.notes.trim()
          ? `Additional Instructions: ${formData.notes.trim()}`
          : null,
      ]
        .filter(Boolean)
        .join("\n\n");

      const {
        data: savedOrder,
        error: orderError,
      } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,

          customer_name:
            formData.customerName.trim(),

          phone: formData.phone.trim(),

          service: formData.service,

          size:
            getPrimaryOrderOption(formData) ||
            "Not Applicable",

          quantity,

          delivery_type:
            formData.deliveryType,

          instructions:
            combinedInstructions || null,

          photo_path:
            uploadedPhotoPaths[0]?.path ||
            null,

          photo_name:
            uploadedPhotoPaths[0]?.file
              ?.name || null,

          status: "pending",
        })
        .select("id")
        .single();

      if (orderError) {
        throw new Error(
          `Order could not be saved: ${orderError.message}`,
        );
      }

      if (uploadedPhotoPaths.length > 0) {
        const orderFileRows =
          uploadedPhotoPaths.map(
            ({ path, file }) => ({
              order_id: savedOrder.id,
              user_id: user.id,
              file_type: "original",
              storage_bucket:
                "order-photos",
              file_path: path,
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
              uploaded_by: "customer",
            }),
          );

        const {
          error: orderFilesError,
        } = await supabase
          .from("order_files")
          .insert(orderFileRows);

        if (orderFilesError) {
          throw new Error(
            `Order photos could not be linked: ${orderFilesError.message}`,
          );
        }
      }

      const shortOrderId =
        savedOrder.id
          .replace(/-/g, "")
          .slice(0, 10)
          .toUpperCase();

      const message = `
Hello Kushi Digitals,

I have placed a new service order through the Kushi Digitals website.

ORDER ID
KD-${shortOrderId}

CUSTOMER DETAILS
Name: ${formData.customerName}
Phone Number: ${formData.phone}

ORDER DETAILS
Required Service: ${formData.service}
${serviceDetailEntries
  .map(
    (detail) =>
      `${detail.label}: ${detail.value}`,
  )
  .join("\n")}
Quantity: ${quantity}
Delivery Type: ${
        formData.deliveryType
      }

DELIVERY ADDRESS
${
  formData.address ||
  "Studio Pickup / Not Applicable"
}

PHOTO FILES
${
  selectedFiles.length > 0
    ? `${selectedFiles.length} photo(s) uploaded securely through the website.
Files:
${selectedFiles
  .map(
    (file, index) =>
      `${index + 1}. ${file.name}`,
  )
  .join("\n")}`
    : "No photos uploaded."
}

ADDITIONAL REQUIREMENT
${
  formData.notes ||
  "No additional instructions."
}

Please review my order and confirm the final price and delivery details.
      `.trim();

      setSuccessMessage(
        `Order KD-${shortOrderId} was saved successfully. Your latest contact details were also updated. Opening WhatsApp and your Orders page...`,
      );

      const whatsappLink =
        createWhatsAppLink(message);

      if (whatsappWindow) {
        whatsappWindow.location.href =
          whatsappLink;
      } else {
        window.open(
          whatsappLink,
          "_blank",
          "noopener,noreferrer",
        );
      }

      setFormData((currentData) => ({
        ...initialFormData,
        customerName:
          currentData.customerName,
        phone: currentData.phone,
        address: currentData.address,
      }));
      setSelectedFiles([]);

      window.setTimeout(() => {
        navigate("/dashboard/orders");
      }, 1300);
    } catch (submitError) {
      if (
        uploadedPhotoPaths.length > 0
      ) {
        await supabase.storage
          .from("order-photos")
          .remove(
            uploadedPhotoPaths.map(
              (item) => item.path,
            ),
          );
      }

      if (whatsappWindow) {
        whatsappWindow.close();
      }

      setError(
        submitError.message ||
          "Unable to place your order. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="Book A Service"
        title="Place Your Order"
        highlight="Quickly & Easily"
        description="Select your required service, upload a photo, enter your order details and securely place your order with Kushi Digitals."
      />

      <section className="booking-section">
        <div className="container booking-layout">
          <form
            className="booking-form-card"
            onSubmit={handleSubmit}
          >
            <div className="booking-form-heading">
              <span>New Service Request</span>

              <h2>Tell Us What You Need</h2>

              <p>
                Complete the details below. We
                will review your order and
                confirm the final price through
                WhatsApp.
              </p>
            </div>

            {error && (
              <div
                className="booking-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {successMessage && (
              <div
                className="booking-success"
                role="status"
              >
                <CheckCircle2 size={19} />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="booking-form-section">
              <div className="booking-section-title">
                <UserRound size={20} />

                <div>
                  <strong>
                    Customer Details
                  </strong>

                  <span>
                    Enter your contact
                    information
                  </span>
                </div>
              </div>

              <div className="booking-form-grid">
                <div className="form-field">
                  <label htmlFor="customerName">
                    Full Name
                  </label>

                  <input
                    id="customerName"
                    name="customerName"
                    type="text"
                    value={
                      formData.customerName
                    }
                    onChange={
                      handleInputChange
                    }
                    placeholder="Enter your full name"
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="phone">
                    Phone Number
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={
                      handleInputChange
                    }
                    placeholder="Enter your phone number"
                    autoComplete="tel"
                    inputMode="tel"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="booking-form-section">
              <div className="booking-section-title">
                <PackageCheck size={20} />

                <div>
                  <strong>
                    Service Details
                  </strong>

                  <span>
                    Select service options and
                    quantity
                  </span>
                </div>
              </div>

              <div className="booking-service-selector">
                <div className="booking-service-selector__heading">
                  <strong>
                    Choose a service
                  </strong>

                  <span>
                    Select a card to see the
                    options for that service.
                  </span>
                </div>

                <div
                  className="premium-service-grid premium-service-grid--selector"
                  aria-label="Available services"
                >
                  {servicesData.map(
                    (service) => (
                      <ServiceCard
                        key={service.id}
                        service={service}
                        selected={
                          formData.service ===
                          service.name
                        }
                        onSelect={
                          handleServiceCardSelect
                        }
                        actionLabel="Select Service"
                        compact
                      />
                    ),
                  )}
                </div>

                <div className="service-selector-fallback form-field">
                  <label htmlFor="service">
                    Compact service list
                  </label>

                  <select
                    id="service"
                    name="service"
                    value={formData.service}
                    onChange={
                      handleInputChange
                    }
                    required
                  >
                    <option value="">
                      Choose a service
                    </option>

                    {servicesData.map(
                      (service) => (
                        <option
                          key={service.id}
                          value={service.name}
                        >
                          {service.name}
                        </option>
                      ),
                    )}
                  </select>
                </div>
              </div>

              <div
                className="booking-form-grid"
                id="service-requirements"
              >

                {formData.service ===
                  "Passport Photos" && (
                  <div className="form-field booking-full-field">
                    <label htmlFor="passportPackage">
                      Passport Photo Package
                    </label>

                    <select
                      id="passportPackage"
                      name="passportPackage"
                      value={
                        formData.passportPackage
                      }
                      onChange={
                        handleInputChange
                      }
                      required
                    >
                      <option value="">
                        Choose a package
                      </option>

                      {passportPackages.map(
                        (photoPackage) => (
                          <option
                            key={photoPackage}
                            value={photoPackage}
                          >
                            {photoPackage}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                )}

                {formData.service ===
                  "Photo Restoration" && (
                  <>
                    <div className="form-field booking-full-field">
                      <label htmlFor="restorationDeliveryOption">
                        Delivery Option
                      </label>

                      <select
                        id="restorationDeliveryOption"
                        name="restorationDeliveryOption"
                        value={
                          formData.restorationDeliveryOption
                        }
                        onChange={
                          handleInputChange
                        }
                        required
                      >
                        <option value="">
                          Choose a delivery option
                        </option>

                        {restorationDeliveryOptions.map(
                          (option) => (
                            <option
                              key={option}
                              value={option}
                            >
                              {option}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    {formData.restorationDeliveryOption ===
                      "Digital + Print" && (
                      <div className="form-field">
                        <label htmlFor="printSize">
                          Print Size (Optional)
                        </label>

                        <select
                          id="printSize"
                          name="printSize"
                          value={
                            formData.printSize
                          }
                          onChange={
                            handleInputChange
                          }
                        >
                          <option value="">
                            Select print size
                          </option>

                          {printSizes.map(
                            (size) => (
                              <option
                                key={size}
                                value={size}
                              >
                                {size}
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    )}

                    {formData.restorationDeliveryOption ===
                      "Digital + Print" &&
                      formData.printSize ===
                        "Custom Size" && (
                        <div className="form-field">
                          <label htmlFor="customPrintSize">
                            Custom Print Size
                          </label>

                          <input
                            id="customPrintSize"
                            name="customPrintSize"
                            type="text"
                            value={
                              formData.customPrintSize
                            }
                            onChange={
                              handleInputChange
                            }
                            placeholder="Enter required print size"
                            required
                          />
                        </div>
                      )}
                  </>
                )}

                {formData.service ===
                  "Premium Frames" && (
                  <>
                    <div className="form-field">
                      <label htmlFor="frameSize">
                        Frame Size
                      </label>

                      <select
                        id="frameSize"
                        name="frameSize"
                        value={
                          formData.frameSize
                        }
                        onChange={
                          handleInputChange
                        }
                        required
                      >
                        <option value="">
                          Select frame size
                        </option>

                        {frameSizes.map(
                          (size) => (
                            <option
                              key={size}
                              value={size}
                            >
                              {size}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    {formData.frameSize ===
                      "Custom Size" && (
                      <div className="form-field">
                        <label htmlFor="customFrameSize">
                          Custom Frame Size
                        </label>

                        <input
                          id="customFrameSize"
                          name="customFrameSize"
                          type="text"
                          value={
                            formData.customFrameSize
                          }
                          onChange={
                            handleInputChange
                          }
                          placeholder="Enter width x height"
                          required
                        />
                      </div>
                    )}
                  </>
                )}

                {formData.service ===
                  "Album Designing" && (
                  <>
                    <div className="form-field">
                      <label htmlFor="albumSize">
                        Album Size
                      </label>

                      <select
                        id="albumSize"
                        name="albumSize"
                        value={
                          formData.albumSize
                        }
                        onChange={
                          handleInputChange
                        }
                        required
                      >
                        <option value="">
                          Select album size
                        </option>

                        {albumSizes.map(
                          (size) => (
                            <option
                              key={size}
                              value={size}
                            >
                              {size}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="numberOfPages">
                        Number of Pages
                      </label>

                      <input
                        id="numberOfPages"
                        name="numberOfPages"
                        type="number"
                        min="1"
                        step="1"
                        value={
                          formData.numberOfPages
                        }
                        onChange={
                          handleInputChange
                        }
                        placeholder="Enter number of pages"
                        required
                      />
                    </div>
                  </>
                )}

                {formData.service ===
                  "Photography" && (
                  <>
                    <div className="form-field">
                      <label htmlFor="eventType">
                        Event Type
                      </label>

                      <select
                        id="eventType"
                        name="eventType"
                        value={
                          formData.eventType
                        }
                        onChange={
                          handleInputChange
                        }
                        required
                      >
                        <option value="">
                          Select event type
                        </option>

                        {eventTypes.map(
                          (eventType) => (
                            <option
                              key={eventType}
                              value={eventType}
                            >
                              {eventType}
                            </option>
                          ),
                        )}
                      </select>
                    </div>

                    <div className="form-field">
                      <label htmlFor="eventDate">
                        Event Date
                      </label>

                      <input
                        id="eventDate"
                        name="eventDate"
                        type="date"
                        value={
                          formData.eventDate
                        }
                        onChange={
                          handleInputChange
                        }
                        required
                      />
                    </div>

                    {formData.eventType ===
                      "Other" && (
                      <div className="form-field booking-full-field">
                        <label htmlFor="customEventType">
                          Custom Event Type
                        </label>

                        <input
                          id="customEventType"
                          name="customEventType"
                          type="text"
                          value={
                            formData.customEventType
                          }
                          onChange={
                            handleInputChange
                          }
                          placeholder="Enter event type"
                          required
                        />
                      </div>
                    )}

                    <div className="form-field booking-full-field">
                      <label htmlFor="eventLocation">
                        Event Location
                      </label>

                      <input
                        id="eventLocation"
                        name="eventLocation"
                        type="text"
                        value={
                          formData.eventLocation
                        }
                        onChange={
                          handleInputChange
                        }
                        placeholder="Enter event location"
                        required
                      />
                    </div>
                  </>
                )}

                {formData.service ===
                  "Digital Services" && (
                  <div className="form-field booking-full-field">
                    <label htmlFor="digitalServiceRequired">
                      Digital Service Required
                    </label>

                    <textarea
                      id="digitalServiceRequired"
                      name="digitalServiceRequired"
                      rows="4"
                      value={
                        formData.digitalServiceRequired
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Describe the digital service you need"
                      required
                    />
                  </div>
                )}

                {formData.service ===
                  "Other Service" && (
                  <div className="form-field booking-full-field">
                    <label htmlFor="customServiceDescription">
                      Custom Service Description
                    </label>

                    <textarea
                      id="customServiceDescription"
                      name="customServiceDescription"
                      rows="4"
                      value={
                        formData.customServiceDescription
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Describe the service you need in detail"
                      required
                    />
                  </div>
                )}

                <div className="form-field">
                  <label htmlFor="quantity">
                    Quantity
                  </label>

                  <input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="1"
                    max="100"
                    value={
                      formData.quantity
                    }
                    onChange={
                      handleInputChange
                    }
                    required
                  />
                </div>
              </div>
            </div>

            <div className="booking-form-section">
              <div className="booking-section-title">
                <ImagePlus size={20} />

                <div>
                  <strong>
                    Upload Your Photos
                  </strong>

                  <span>
                    Optional · JPG, PNG or WEBP — up to 10 photos
                  </span>
                </div>
              </div>

              <label className="photo-upload-area multiple-photo-upload-area">
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                />

                <span className="upload-icon">
                  <UploadCloud size={31} />
                </span>

                <strong>
                  Click to choose one or more photos
                </strong>

                <small>
                  Maximum 10 photos · 10 MB each · 50 MB combined
                </small>
              </label>

              {selectedFiles.length > 0 && (
                <>
                  <div className="multiple-photo-selection-summary">
                    <div>
                      <strong>
                        {selectedFiles.length} photo(s) selected
                      </strong>

                      <span>
                        {(
                          selectedFiles.reduce(
                            (total, file) =>
                              total + file.size,
                            0,
                          ) /
                          1024 /
                          1024
                        ).toFixed(2)}{" "}
                        MB total
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFiles([])
                      }
                    >
                      <Trash2 size={17} />
                      Remove All
                    </button>
                  </div>

                  <div className="selected-photo-grid">
                    {selectedFiles.map(
                      (file, index) => (
                        <article
                          className="selected-multiple-photo-card"
                          key={`${file.name}-${file.size}-${file.lastModified}`}
                        >
                          <div className="selected-multiple-photo-preview">
                            <img
                              src={
                                previewUrls[index]
                              }
                              alt={`Selected photo ${
                                index + 1
                              }`}
                            />

                            <span>
                              {index + 1}
                            </span>
                          </div>

                          <div className="selected-multiple-photo-info">
                            <FileImage
                              size={18}
                            />

                            <div>
                              <strong>
                                {file.name}
                              </strong>

                              <span>
                                {(
                                  file.size /
                                  1024 /
                                  1024
                                ).toFixed(2)}{" "}
                                MB
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            className="remove-multiple-photo-button"
                            onClick={() =>
                              removeSelectedFile(
                                index,
                              )
                            }
                            aria-label={`Remove ${file.name}`}
                          >
                            <Trash2
                              size={17}
                            />
                          </button>
                        </article>
                      ),
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="booking-form-section">
              <div className="booking-section-title">
                <MapPin size={20} />

                <div>
                  <strong>
                    Delivery Details
                  </strong>

                  <span>
                    Select how you want to
                    receive the order
                  </span>
                </div>
              </div>

              <div className="delivery-options">
                {[
                  "Studio Pickup",
                  "Home Delivery",
                  "Digital Delivery",
                ].map((deliveryType) => (
                  <label
                    key={deliveryType}
                    className={`delivery-option ${
                      formData.deliveryType ===
                      deliveryType
                        ? "selected"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryType"
                      value={deliveryType}
                      checked={
                        formData.deliveryType ===
                        deliveryType
                      }
                      onChange={
                        handleInputChange
                      }
                    />

                    <CheckCircle2 size={19} />
                    <span>{deliveryType}</span>
                  </label>
                ))}
              </div>

              {formData.deliveryType ===
                "Home Delivery" && (
                <div className="form-field booking-address-field">
                  <label htmlFor="address">
                    Complete Delivery Address
                  </label>

                  <textarea
                    id="address"
                    name="address"
                    rows="4"
                    value={formData.address}
                    onChange={
                      handleInputChange
                    }
                    placeholder="House number, village, mandal, district and PIN code"
                    required
                  />
                </div>
              )}

              <div className="form-field booking-notes-field">
                <label htmlFor="notes">
                  Additional Instructions
                </label>

                <textarea
                  id="notes"
                  name="notes"
                  rows="5"
                  value={formData.notes}
                  onChange={
                    handleInputChange
                  }
                  placeholder="Mention background colour, frame style, editing requirement or delivery date..."
                />
              </div>
            </div>

            <button
              type="submit"
              className="primary-button booking-submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving Your Order..."
                : "Place Order & Continue to WhatsApp"}

              <MessageCircle size={19} />
            </button>

            <div className="booking-security-note">
              <ShieldCheck size={18} />

              <span>
                Your order and uploaded photos
                are securely connected to your
                customer account.
              </span>
            </div>
          </form>

          <aside className="booking-summary-column">
            <div className="booking-summary-card">
              <span className="booking-summary-label">
                Live Order Summary
              </span>

              <h2>Your Requirement</h2>

              <div className="booking-summary-list">
                {orderSummary.map((item) => (
                  <div key={item.label}>
                    <span>{item.label}</span>
                    <strong>
                      {item.value}
                    </strong>
                  </div>
                ))}
              </div>

              <div className="booking-customer-preview">
                <Phone size={19} />

                <div>
                  <span>
                    Customer Contact
                  </span>

                  <strong>
                    {formData.phone ||
                      "Phone number not entered"}
                  </strong>
                </div>
              </div>

              <div className="booking-price-note">
                <span>
                  Price Information
                </span>

                <p>
                  Final price depends on photo
                  condition, selected size,
                  material, quantity and
                  delivery location.
                </p>
              </div>
            </div>

            <div className="booking-help-card">
              <MessageCircle size={24} />

              <div>
                <strong>
                  Need Help Before Ordering?
                </strong>

                <p>
                  Send your requirement through
                  WhatsApp and we will guide you
                  personally.
                </p>
              </div>

              <a
                href={createWhatsAppLink(
                  "Hello Kushi Digitals, I need help choosing the correct service.",
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Chat With Us
                <ArrowRight size={17} />
              </a>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}

export default BookService;
