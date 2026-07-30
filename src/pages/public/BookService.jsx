import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  FileImage,
  FileText,
  Info,
  LoaderCircle,
  Mail,
  MapPin,
  Minus,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from "lucide-react";

import PageHero from "../../components/PageHero";
import ServiceCard from "../../components/ServiceCard";
import {
  approvedBookingServiceNames,
  findBookingService,
  getBookingServiceConfiguration,
} from "../../config/bookingServices";
import {
  calculateServicePrice,
  formatIndianCurrency,
} from "../../config/servicePricing";
import { servicesData } from "../../config/services";
import { supabase } from "../../services/supabase";

const bookingServices = approvedBookingServiceNames
  .map((name) =>
    servicesData.find((service) => service.name === name),
  )
  .filter(Boolean);

const bookingSteps = [
  "Choose Service",
  "Service Options",
  "Upload Files",
  "Customer & Delivery",
  "Payment Method",
  "Review & Submit",
];

const paymentMethodLabels = {
  razorpay: "Pay Online with Razorpay",
  cash_on_delivery: "Cash on Delivery",
  pay_at_studio: "Pay at Studio",
  pay_later: "Pay Later After Confirmation",
};

const paymentEligibilityFields = new Set([
  "photoType",
  "background",
  "dressRequirement",
  "frameSize",
  "frameMaterial",
  "restorationType",
  "outputPreference",
  "printSize",
  "panServiceType",
  "travelType",
  "supportServiceType",
  "supportSize",
  "printType",
  "laminationType",
  "deliveryType",
]);

const initialFormData = {
  serviceCategory: "",
  service: "",
  customerName: "",
  phone: "",
  email: "",
  quantity: "1",
  deliveryType: "",
  instructions: "",
  photoType: "",
  background: "",
  customBackground: "",
  dressRequirement: "",
  frameSize: "",
  frameMaterial: "",
  restorationType: "",
  outputPreference: "",
  printSize: "",
  panServiceType: "",
  applicantType: "",
  travelType: "",
  fromLocation: "",
  toLocation: "",
  journeyDate: "",
  journeyType: "",
  returnDate: "",
  travelPreference: "",
  supportServiceType: "",
  supportSize: "",
  printType: "",
  laminationType: "",
  houseNumber: "",
  streetVillage: "",
  areaMandal: "",
  district: "",
  state: "",
  pincode: "",
  landmark: "",
  passengers: [],
  paymentMethod: "",
};

const allowedImageTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const allowedPdfType = "application/pdf";
const maximumFileSize = 10 * 1024 * 1024;
const maximumFiles = 10;

function createPassenger() {
  const uniqueId =
    globalThis.crypto?.randomUUID?.() ||
    `passenger-${Date.now()}-${Math.random()}`;

  return {
    id: uniqueId,
    fullName: "",
    age: "",
    gender: "",
    seatPreference: "",
  };
}

function createUniqueFileId(fileIndex) {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${fileIndex}`
  );
}

function createServiceFormData(service, currentData = {}) {
  const configuration =
    getBookingServiceConfiguration(service);

  return {
    ...initialFormData,
    customerName: currentData.customerName || "",
    phone: currentData.phone || "",
    email: currentData.email || "",
    houseNumber: currentData.houseNumber || "",
    streetVillage: currentData.streetVillage || "",
    areaMandal: currentData.areaMandal || "",
    district: currentData.district || "",
    state: currentData.state || "",
    pincode: currentData.pincode || "",
    landmark: currentData.landmark || "",
    serviceCategory: configuration?.category || "",
    service: service || "",
    deliveryType:
      configuration?.deliveryOptions?.[0] || "",
    photoType:
      configuration?.photoTypes?.[0] || "",
    background:
      configuration?.backgrounds?.[0] || "",
    dressRequirement:
      configuration?.dressRequirements?.[0] || "",
    travelType:
      configuration?.travelTypes?.[0] || "",
    journeyType:
      configuration?.journeyTypes?.[0] || "",
    passengers:
      service === "Travel Ticket Booking"
        ? [createPassenger()]
        : [],
  };
}

function getShortOrderId(orderId) {
  return orderId
    .replace(/-/g, "")
    .slice(0, 10)
    .toUpperCase();
}

function createSafeFileName(fileName) {
  const extension =
    fileName.split(".").pop()?.toLowerCase() || "jpg";
  const baseName = fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 70);

  return `${baseName || "order-file"}.${extension}`;
}

function formatAddress(formData) {
  return [
    formData.houseNumber,
    formData.streetVillage,
    formData.areaMandal,
    formData.district,
    formData.state,
    formData.pincode,
    formData.landmark
      ? `Landmark: ${formData.landmark}`
      : null,
  ]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(", ");
}

function getDatabaseSize(formData) {
  if (formData.service === "Photo Frames") {
    return formData.frameSize || "Not Applicable";
  }

  if (formData.service === "Photo Restoration") {
    return formData.printSize || "Not Applicable";
  }

  if (formData.service === "Passport Size Photos") {
    return formData.photoType || "Not Applicable";
  }

  if (
    formData.service ===
    "Laminations & Print Support"
  ) {
    return formData.supportSize || "Not Applicable";
  }

  return "Not Applicable";
}

function buildStructuredInstructions(formData) {
  const lines = [
    `Service: ${formData.service}`,
  ];

  if (formData.service === "Passport Size Photos") {
    lines.push(
      `Photo Pack: ${formData.photoType}`,
      `Background: ${
        formData.background === "Custom Background"
          ? formData.customBackground
          : formData.background
      }`,
      `Dress Requirement: ${formData.dressRequirement}`,
      `Number of Sets: ${formData.quantity}`,
    );
  }

  if (formData.service === "Photo Frames") {
    lines.push(
      `Frame Size: ${formData.frameSize}`,
      `Frame Material: ${formData.frameMaterial}`,
      `Quantity: ${formData.quantity}`,
    );
  }

  if (formData.service === "Photo Restoration") {
    lines.push(
      `Restoration Requirement: ${formData.restorationType}`,
      `Output Preference: ${formData.outputPreference}`,
    );

    if (formData.printSize) {
      lines.push(`Print Size: ${formData.printSize}`);
    }

    lines.push(`Quantity: ${formData.quantity}`);
  }

  if (formData.service === "PAN Card Services") {
    lines.push(
      `PAN Service Type: ${formData.panServiceType}`,
      `Applicant Type: ${formData.applicantType}`,
    );
  }

  if (formData.service === "Travel Ticket Booking") {
    lines.push(
      `Travel Type: ${formData.travelType}`,
      `From: ${formData.fromLocation}`,
      `To: ${formData.toLocation}`,
      `Journey Date: ${formData.journeyDate}`,
      `Return Journey: ${formData.journeyType}`,
    );

    if (formData.returnDate) {
      lines.push(`Return Date: ${formData.returnDate}`);
    }

    lines.push(
      `Travel Class / Preference: ${formData.travelPreference}`,
      `Number of Passengers: ${formData.passengers.length}`,
    );

    formData.passengers.forEach((passenger, index) => {
      lines.push(
        `Passenger ${index + 1}: ${passenger.fullName} | Age ${passenger.age} | ${passenger.gender}${
          passenger.seatPreference
            ? ` | Preference: ${passenger.seatPreference}`
            : ""
        }`,
      );
    });
  }

  if (
    formData.service ===
    "Laminations & Print Support"
  ) {
    lines.push(
      `Service Type: ${formData.supportServiceType}`,
      `Size: ${formData.supportSize}`,
    );

    if (formData.printType) {
      lines.push(`Print Type: ${formData.printType}`);
    }

    if (formData.laminationType) {
      lines.push(
        `Lamination Type: ${formData.laminationType}`,
      );
    }

    lines.push(`Quantity: ${formData.quantity}`);
  }

  lines.push(`Delivery Type: ${formData.deliveryType}`);

  if (formData.deliveryType === "Home Delivery") {
    lines.push(
      `Delivery Address: ${formatAddress(formData)}`,
    );
  }

  if (formData.instructions.trim()) {
    lines.push(
      `Customer Notes: ${formData.instructions.trim()}`,
    );
  }

  return lines.join("\n");
}

function buildReviewItems(
  formData,
  uploadedFileCount,
) {
  if (!formData.service) {
    return [
      {
        label: "Service",
        value: "Select one of the six services",
      },
    ];
  }

  const items = [
    {
      label: "Service",
      value: formData.service,
    },
  ];

  const addItem = (label, value) => {
    if (value) {
      items.push({ label, value });
    }
  };

  if (formData.service === "Passport Size Photos") {
    addItem("Photo Pack", formData.photoType);
    addItem(
      "Background",
      formData.background === "Custom Background"
        ? formData.customBackground
        : formData.background,
    );
    addItem("Dress", formData.dressRequirement);
    addItem("Number of Sets", formData.quantity);
  }

  if (formData.service === "Photo Frames") {
    addItem("Size", formData.frameSize);
    addItem("Material", formData.frameMaterial);
    addItem("Quantity", formData.quantity);
  }

  if (formData.service === "Photo Restoration") {
    addItem(
      "Restoration Requirement",
      formData.restorationType,
    );
    addItem("Output", formData.outputPreference);
    addItem("Print Size", formData.printSize);
    addItem("Quantity", formData.quantity);
  }

  if (formData.service === "PAN Card Services") {
    addItem("PAN Service", formData.panServiceType);
    addItem("Applicant", formData.applicantType);
  }

  if (formData.service === "Travel Ticket Booking") {
    addItem("Travel Type", formData.travelType);
    addItem(
      "Route",
      formData.fromLocation && formData.toLocation
        ? `${formData.fromLocation} → ${formData.toLocation}`
        : "",
    );
    addItem("Journey Date", formData.journeyDate);
    addItem("Return Journey", formData.journeyType);
    addItem("Return Date", formData.returnDate);
    addItem("Preference", formData.travelPreference);
    addItem(
      "Passengers",
      String(formData.passengers.length),
    );
  }

  if (
    formData.service ===
    "Laminations & Print Support"
  ) {
    addItem(
      "Service Type",
      formData.supportServiceType,
    );
    addItem("Size", formData.supportSize);
    addItem("Print Type", formData.printType);
    addItem(
      "Lamination Type",
      formData.laminationType,
    );
    addItem("Quantity", formData.quantity);
  }

  addItem("Uploaded Files", String(uploadedFileCount));
  addItem("Delivery", formData.deliveryType);
  addItem("Customer", formData.customerName);
  addItem("Phone", formData.phone);
  addItem("Email", formData.email.trim());
  addItem(
    "Payment Method",
    paymentMethodLabels[formData.paymentMethod],
  );

  return items;
}

function getAvailablePaymentMethods(
  formData,
  priceInformation,
) {
  if (!priceInformation.isComplete) {
    return [];
  }

  if (priceInformation.requiresManualConfirmation) {
    return [
      {
        value: "pay_later",
        label: paymentMethodLabels.pay_later,
        description:
          "Pay after Kushi Digitals confirms the final requirement.",
      },
    ];
  }

  const methods = [];
  const hasPayableAmount =
    priceInformation.isComplete &&
    !priceInformation.requiresManualConfirmation &&
    Number.isFinite(priceInformation.total) &&
    priceInformation.total > 0;

  if (hasPayableAmount) {
    methods.push({
      value: "razorpay",
      label: paymentMethodLabels.razorpay,
      description:
        "Secure online payment for the calculated amount.",
    });
  }

  const isPrintedRestoration =
    formData.service === "Photo Restoration" &&
    ["Printed Photo", "Digital + Printed"].includes(
      formData.outputPreference,
    );
  const supportsCashOnDelivery =
    formData.deliveryType === "Home Delivery" &&
    [
      "Passport Size Photos",
      "Photo Frames",
      "Laminations & Print Support",
    ].includes(formData.service);

  if (
    supportsCashOnDelivery ||
    (formData.deliveryType === "Home Delivery" &&
      isPrintedRestoration)
  ) {
    methods.push({
      value: "cash_on_delivery",
      label: paymentMethodLabels.cash_on_delivery,
      description:
        "Pay when your physical order is delivered.",
    });
  }

  if (formData.deliveryType === "Studio Pickup") {
    methods.push({
      value: "pay_at_studio",
      label: paymentMethodLabels.pay_at_studio,
      description:
        "Pay when you collect the completed order.",
    });
  }

  if (
    formData.service === "Travel Ticket Booking"
  ) {
    methods.push({
      value: "pay_later",
      label: paymentMethodLabels.pay_later,
      description:
        "Pay after Kushi Digitals confirms the final requirement.",
    });
  }

  return methods;
}

let razorpayScriptPromise;

function loadRazorpayCheckout() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise(
      (resolve, reject) => {
        const existingScript = document.querySelector(
          'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
        );
        const script =
          existingScript ||
          document.createElement("script");

        script.addEventListener("load", resolve, {
          once: true,
        });
        script.addEventListener(
          "error",
          () => {
            razorpayScriptPromise = undefined;
            reject(
              new Error(
                "Secure payment could not be loaded. Your order is saved and remains unpaid.",
              ),
            );
          },
          { once: true },
        );

        if (!existingScript) {
          script.src =
            "https://checkout.razorpay.com/v1/checkout.js";
          script.async = true;
          document.head.appendChild(script);
        }
      },
    );
  }

  return razorpayScriptPromise;
}

function openRazorpayCheckout({
  checkoutData,
  customer,
  service,
}) {
  return new Promise((resolve, reject) => {
    let isSettled = false;
    const settle = (callback, value) => {
      if (!isSettled) {
        isSettled = true;
        callback(value);
      }
    };
    const prefill = {
      name: customer.name,
      contact: customer.phone,
    };

    if (customer.email) {
      prefill.email = customer.email;
    }

    const checkout = new window.Razorpay({
      key: checkoutData.keyId,
      amount: checkoutData.amount,
      currency: checkoutData.currency,
      name: "Kushi Digitals",
      description: service,
      order_id: checkoutData.razorpayOrderId,
      prefill,
      theme: {
        color: "#8b5cf6",
      },
      handler: (response) =>
        settle(resolve, response),
      modal: {
        ondismiss: () =>
          settle(
            reject,
            new Error(
              "Payment was cancelled. Your order is saved and remains unpaid.",
            ),
          ),
      },
    });

    checkout.on("payment.failed", () =>
      settle(
        reject,
        new Error(
          "Payment was not completed. Your order is saved and remains unpaid.",
        ),
      ),
    );
    checkout.open();
  });
}

function StepHeading({ number, title, description }) {
  return (
    <div className="booking-section-title">
      <span className="booking-step-number">{number}</span>
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
    </div>
  );
}

function SelectField({
  label,
  name,
  value,
  options,
  onChange,
  error,
  placeholder = "Choose an option",
  className = "",
}) {
  return (
    <div className={`form-field ${className}`}>
      <label htmlFor={name}>{label}</label>
      <select
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        aria-invalid={Boolean(error)}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
      {error && (
        <small className="form-field-error">{error}</small>
      )}
    </div>
  );
}

function LivePrice({
  priceInformation,
  detail = "",
  className = "",
}) {
  const hasCalculatedTotal =
    priceInformation.isComplete &&
    !priceInformation.requiresManualConfirmation &&
    Number.isFinite(priceInformation.total) &&
    priceInformation.total > 0;
  let displayValue = "Select options to view price";

  if (hasCalculatedTotal) {
    displayValue = formatIndianCurrency(
      priceInformation.total,
    );
  } else if (
    priceInformation.requiresManualConfirmation
  ) {
    displayValue = "Price confirmation required";
  } else if (
    priceInformation.status ===
    "Upload photos to calculate the restoration total."
  ) {
    displayValue = priceInformation.status;
  }

  return (
    <div
      className={`booking-live-price ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span>Live Price</span>
      <strong
        className={
          hasCalculatedTotal ? "" : "is-message"
        }
      >
        {displayValue}
      </strong>
      {hasCalculatedTotal && detail && (
        <small>{detail}</small>
      )}
    </div>
  );
}

function QuantityControl({
  label,
  value,
  onDecrease,
  onIncrease,
  onChange,
  error,
  priceInformation,
  priceDetail = "",
}) {
  return (
    <div className="booking-quantity-price-row booking-full-field">
      <div className="form-field">
        <label htmlFor="quantity">{label}</label>
        <div className="booking-quantity-control">
          <button
            type="button"
            onClick={onDecrease}
            aria-label={`Decrease ${label.toLowerCase()}`}
          >
            <Minus size={17} />
          </button>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min="1"
            max="100"
            step="1"
            value={value}
            onChange={onChange}
            aria-invalid={Boolean(error)}
          />
          <button
            type="button"
            onClick={onIncrease}
            aria-label={`Increase ${label.toLowerCase()}`}
          >
            <Plus size={17} />
          </button>
        </div>
        {error && (
          <small className="form-field-error">
            {error}
          </small>
        )}
      </div>
      <LivePrice
        priceInformation={priceInformation}
        detail={priceDetail}
      />
    </div>
  );
}

function BookService() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialLoginReturnPath = useRef(
    location.pathname + location.search,
  );
  const [searchParams, setSearchParams] =
    useSearchParams();

  const requestedService = useMemo(
    () =>
      findBookingService(
        searchParams.get("service"),
      ),
    [searchParams],
  );

  const [formData, setFormData] = useState(() =>
    createServiceFormData(
      requestedService?.service || "",
    ),
  );
  const [selectedFiles, setSelectedFiles] =
    useState([]);
  const [previewUrls, setPreviewUrls] =
    useState([]);
  const previewUrlsRef = useRef([]);
  const [fieldErrors, setFieldErrors] =
    useState({});
  const [formError, setFormError] = useState("");
  const [isAuthChecking, setIsAuthChecking] =
    useState(true);
  const [isSubmitting, setIsSubmitting] =
    useState(false);
  const [submissionStage, setSubmissionStage] =
    useState("");
  const [currentUser, setCurrentUser] =
    useState(null);
  const [savedProfileAddress, setSavedProfileAddress] =
    useState("");
  const [savedOrder, setSavedOrder] =
    useState(null);

  const selectedServiceConfiguration = useMemo(
    () =>
      getBookingServiceConfiguration(
        formData.service,
      ),
    [formData.service],
  );

  const availableDeliveryTypes = useMemo(() => {
    const configuredOptions =
      selectedServiceConfiguration?.deliveryOptions ||
      [];

    if (
      formData.service === "Photo Restoration" &&
      ![
        "Printed Photo",
        "Digital + Printed",
      ].includes(formData.outputPreference)
    ) {
      return configuredOptions.filter(
        (option) => option !== "Home Delivery",
      );
    }

    return configuredOptions;
  }, [
    formData.outputPreference,
    formData.service,
    selectedServiceConfiguration,
  ]);

  const requiresUpload =
    Boolean(selectedServiceConfiguration?.requiresPhoto) ||
    (Boolean(
      selectedServiceConfiguration
        ?.requiresPhotoForOnline,
    ) &&
      formData.deliveryType === "Online Delivery");
  const acceptsPdf =
    Boolean(selectedServiceConfiguration?.acceptsPdf);
  const acceptedFileTypes = acceptsPdf
    ? ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
    : ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
  const priceInformation = useMemo(
    () =>
      calculateServicePrice(
        formData,
        selectedFiles.length,
      ),
    [formData, selectedFiles.length],
  );
  const availablePaymentMethods = useMemo(
    () =>
      getAvailablePaymentMethods(
        formData,
        priceInformation,
      ),
    [formData, priceInformation],
  );
  const orderSummary = useMemo(
    () =>
      buildReviewItems(
        formData,
        selectedFiles.length,
      ),
    [formData, selectedFiles.length],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadCustomer() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!isMounted) {
        return;
      }

      if (userError || !user) {
        navigate("/login", {
          replace: true,
          state: {
            from: initialLoginReturnPath.current,
          },
        });
        return;
      }

      setCurrentUser(user);

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "full_name, phone, whatsapp_number, address_line, city, district, state, postal_code",
        )
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error(
          "Unable to load customer profile:",
          profileError.message,
        );
      }

      if (!isMounted) {
        return;
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
          user.user_metadata?.name ||
          "",
        phone:
          currentData.phone ||
          profile?.phone ||
          profile?.whatsapp_number ||
          user.user_metadata?.phone ||
          "",
        email: currentData.email || user.email || "",
        houseNumber:
          currentData.houseNumber ||
          profile?.address_line ||
          "",
        streetVillage:
          currentData.streetVillage ||
          profile?.city ||
          "",
        district:
          currentData.district ||
          profile?.district ||
          "",
        state:
          currentData.state ||
          profile?.state ||
          "",
        pincode:
          currentData.pincode ||
          profile?.postal_code ||
          "",
      }));
      setIsAuthChecking(false);
    }

    loadCustomer();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  useEffect(
    () => () => {
      previewUrlsRef.current
        .filter(Boolean)
        .forEach((url) =>
          URL.revokeObjectURL(url),
        );
    },
    [],
  );

  function clearFieldError(name) {
    setFieldErrors((currentErrors) => {
      if (!currentErrors[name]) {
        return currentErrors;
      }

      const nextErrors = {
        ...currentErrors,
      };
      delete nextErrors[name];
      return nextErrors;
    });
  }

  function replaceSelectedFiles(nextFiles) {
    previewUrlsRef.current
      .filter(Boolean)
      .forEach((url) => URL.revokeObjectURL(url));
    const nextPreviewUrls = nextFiles.map((file) =>
      file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null,
    );

    previewUrlsRef.current = nextPreviewUrls;
    setSelectedFiles(nextFiles);
    setPreviewUrls(nextPreviewUrls);
  }

  function clearSelectedFiles() {
    replaceSelectedFiles([]);
  }

  function handleServiceSelect(service) {
    setFormData((currentData) =>
      createServiceFormData(
        service.name,
        currentData,
      ),
    );
    clearSelectedFiles();
    setFieldErrors({});
    setFormError("");
    setSearchParams(
      { service: service.name },
      { replace: true },
    );
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => {
      const nextData = {
        ...currentData,
        [name]: value,
      };

      if (
        name === "background" &&
        value !== "Custom Background"
      ) {
        nextData.customBackground = "";
      }

      if (name === "outputPreference") {
        if (value === "Digital File") {
          nextData.printSize = "";

          if (
            currentData.deliveryType ===
            "Home Delivery"
          ) {
            nextData.deliveryType =
              "Online Delivery";
          }
        }
      }

      if (name === "travelType") {
        nextData.travelPreference = "";
      }

      if (
        name === "journeyType" &&
        value !== "Round Trip"
      ) {
        nextData.returnDate = "";
      }

      if (name === "supportServiceType") {
        const isPrintService = [
          "Document Print",
          "Xerox",
        ].includes(value);
        const isLaminationService = [
          "Document Lamination",
          "ID Card Lamination",
        ].includes(value);

        if (!isPrintService) {
          nextData.printType = "";
        }

        if (!isLaminationService) {
          nextData.laminationType = "";
        }
      }

      if (paymentEligibilityFields.has(name)) {
        nextData.paymentMethod = "";
      }

      return nextData;
    });
    clearFieldError(name);
    setFormError("");
  }

  function updateQuantity(nextQuantity) {
    const quantity = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(nextQuantity, 10) || 1,
      ),
    );

    setFormData((currentData) => ({
      ...currentData,
      quantity: String(quantity),
    }));
    clearFieldError("quantity");
  }

  function updatePassengerCount(nextCount) {
    const passengerCount = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(nextCount, 10) || 1,
      ),
    );

    setFormData((currentData) => {
      const passengers = [
        ...currentData.passengers,
      ];

      while (passengers.length < passengerCount) {
        passengers.push(createPassenger());
      }

      return {
        ...currentData,
        quantity: String(passengerCount),
        passengers: passengers.slice(
          0,
          passengerCount,
        ),
      };
    });
    clearFieldError("quantity");
  }

  function handlePassengerChange(
    passengerId,
    field,
    value,
  ) {
    setFormData((currentData) => ({
      ...currentData,
      passengers: currentData.passengers.map(
        (passenger) =>
          passenger.id === passengerId
            ? {
                ...passenger,
                [field]: value,
              }
            : passenger,
      ),
    }));
    clearFieldError(`${passengerId}-${field}`);
  }

  function removePassenger(passengerId) {
    setFormData((currentData) => {
      if (currentData.passengers.length === 1) {
        return currentData;
      }

      const passengers =
        currentData.passengers.filter(
          (passenger) =>
            passenger.id !== passengerId,
        );

      return {
        ...currentData,
        passengers,
        quantity: String(passengers.length),
      };
    });
  }

  function handleFileChange(event) {
    const incomingFiles = Array.from(
      event.target.files || [],
    );
    event.target.value = "";

    if (!incomingFiles.length) {
      return;
    }

    const allowedTypes = new Set([
      ...allowedImageTypes,
      ...(acceptsPdf ? [allowedPdfType] : []),
    ]);
    const invalidFile = incomingFiles.find(
      (file) => !allowedTypes.has(file.type),
    );

    if (invalidFile) {
      setFieldErrors((errors) => ({
        ...errors,
        files: `${invalidFile.name} is not supported. Use JPG, JPEG, PNG, WEBP${
          acceptsPdf ? " or PDF" : ""
        }.`,
      }));
      return;
    }

    const oversizedFile = incomingFiles.find(
      (file) => file.size > maximumFileSize,
    );

    if (oversizedFile) {
      setFieldErrors((errors) => ({
        ...errors,
        files: `${oversizedFile.name} is larger than 10 MB.`,
      }));
      return;
    }

    const uniqueFiles = [
      ...selectedFiles,
      ...incomingFiles,
    ].filter(
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

    if (uniqueFiles.length > maximumFiles) {
      setFieldErrors((errors) => ({
        ...errors,
        files: `Upload a maximum of ${maximumFiles} files per order.`,
      }));
      return;
    }

    replaceSelectedFiles(uniqueFiles);
    clearFieldError("files");
  }

  function removeSelectedFile(indexToRemove) {
    replaceSelectedFiles(
      selectedFiles.filter(
        (_, index) => index !== indexToRemove,
      ),
    );
    clearFieldError("files");
  }

  function validateForm() {
    const errors = {};
    const compactPhone = formData.phone.replace(
      /[\s()-]/g,
      "",
    );
    const quantity = Number.parseInt(
      formData.quantity,
      10,
    );

    if (!formData.service) {
      errors.service =
        "Please choose the service you need.";
    }

    if (!formData.customerName.trim()) {
      errors.customerName =
        "Please enter your full name.";
    }

    if (
      !/^(?:\+91|91)?[6-9]\d{9}$/.test(
        compactPhone,
      )
    ) {
      errors.phone =
        "Enter a valid 10-digit Indian mobile number. You may include +91.";
    }

    if (
      formData.email.trim() &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        formData.email.trim(),
      )
    ) {
      errors.email =
        "Enter a valid email address or leave this field blank.";
    }

    if (
      formData.service !== "PAN Card Services" &&
      (!Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > 100)
    ) {
      errors.quantity =
        "Quantity must be between 1 and 100.";
    }

    if (
      !formData.deliveryType ||
      !availableDeliveryTypes.includes(
        formData.deliveryType,
      )
    ) {
      errors.deliveryType =
        "Please select an available delivery type.";
    }

    if (
      formData.service === "Passport Size Photos"
    ) {
      if (!formData.photoType) {
        errors.photoType =
          "Please choose a photo type.";
      }
      if (!formData.background) {
        errors.background =
          "Please choose a background.";
      }
      if (
        formData.background ===
          "Custom Background" &&
        !formData.customBackground.trim()
      ) {
        errors.customBackground =
          "Describe the custom background.";
      }
      if (!formData.dressRequirement) {
        errors.dressRequirement =
          "Please choose a dress requirement.";
      }
    }

    if (formData.service === "Photo Frames") {
      if (!formData.frameSize) {
        errors.frameSize =
          "Please choose a frame size.";
      }
      if (!formData.frameMaterial) {
        errors.frameMaterial =
          "Please choose MDF or PVC.";
      }
    }

    if (formData.service === "Photo Restoration") {
      if (!formData.restorationType) {
        errors.restorationType =
          "Please choose a restoration type.";
      }
      if (!formData.outputPreference) {
        errors.outputPreference =
          "Please choose an output preference.";
      }
      if (
        [
          "Printed Photo",
          "Digital + Printed",
        ].includes(formData.outputPreference) &&
        !formData.printSize
      ) {
        errors.printSize =
          "Please choose a print size.";
      }
    }

    if (formData.service === "PAN Card Services") {
      if (!formData.panServiceType) {
        errors.panServiceType =
          "Please choose the PAN service required.";
      }
      if (!formData.applicantType) {
        errors.applicantType =
          "Please choose an applicant type.";
      }
    }

    if (
      formData.service === "Travel Ticket Booking"
    ) {
      if (!formData.travelType) {
        errors.travelType =
          "Please choose train, bus or flight.";
      }
      if (!formData.fromLocation.trim()) {
        errors.fromLocation =
          "Enter the starting location.";
      }
      if (!formData.toLocation.trim()) {
        errors.toLocation =
          "Enter the destination.";
      }
      if (!formData.journeyDate) {
        errors.journeyDate =
          "Choose a journey date.";
      }
      if (!formData.journeyType) {
        errors.journeyType =
          "Choose one way or round trip.";
      }
      if (
        formData.journeyType === "Round Trip" &&
        !formData.returnDate
      ) {
        errors.returnDate =
          "Choose a return date.";
      }
      if (!formData.travelPreference) {
        errors.travelPreference =
          "Choose a travel class or preference.";
      }

      formData.passengers.forEach((passenger) => {
        if (!passenger.fullName.trim()) {
          errors[`${passenger.id}-fullName`] =
            "Enter the passenger name.";
        }
        if (
          !passenger.age ||
          Number(passenger.age) < 1 ||
          Number(passenger.age) > 120
        ) {
          errors[`${passenger.id}-age`] =
            "Enter a valid age.";
        }
        if (!passenger.gender) {
          errors[`${passenger.id}-gender`] =
            "Choose a gender.";
        }
      });
    }

    if (
      formData.service ===
      "Laminations & Print Support"
    ) {
      if (!formData.supportServiceType) {
        errors.supportServiceType =
          "Please choose a service type.";
      }
      if (!formData.supportSize) {
        errors.supportSize =
          "Please choose a size.";
      }
      if (
        [
          "Document Print",
          "Xerox",
        ].includes(formData.supportServiceType) &&
        !formData.printType
      ) {
        errors.printType =
          "Please choose black and white or color.";
      }
      if (
        [
          "Document Lamination",
          "ID Card Lamination",
        ].includes(formData.supportServiceType) &&
        !formData.laminationType
      ) {
        errors.laminationType =
          "Please choose a lamination type.";
      }
    }

    if (
      requiresUpload &&
      selectedFiles.length === 0
    ) {
      errors.files = `Please upload at least one file for ${formData.service}.`;
    }

    if (formData.deliveryType === "Home Delivery") {
      [
        ["houseNumber", "Enter the house or door number."],
        [
          "streetVillage",
          "Enter the street or village.",
        ],
        ["areaMandal", "Enter the area or mandal."],
        ["district", "Enter the district."],
        ["state", "Enter the state."],
        ["landmark", "Enter a nearby landmark."],
      ].forEach(([field, message]) => {
        if (!formData[field].trim()) {
          errors[field] = message;
        }
      });

      if (!/^\d{6}$/.test(formData.pincode.trim())) {
        errors.pincode =
          "Enter a valid 6-digit pincode.";
      }
    }

    if (
      !formData.paymentMethod ||
      !availablePaymentMethods.some(
        (method) =>
          method.value === formData.paymentMethod,
      )
    ) {
      errors.paymentMethod =
        "Please choose an available payment method.";
    }

    setFieldErrors(errors);
    return {
      isValid: Object.keys(errors).length === 0,
      quantity:
        formData.service === "PAN Card Services"
          ? 1
          : quantity,
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFormError("");
    const validation = validateForm();

    if (!validation.isValid) {
      setFormError(
        "Please review the highlighted fields before submitting.",
      );
      return;
    }

    if (!currentUser) {
      navigate("/login", {
        state: {
          from:
            location.pathname +
            location.search,
        },
      });
      return;
    }

    const uploadedFiles = [];
    let insertedOrder = null;

    try {
      setIsSubmitting(true);

      for (
        let fileIndex = 0;
        fileIndex < selectedFiles.length;
        fileIndex += 1
      ) {
        const file = selectedFiles[fileIndex];
        setSubmissionStage(
          `Uploading file ${fileIndex + 1} of ${selectedFiles.length}...`,
        );
        const uniqueFileName =
          createUniqueFileId(fileIndex);
        const filePath = `${
          currentUser.id
        }/${uniqueFileName}-${createSafeFileName(
          file.name,
        )}`;

        const { error: uploadError } =
          await supabase.storage
            .from("order-photos")
            .upload(filePath, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type,
            });

        if (uploadError) {
          throw new Error(
            `We could not upload ${file.name}. Please try again.`,
          );
        }

        uploadedFiles.push({
          path: filePath,
          file,
        });
      }

      setSubmissionStage("Saving your service request...");
      const structuredInstructions =
        buildStructuredInstructions(formData);

      const {
        data: order,
        error: orderError,
      } = await supabase
        .from("orders")
        .insert({
          user_id: currentUser.id,
          customer_name:
            formData.customerName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          service_category:
            selectedServiceConfiguration.category,
          service: formData.service,
          size: getDatabaseSize(formData),
          quantity: validation.quantity,
          delivery_type:
            formData.deliveryType,
          instructions: structuredInstructions,
          photo_path:
            uploadedFiles[0]?.path || null,
          photo_name:
            uploadedFiles[0]?.file.name || null,
          status: "pending",
          payment_status: "pending",
          amount_paid: 0,
          payment_method:
            formData.paymentMethod,
          estimated_price:
            priceInformation.estimatedPrice,
          final_price:
            priceInformation.finalPrice,
        })
        .select(
          "id, invoice_number, service_category, service, status, payment_status, payment_method, estimated_price, final_price, amount_paid, created_at",
        )
        .single();

      if (orderError) {
        throw new Error(
          "Your order could not be saved. Please check the details and try again.",
        );
      }

      insertedOrder = order;
      let filesLinked = true;

      if (uploadedFiles.length > 0) {
        setSubmissionStage(
          "Linking uploaded files to your order...",
        );
        const {
          error: orderFilesError,
        } = await supabase
          .from("order_files")
          .insert(
            uploadedFiles.map(
              ({ path, file }) => ({
                order_id: order.id,
                user_id: currentUser.id,
                file_type: "original",
                storage_bucket:
                  "order-photos",
                file_path: path,
                file_name: file.name,
                file_size: file.size,
                mime_type: file.type,
                uploaded_by: "customer",
              }),
            ),
          );

        if (orderFilesError) {
          filesLinked = false;
          console.error(
            "Order was saved, but file records could not be linked:",
            orderFilesError.message,
          );
        }
      }

      const profileUpdate = {
        full_name:
          formData.customerName.trim(),
        phone: formData.phone.trim(),
      };
      const enteredAddress =
        formatAddress(formData);

      if (
        formData.deliveryType ===
          "Home Delivery" &&
        enteredAddress &&
        enteredAddress !==
          savedProfileAddress.trim()
      ) {
        profileUpdate.address_line =
          enteredAddress;
      }

      const { error: profileUpdateError } =
        await supabase
          .from("profiles")
          .update(profileUpdate)
          .eq("id", currentUser.id);

      if (profileUpdateError) {
        console.error(
          "Order saved; profile details were not updated:",
          profileUpdateError.message,
        );
      }

      const savedOrderDetails = {
        ...order,
        fileCount: uploadedFiles.length,
        filesLinked,
        reviewItems: orderSummary,
      };

      clearSelectedFiles();

      if (formData.paymentMethod === "razorpay") {
        try {
          setSubmissionStage(
            "Preparing secure online payment...",
          );
          const {
            data: checkoutData,
            error: createPaymentError,
          } = await supabase.functions.invoke(
            "create-razorpay-order",
            {
              body: {
                orderId: order.id,
              },
            },
          );

          if (
            createPaymentError ||
            !checkoutData?.razorpayOrderId
          ) {
            throw new Error(
              "Secure payment could not be prepared. Your order is saved and remains unpaid.",
            );
          }

          await loadRazorpayCheckout();
          setSubmissionStage(
            "Complete payment in the secure checkout...",
          );
          const checkoutResponse =
            await openRazorpayCheckout({
              checkoutData,
              customer: {
                name: formData.customerName.trim(),
                phone: formData.phone.trim(),
                email:
                  formData.email.trim() ||
                  currentUser.email ||
                  "",
              },
              service: formData.service,
            });

          setSubmissionStage(
            "Verifying your payment securely...",
          );
          const {
            data: verificationData,
            error: verificationError,
          } = await supabase.functions.invoke(
            "verify-razorpay-payment",
            {
              body: {
                orderId: order.id,
                razorpay_payment_id:
                  checkoutResponse.razorpay_payment_id,
                razorpay_order_id:
                  checkoutResponse.razorpay_order_id,
                razorpay_signature:
                  checkoutResponse.razorpay_signature,
              },
            },
          );

          if (
            verificationError ||
            !verificationData?.verified
          ) {
            throw new Error(
              "Payment could not be verified. Your order is saved; please check My Orders before trying again.",
            );
          }

          setSavedOrder({
            ...savedOrderDetails,
            payment_status: "paid",
            amount_paid:
              verificationData.amountPaid,
          });
        } catch (paymentError) {
          setSavedOrder({
            ...savedOrderDetails,
            paymentNotice:
              paymentError.message ||
              "Online payment was not completed. Your order is saved and remains unpaid.",
          });
        }
      } else {
        setSavedOrder(savedOrderDetails);
      }

      window.scrollTo({
        top: 0,
        behavior: window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches
          ? "auto"
          : "smooth",
      });
    } catch (submitError) {
      if (
        !insertedOrder &&
        uploadedFiles.length > 0
      ) {
        const { error: cleanupError } =
          await supabase.storage
            .from("order-photos")
            .remove(
              uploadedFiles.map(
                (file) => file.path,
              ),
            );

        if (cleanupError) {
          console.error(
            "Unable to remove unused uploads:",
            cleanupError.message,
          );
        }
      }

      setFormError(
        submitError.message ||
          "We could not place your order. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
      setSubmissionStage("");
    }
  }

  if (isAuthChecking) {
    return (
      <section className="booking-auth-loader">
        <LoaderCircle
          size={34}
          className="spin-icon"
        />
        <strong>Preparing your booking</strong>
        <span>
          Securely checking your customer account...
        </span>
      </section>
    );
  }

  if (savedOrder) {
    const displayOrderNumber =
      savedOrder.invoice_number ||
      `KD-${getShortOrderId(savedOrder.id)}`;

    return (
      <div className="booking-builder-page">
        <PageHero
          eyebrow="Order Confirmed"
          title="Your Service Request"
          highlight="Is Successfully Placed"
          description="Your request is securely saved. Follow its service and payment status from My Orders."
        />

        <section className="booking-section booking-success-section">
          <div className="container">
            <article className="booking-success-card">
              <div className="booking-success-icon">
                <CheckCircle2 size={42} />
              </div>

              <span>REQUEST RECEIVED</span>
              <h1>Thank you for choosing Kushi Digitals</h1>
              <p>
                Our team will review your requirement and
                confirm the next steps.
              </p>

              <div className="booking-success-details">
                <div>
                  <span>Invoice / Order ID</span>
                  <strong>{displayOrderNumber}</strong>
                </div>
                <div>
                  <span>Selected Service</span>
                  <strong>{savedOrder.service}</strong>
                </div>
                <div>
                  <span>Uploaded Files</span>
                  <strong>{savedOrder.fileCount}</strong>
                </div>
                <div>
                  <span>Order Status</span>
                  <strong className="pending">
                    {savedOrder.status || "pending"}
                  </strong>
                </div>
                <div>
                  <span>Payment Status</span>
                  <strong
                    className={
                      savedOrder.payment_status === "paid"
                        ? "paid"
                        : "pending"
                    }
                  >
                    {savedOrder.payment_status ||
                      "pending"}
                  </strong>
                </div>
              </div>

              <div className="booking-success-options">
                <strong>Service Details</strong>
                {savedOrder.reviewItems
                  .filter(
                    (item) =>
                      ![
                        "Service",
                        "Customer",
                        "Phone",
                        "Uploaded Files",
                      ].includes(item.label),
                  )
                  .map((item) => (
                    <div key={item.label}>
                      <span>{item.label}</span>
                      <b>{item.value}</b>
                    </div>
                  ))}
              </div>

              <p className="booking-success-next-step">
                {savedOrder.payment_status === "paid"
                  ? "Your payment is verified and the order is ready for Kushi Digitals to process."
                  : "Your order is saved. Kushi Digitals will confirm availability and the next action through your account or contact details."}
              </p>

              {savedOrder.paymentNotice && (
                <div
                  className="booking-success-file-warning"
                  role="alert"
                >
                  {savedOrder.paymentNotice}
                </div>
              )}

              {!savedOrder.filesLinked &&
                savedOrder.fileCount > 0 && (
                  <div
                    className="booking-success-file-warning"
                    role="alert"
                  >
                    The order was saved, but the uploaded file
                    links need support verification. Please
                    contact Kushi Digitals with the order ID
                    above.
                  </div>
                )}

              <div className="booking-success-actions">
                <Link
                  to="/dashboard/orders"
                  className="primary-button"
                >
                  View My Orders
                  <ArrowRight size={18} />
                </Link>
                <Link
                  to="/"
                  className="secondary-button"
                >
                  Return Home
                </Link>
              </div>
            </article>
          </div>
        </section>
      </div>
    );
  }

  const isPrintRestoration = [
    "Printed Photo",
    "Digital + Printed",
  ].includes(formData.outputPreference);
  const isPrintSupport = [
    "Document Print",
    "Xerox",
  ].includes(formData.supportServiceType);
  const isLaminationSupport = [
    "Document Lamination",
    "ID Card Lamination",
  ].includes(formData.supportServiceType);
  const travelPreferences =
    selectedServiceConfiguration
      ?.travelPreferences?.[formData.travelType] || [];

  return (
    <div className="booking-builder-page">
      <PageHero
        eyebrow="Book A Service"
        title="Build Your"
        highlight="Service Request"
        description="Choose one Kushi Digitals service, add only the details it needs and review everything before submitting securely."
      />

      <section className="booking-section">
        <div className="container">
          <div
            className="booking-progress"
            aria-label="Booking steps"
          >
            {bookingSteps.map((step, index) => (
              <div
                className={
                  index === 0 || formData.service
                    ? "is-active"
                    : ""
                }
                key={step}
              >
                <span>{index + 1}</span>
                <small>{step}</small>
              </div>
            ))}
          </div>

          <div className="booking-layout">
            <form
              className="booking-form-card"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="booking-form-heading">
                <span>Premium Guided Booking</span>
                <h2>Book the right service</h2>
                <p>
                  The form adapts to your selection, so you
                  only provide information relevant to your
                  order.
                </p>
              </div>

              {formError && (
                <div
                  className="booking-error"
                  role="alert"
                >
                  {formError}
                </div>
              )}

              <div className="booking-form-section">
                <StepHeading
                  number="1"
                  title="Choose Service"
                  description="Select one of the six available Kushi Digitals services"
                />

                <div className="booking-direct-service-grid">
                  {bookingServices.map((service) => (
                    <ServiceCard
                      service={service}
                      key={service.id}
                      selected={
                        formData.service ===
                        service.name
                      }
                      onSelect={handleServiceSelect}
                      actionLabel="Select Service"
                    />
                  ))}
                </div>

                {fieldErrors.service && (
                  <small className="form-field-error">
                    {fieldErrors.service}
                  </small>
                )}
              </div>

              {formData.service && (
                <>
                  <div
                    className="booking-form-section"
                    id="service-requirements"
                  >
                    <StepHeading
                      number="2"
                      title="Service Options"
                      description={`Add the details required for ${formData.service}`}
                    />

                    <div className="booking-form-grid booking-options-grid">
                      {formData.service ===
                        "Passport Size Photos" && (
                        <>
                          <SelectField
                            label="Photo Pack"
                            name="photoType"
                            value={formData.photoType}
                            options={
                              selectedServiceConfiguration.photoTypes
                            }
                            onChange={handleInputChange}
                            error={
                              fieldErrors.photoType
                            }
                          />
                          <SelectField
                            label="Background"
                            name="background"
                            value={formData.background}
                            options={
                              selectedServiceConfiguration.backgrounds
                            }
                            onChange={handleInputChange}
                            error={
                              fieldErrors.background
                            }
                          />
                          {formData.background ===
                            "Custom Background" && (
                            <div className="form-field booking-full-field">
                              <label htmlFor="customBackground">
                                Custom Background
                              </label>
                              <input
                                id="customBackground"
                                name="customBackground"
                                type="text"
                                value={
                                  formData.customBackground
                                }
                                onChange={
                                  handleInputChange
                                }
                                placeholder="Describe the required background"
                                aria-invalid={Boolean(
                                  fieldErrors.customBackground,
                                )}
                              />
                              {fieldErrors.customBackground && (
                                <small className="form-field-error">
                                  {
                                    fieldErrors.customBackground
                                  }
                                </small>
                              )}
                            </div>
                          )}
                          <SelectField
                            label="Dress Requirement"
                            name="dressRequirement"
                            value={
                              formData.dressRequirement
                            }
                            options={
                              selectedServiceConfiguration.dressRequirements
                            }
                            onChange={handleInputChange}
                            error={
                              fieldErrors.dressRequirement
                            }
                          />
                          <QuantityControl
                            label="Number of Sets"
                            value={formData.quantity}
                            onDecrease={() =>
                              updateQuantity(
                                Number(formData.quantity) -
                                  1,
                              )
                            }
                            onIncrease={() =>
                              updateQuantity(
                                Number(formData.quantity) +
                                  1,
                              )
                            }
                            onChange={(event) =>
                              updateQuantity(
                                event.target.value,
                              )
                            }
                            error={fieldErrors.quantity}
                            priceInformation={
                              priceInformation
                            }
                            priceDetail={
                              priceInformation.isComplete &&
                              Number.isFinite(
                                priceInformation.basePrice,
                              )
                                ? `${formatIndianCurrency(
                                    priceInformation.basePrice,
                                  )} per set`
                                : ""
                            }
                          />
                        </>
                      )}

                      {formData.service ===
                        "Photo Frames" && (
                        <>
                          <SelectField
                            label="Frame Size"
                            name="frameSize"
                            value={formData.frameSize}
                            options={
                              selectedServiceConfiguration.frameSizes
                            }
                            onChange={handleInputChange}
                            error={
                              fieldErrors.frameSize
                            }
                          />
                          <SelectField
                            label="Frame Material"
                            name="frameMaterial"
                            value={
                              formData.frameMaterial
                            }
                            options={
                              selectedServiceConfiguration.frameMaterials
                            }
                            onChange={handleInputChange}
                            error={
                              fieldErrors.frameMaterial
                            }
                          />
                          <QuantityControl
                            label="Quantity"
                            value={formData.quantity}
                            onDecrease={() =>
                              updateQuantity(
                                Number(formData.quantity) -
                                  1,
                              )
                            }
                            onIncrease={() =>
                              updateQuantity(
                                Number(formData.quantity) +
                                  1,
                              )
                            }
                            onChange={(event) =>
                              updateQuantity(
                                event.target.value,
                              )
                            }
                            error={fieldErrors.quantity}
                            priceInformation={
                              priceInformation
                            }
                            priceDetail={
                              priceInformation.isComplete &&
                              Number.isFinite(
                                priceInformation.basePrice,
                              )
                                ? `${formatIndianCurrency(
                                    priceInformation.basePrice,
                                  )} each`
                                : ""
                            }
                          />
                        </>
                      )}

                      {formData.service ===
                        "Photo Restoration" && (
                        <>
                          <SelectField
                            label="Restoration Requirement"
                            name="restorationType"
                            value={
                              formData.restorationType
                            }
                            options={
                              selectedServiceConfiguration.restorationTypes
                            }
                            onChange={handleInputChange}
                            error={
                              fieldErrors.restorationType
                            }
                          />
                          <SelectField
                            label="Output Preference"
                            name="outputPreference"
                            value={
                              formData.outputPreference
                            }
                            options={
                              selectedServiceConfiguration.outputPreferences
                            }
                            onChange={handleInputChange}
                            error={
                              fieldErrors.outputPreference
                            }
                          />
                          {isPrintRestoration && (
                            <SelectField
                              label="Print Size"
                              name="printSize"
                              value={formData.printSize}
                              options={
                                selectedServiceConfiguration.printSizes
                              }
                              onChange={
                                handleInputChange
                              }
                              error={
                                fieldErrors.printSize
                              }
                            />
                          )}
                          <QuantityControl
                            label="Quantity"
                            value={formData.quantity}
                            onDecrease={() =>
                              updateQuantity(
                                Number(formData.quantity) -
                                  1,
                              )
                            }
                            onIncrease={() =>
                              updateQuantity(
                                Number(formData.quantity) +
                                  1,
                              )
                            }
                            onChange={(event) =>
                              updateQuantity(
                                event.target.value,
                              )
                            }
                            error={fieldErrors.quantity}
                            priceInformation={
                              priceInformation
                            }
                            priceDetail={
                              priceInformation.isComplete &&
                              Number.isFinite(
                                priceInformation.basePrice,
                              )
                                ? `${formatIndianCurrency(
                                    priceInformation.basePrice,
                                  )} per photo`
                                : ""
                            }
                          />
                        </>
                      )}

                      {formData.service ===
                        "PAN Card Services" && (
                        <>
                          <SelectField
                            label="PAN Service Type"
                            name="panServiceType"
                            value={
                              formData.panServiceType
                            }
                            options={
                              selectedServiceConfiguration.panServiceTypes
                            }
                            onChange={handleInputChange}
                            error={
                              fieldErrors.panServiceType
                            }
                          />
                          <SelectField
                            label="Applicant Type"
                            name="applicantType"
                            value={
                              formData.applicantType
                            }
                            options={
                              selectedServiceConfiguration.applicantTypes
                            }
                            onChange={handleInputChange}
                            error={
                              fieldErrors.applicantType
                            }
                          />
                          <LivePrice
                            className="booking-full-field"
                            priceInformation={
                              priceInformation
                            }
                            detail="Selected PAN service"
                          />
                        </>
                      )}

                      {formData.service ===
                        "Travel Ticket Booking" && (
                        <>
                          <SelectField
                            label="Travel Type"
                            name="travelType"
                            value={formData.travelType}
                            options={
                              selectedServiceConfiguration.travelTypes
                            }
                            onChange={handleInputChange}
                            error={
                              fieldErrors.travelType
                            }
                          />
                          <SelectField
                            label="Return Journey"
                            name="journeyType"
                            value={formData.journeyType}
                            options={
                              selectedServiceConfiguration.journeyTypes
                            }
                            onChange={handleInputChange}
                            error={
                              fieldErrors.journeyType
                            }
                          />
                          <div className="form-field">
                            <label htmlFor="fromLocation">
                              From Location
                            </label>
                            <input
                              id="fromLocation"
                              name="fromLocation"
                              type="text"
                              value={
                                formData.fromLocation
                              }
                              onChange={
                                handleInputChange
                              }
                              placeholder="Starting location"
                              aria-invalid={Boolean(
                                fieldErrors.fromLocation,
                              )}
                            />
                            {fieldErrors.fromLocation && (
                              <small className="form-field-error">
                                {
                                  fieldErrors.fromLocation
                                }
                              </small>
                            )}
                          </div>
                          <div className="form-field">
                            <label htmlFor="toLocation">
                              To Location
                            </label>
                            <input
                              id="toLocation"
                              name="toLocation"
                              type="text"
                              value={formData.toLocation}
                              onChange={
                                handleInputChange
                              }
                              placeholder="Destination"
                              aria-invalid={Boolean(
                                fieldErrors.toLocation,
                              )}
                            />
                            {fieldErrors.toLocation && (
                              <small className="form-field-error">
                                {fieldErrors.toLocation}
                              </small>
                            )}
                          </div>
                          <div className="form-field">
                            <label htmlFor="journeyDate">
                              Journey Date
                            </label>
                            <input
                              id="journeyDate"
                              name="journeyDate"
                              type="date"
                              value={
                                formData.journeyDate
                              }
                              onChange={
                                handleInputChange
                              }
                              aria-invalid={Boolean(
                                fieldErrors.journeyDate,
                              )}
                            />
                            {fieldErrors.journeyDate && (
                              <small className="form-field-error">
                                {fieldErrors.journeyDate}
                              </small>
                            )}
                          </div>
                          {formData.journeyType ===
                            "Round Trip" && (
                            <div className="form-field">
                              <label htmlFor="returnDate">
                                Return Date
                              </label>
                              <input
                                id="returnDate"
                                name="returnDate"
                                type="date"
                                value={
                                  formData.returnDate
                                }
                                onChange={
                                  handleInputChange
                                }
                                aria-invalid={Boolean(
                                  fieldErrors.returnDate,
                                )}
                              />
                              {fieldErrors.returnDate && (
                                <small className="form-field-error">
                                  {fieldErrors.returnDate}
                                </small>
                              )}
                            </div>
                          )}
                          <SelectField
                            label="Travel Class / Preference"
                            name="travelPreference"
                            value={
                              formData.travelPreference
                            }
                            options={travelPreferences}
                            onChange={handleInputChange}
                            error={
                              fieldErrors.travelPreference
                            }
                            className="booking-full-field"
                          />
                          <QuantityControl
                            label="Number of Passengers"
                            value={formData.quantity}
                            onDecrease={() =>
                              updatePassengerCount(
                                formData.passengers
                                  .length - 1,
                              )
                            }
                            onIncrease={() =>
                              updatePassengerCount(
                                formData.passengers
                                  .length + 1,
                              )
                            }
                            onChange={(event) =>
                              updatePassengerCount(
                                event.target.value,
                              )
                            }
                            error={fieldErrors.quantity}
                            priceInformation={
                              priceInformation
                            }
                            priceDetail="Booking assistance fee"
                          />
                        </>
                      )}

                      {formData.service ===
                        "Laminations & Print Support" && (
                        <>
                          <SelectField
                            label="Service Type"
                            name="supportServiceType"
                            value={
                              formData.supportServiceType
                            }
                            options={
                              selectedServiceConfiguration.serviceTypes
                            }
                            onChange={handleInputChange}
                            error={
                              fieldErrors.supportServiceType
                            }
                          />
                          <SelectField
                            label="Size"
                            name="supportSize"
                            value={
                              formData.supportSize
                            }
                            options={
                              selectedServiceConfiguration.sizes
                            }
                            onChange={handleInputChange}
                            error={
                              fieldErrors.supportSize
                            }
                          />
                          {isPrintSupport && (
                            <SelectField
                              label="Print Type"
                              name="printType"
                              value={
                                formData.printType
                              }
                              options={
                                selectedServiceConfiguration.printTypes
                              }
                              onChange={
                                handleInputChange
                              }
                              error={
                                fieldErrors.printType
                              }
                            />
                          )}
                          {isLaminationSupport && (
                            <SelectField
                              label="Lamination Type"
                              name="laminationType"
                              value={
                                formData.laminationType
                              }
                              options={
                                selectedServiceConfiguration.laminationTypes
                              }
                              onChange={
                                handleInputChange
                              }
                              error={
                                fieldErrors.laminationType
                              }
                            />
                          )}
                          <QuantityControl
                            label="Quantity"
                            value={formData.quantity}
                            onDecrease={() =>
                              updateQuantity(
                                Number(formData.quantity) -
                                  1,
                              )
                            }
                            onIncrease={() =>
                              updateQuantity(
                                Number(formData.quantity) +
                                  1,
                              )
                            }
                            onChange={(event) =>
                              updateQuantity(
                                event.target.value,
                              )
                            }
                            error={fieldErrors.quantity}
                            priceInformation={
                              priceInformation
                            }
                            priceDetail={
                              priceInformation.isComplete &&
                              Number.isFinite(
                                priceInformation.basePrice,
                              )
                                ? `${formatIndianCurrency(
                                    priceInformation.basePrice,
                                  )} each`
                                : ""
                            }
                          />
                        </>
                      )}
                    </div>

                    {formData.service ===
                      "Travel Ticket Booking" && (
                      <div className="booking-passenger-section">
                        <div className="booking-subsection-heading">
                          <div>
                            <strong>Passenger Details</strong>
                            <span>
                              Add the required information
                              for each passenger
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              updatePassengerCount(
                                formData.passengers
                                  .length + 1,
                              )
                            }
                          >
                            <Plus size={16} />
                            Add Passenger
                          </button>
                        </div>

                        <div className="booking-passenger-list">
                          {formData.passengers.map(
                            (passenger, index) => (
                              <article
                                className="booking-passenger-card"
                                key={passenger.id}
                              >
                                <div className="booking-passenger-card-heading">
                                  <strong>
                                    Passenger {index + 1}
                                  </strong>
                                  {formData.passengers
                                    .length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        removePassenger(
                                          passenger.id,
                                        )
                                      }
                                      aria-label={`Remove passenger ${index + 1}`}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  )}
                                </div>

                                <div className="booking-form-grid">
                                  <div className="form-field booking-full-field">
                                    <label
                                      htmlFor={`${passenger.id}-fullName`}
                                    >
                                      Full Name
                                    </label>
                                    <input
                                      id={`${passenger.id}-fullName`}
                                      type="text"
                                      value={
                                        passenger.fullName
                                      }
                                      onChange={(event) =>
                                        handlePassengerChange(
                                          passenger.id,
                                          "fullName",
                                          event.target
                                            .value,
                                        )
                                      }
                                      aria-invalid={Boolean(
                                        fieldErrors[
                                          `${passenger.id}-fullName`
                                        ],
                                      )}
                                    />
                                    {fieldErrors[
                                      `${passenger.id}-fullName`
                                    ] && (
                                      <small className="form-field-error">
                                        {
                                          fieldErrors[
                                            `${passenger.id}-fullName`
                                          ]
                                        }
                                      </small>
                                    )}
                                  </div>
                                  <div className="form-field">
                                    <label
                                      htmlFor={`${passenger.id}-age`}
                                    >
                                      Age
                                    </label>
                                    <input
                                      id={`${passenger.id}-age`}
                                      type="number"
                                      min="1"
                                      max="120"
                                      value={
                                        passenger.age
                                      }
                                      onChange={(event) =>
                                        handlePassengerChange(
                                          passenger.id,
                                          "age",
                                          event.target
                                            .value,
                                        )
                                      }
                                      aria-invalid={Boolean(
                                        fieldErrors[
                                          `${passenger.id}-age`
                                        ],
                                      )}
                                    />
                                    {fieldErrors[
                                      `${passenger.id}-age`
                                    ] && (
                                      <small className="form-field-error">
                                        {
                                          fieldErrors[
                                            `${passenger.id}-age`
                                          ]
                                        }
                                      </small>
                                    )}
                                  </div>
                                  <div className="form-field">
                                    <label
                                      htmlFor={`${passenger.id}-gender`}
                                    >
                                      Gender
                                    </label>
                                    <select
                                      id={`${passenger.id}-gender`}
                                      value={
                                        passenger.gender
                                      }
                                      onChange={(event) =>
                                        handlePassengerChange(
                                          passenger.id,
                                          "gender",
                                          event.target
                                            .value,
                                        )
                                      }
                                      aria-invalid={Boolean(
                                        fieldErrors[
                                          `${passenger.id}-gender`
                                        ],
                                      )}
                                    >
                                      <option value="">
                                        Choose gender
                                      </option>
                                      {selectedServiceConfiguration.genderOptions.map(
                                        (option) => (
                                          <option
                                            value={option}
                                            key={option}
                                          >
                                            {option}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                    {fieldErrors[
                                      `${passenger.id}-gender`
                                    ] && (
                                      <small className="form-field-error">
                                        {
                                          fieldErrors[
                                            `${passenger.id}-gender`
                                          ]
                                        }
                                      </small>
                                    )}
                                  </div>
                                  <div className="form-field booking-full-field">
                                    <label
                                      htmlFor={`${passenger.id}-seatPreference`}
                                    >
                                      Berth / Seat Preference
                                      <span className="optional-label">
                                        Optional
                                      </span>
                                    </label>
                                    <input
                                      id={`${passenger.id}-seatPreference`}
                                      type="text"
                                      value={
                                        passenger.seatPreference
                                      }
                                      onChange={(event) =>
                                        handlePassengerChange(
                                          passenger.id,
                                          "seatPreference",
                                          event.target
                                            .value,
                                        )
                                      }
                                      placeholder="Example: Lower berth or window seat"
                                    />
                                  </div>
                                </div>
                              </article>
                            ),
                          )}
                        </div>

                        <div className="booking-context-note">
                          <Info size={18} />
                          <span>
                            {
                              selectedServiceConfiguration.note
                            }
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="booking-form-section">
                    <StepHeading
                      number="3"
                      title="Upload Files"
                      description="Add the photos or documents needed for this request"
                    />

                    <div className="booking-upload-block">
                      <label
                        className="photo-upload-area multiple-photo-upload-area"
                        htmlFor="bookingFiles"
                      >
                        <input
                          id="bookingFiles"
                          type="file"
                          multiple
                          accept={acceptedFileTypes}
                          onChange={handleFileChange}
                        />
                        <span className="upload-icon">
                          <UploadCloud size={31} />
                        </span>
                        <strong>
                          {selectedServiceConfiguration.uploadLabel}
                          {requiresUpload ? " *" : ""}
                        </strong>
                        <small>
                          JPG, JPEG, PNG or WEBP
                          {acceptsPdf ? " • PDF accepted" : ""}
                          {" • "}up to 10 MB each • maximum
                          10 files
                        </small>
                      </label>

                      {fieldErrors.files && (
                        <small className="form-field-error">
                          {fieldErrors.files}
                        </small>
                      )}

                      {selectedServiceConfiguration.privacyNote && (
                        <div className="booking-privacy-note">
                          <ShieldCheck size={18} />
                          <span>
                            {
                              selectedServiceConfiguration.privacyNote
                            }
                          </span>
                        </div>
                      )}

                      {selectedFiles.length > 0 && (
                        <>
                          <div className="multiple-photo-selection-summary">
                            <div>
                              <strong>
                                {selectedFiles.length} file(s)
                                ready
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
                              onClick={clearSelectedFiles}
                            >
                              <Trash2 size={16} />
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
                                  {previewUrls[index] ? (
                                    <div className="selected-multiple-photo-preview">
                                      <img
                                        src={
                                          previewUrls[
                                            index
                                          ]
                                        }
                                        alt={`Selected upload ${index + 1}`}
                                      />
                                      <span>
                                        {index + 1}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="selected-multiple-photo-preview booking-document-preview">
                                      <FileText size={34} />
                                      <span>PDF</span>
                                    </div>
                                  )}
                                  <div className="selected-multiple-photo-info">
                                    {file.type ===
                                    allowedPdfType ? (
                                      <FileText size={18} />
                                    ) : (
                                      <FileImage size={18} />
                                    )}
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
                                    <Trash2 size={16} />
                                  </button>
                                </article>
                              ),
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="booking-form-section">
                    <StepHeading
                      number="4"
                      title="Customer & Delivery Details"
                      description="Confirm your contact information and supported delivery method"
                    />

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
                          onChange={handleInputChange}
                          autoComplete="name"
                          placeholder="Enter your full name"
                          aria-invalid={Boolean(
                            fieldErrors.customerName,
                          )}
                        />
                        {fieldErrors.customerName && (
                          <small className="form-field-error">
                            {fieldErrors.customerName}
                          </small>
                        )}
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
                          onChange={handleInputChange}
                          autoComplete="tel"
                          inputMode="tel"
                          placeholder="+91 98765 43210"
                          aria-invalid={Boolean(
                            fieldErrors.phone,
                          )}
                        />
                        {fieldErrors.phone && (
                          <small className="form-field-error">
                            {fieldErrors.phone}
                          </small>
                        )}
                      </div>

                      <div className="form-field booking-full-field">
                        <label htmlFor="email">
                          Email Address (Optional)
                        </label>
                        <div className="booking-email-input">
                          <Mail size={17} />
                          <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            autoComplete="email"
                            placeholder="name@example.com"
                            aria-invalid={Boolean(
                              fieldErrors.email,
                            )}
                            aria-describedby={
                              fieldErrors.email
                                ? "email-help email-error"
                                : "email-help"
                            }
                          />
                        </div>
                        <small
                          className="form-field-helper"
                          id="email-help"
                        >
                          Optional — used for order updates and
                          online delivery.
                        </small>
                        {fieldErrors.email && (
                          <small
                            className="form-field-error"
                            id="email-error"
                          >
                            {fieldErrors.email}
                          </small>
                        )}
                      </div>
                    </div>

                    <div className="booking-delivery-block">
                      <label>Delivery Type</label>
                      <div className="delivery-options">
                        {availableDeliveryTypes.map(
                          (deliveryType) => (
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
                              <CheckCircle2 size={18} />
                              <span>{deliveryType}</span>
                            </label>
                          ),
                        )}
                      </div>
                      {fieldErrors.deliveryType && (
                        <small className="form-field-error">
                          {fieldErrors.deliveryType}
                        </small>
                      )}
                    </div>

                    {formData.deliveryType ===
                      "Home Delivery" && (
                      <div className="booking-home-delivery-panel">
                        <div className="booking-subsection-heading">
                          <div>
                            <strong>
                              Home Delivery Address
                            </strong>
                            <span>
                              All fields are required for
                              delivery
                            </span>
                          </div>
                        </div>

                        <div className="booking-form-grid booking-address-grid">
                          {[
                            [
                              "houseNumber",
                              "House / Door Number",
                              "House or door number",
                            ],
                            [
                              "streetVillage",
                              "Street / Village",
                              "Street or village",
                            ],
                            [
                              "areaMandal",
                              "Area / Mandal",
                              "Area or mandal",
                            ],
                            [
                              "district",
                              "District",
                              "District",
                            ],
                            [
                              "state",
                              "State",
                              "State",
                            ],
                            [
                              "pincode",
                              "Pincode",
                              "6-digit pincode",
                            ],
                            [
                              "landmark",
                              "Landmark",
                              "Nearby landmark",
                            ],
                          ].map(
                            ([
                              name,
                              label,
                              placeholder,
                            ]) => (
                              <div
                                className={`form-field ${
                                  name === "landmark"
                                    ? "booking-full-field"
                                    : ""
                                }`}
                                key={name}
                              >
                                <label htmlFor={name}>
                                  {label}
                                </label>
                                <input
                                  id={name}
                                  name={name}
                                  type="text"
                                  inputMode={
                                    name === "pincode"
                                      ? "numeric"
                                      : undefined
                                  }
                                  value={
                                    formData[name]
                                  }
                                  onChange={
                                    handleInputChange
                                  }
                                  placeholder={
                                    placeholder
                                  }
                                  aria-invalid={Boolean(
                                    fieldErrors[name],
                                  )}
                                />
                                {fieldErrors[name] && (
                                  <small className="form-field-error">
                                    {
                                      fieldErrors[
                                        name
                                      ]
                                    }
                                  </small>
                                )}
                              </div>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    <div className="form-field booking-notes-field">
                      <label htmlFor="instructions">
                        Special Instructions
                        <span className="optional-label">
                          Optional
                        </span>
                      </label>
                      <textarea
                        id="instructions"
                        name="instructions"
                        rows="5"
                        value={formData.instructions}
                        onChange={handleInputChange}
                        placeholder={
                          selectedServiceConfiguration.instructionsPlaceholder ||
                          "Add any other useful details..."
                        }
                      />
                    </div>
                  </div>

                  <div className="booking-form-section">
                    <StepHeading
                      number="5"
                      title="Payment Method"
                      description="Choose from the payment options available for this order"
                    />

                    {availablePaymentMethods.length > 0 ? (
                      <div className="booking-payment-options">
                        {availablePaymentMethods.map(
                          (method) => (
                            <label
                              className={`booking-payment-option ${
                                formData.paymentMethod ===
                                method.value
                                  ? "selected"
                                  : ""
                              }`}
                              key={method.value}
                            >
                              <input
                                type="radio"
                                name="paymentMethod"
                                value={method.value}
                                checked={
                                  formData.paymentMethod ===
                                  method.value
                                }
                                onChange={
                                  handleInputChange
                                }
                              />
                              <CheckCircle2 size={19} />
                              <span>
                                <strong>
                                  {method.label}
                                </strong>
                                <small>
                                  {method.description}
                                </small>
                              </span>
                            </label>
                          ),
                        )}
                      </div>
                    ) : (
                      <div className="booking-context-note">
                        <Info size={18} />
                        <span>
                          Complete the required service options
                          to see available payment methods.
                        </span>
                      </div>
                    )}

                    {fieldErrors.paymentMethod && (
                      <small className="form-field-error">
                        {fieldErrors.paymentMethod}
                      </small>
                    )}
                  </div>

                  <div className="booking-form-section">
                    <StepHeading
                      number="6"
                      title="Review & Submit"
                      description="Confirm the service-specific details before placing your order"
                    />

                    <div className="booking-mobile-review">
                      {orderSummary.map((item) => (
                        <div key={item.label}>
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>

                    <button
                      type="submit"
                      className="primary-button booking-submit-button"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <LoaderCircle
                            size={19}
                            className="spin-icon"
                          />
                          {submissionStage ||
                            "Processing Order..."}
                        </>
                      ) : (
                        <>
                          {formData.paymentMethod ===
                          "razorpay"
                            ? "Place Order & Pay Securely"
                            : "Place Service Order"}
                          <ArrowRight size={19} />
                        </>
                      )}
                    </button>

                    <div className="booking-security-note">
                      <ShieldCheck size={18} />
                      <span>
                        Protected by your Kushi Digitals
                        account and existing Supabase
                        security policies.
                      </span>
                    </div>
                  </div>
                </>
              )}
            </form>

            <aside className="booking-summary-column">
              <div className="booking-summary-card">
                <span className="booking-summary-label">
                  Live Order Review
                </span>
                <h2>Your Requirement</h2>

                <div className="booking-summary-list">
                  {orderSummary
                    .filter(
                      (item) =>
                        item.label !== "Price Status",
                    )
                    .map((item) => (
                      <div key={item.label}>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                </div>

                <div className="booking-price-panel">
                  <span className="booking-summary-label">
                    Live Price
                  </span>

                  {!priceInformation.isComplete && (
                    <p>{priceInformation.status}</p>
                  )}

                  {priceInformation.isComplete &&
                    priceInformation
                      .requiresManualConfirmation && (
                      <p>{priceInformation.status}</p>
                    )}

                  {priceInformation.isComplete &&
                    !priceInformation
                      .requiresManualConfirmation && (
                      <div className="booking-price-rows">
                        <div>
                          <span>
                            {priceInformation.baseLabel}
                          </span>
                          <strong>
                            {formatIndianCurrency(
                              priceInformation.basePrice,
                            )}
                          </strong>
                        </div>

                        {priceInformation.additionalCharges
                          .length > 0 && (
                          <div>
                            <span>
                              {
                                priceInformation.additionalChargesLabel
                              }
                            </span>
                            <strong>
                              {formatIndianCurrency(
                                priceInformation.additionalCharges.reduce(
                                  (total, charge) =>
                                    total +
                                    charge.amount,
                                  0,
                                ),
                              )}
                            </strong>
                          </div>
                        )}

                        {priceInformation.quantity !==
                          null && (
                          <div>
                            <span>
                              {
                                priceInformation.quantityLabel
                              }
                            </span>
                            <strong>
                              {
                                priceInformation.quantity
                              }
                            </strong>
                          </div>
                        )}

                        {priceInformation.ticketFarePending ? (
                          <div>
                            <span>Ticket Fare</span>
                            <strong>
                              To be confirmed
                            </strong>
                          </div>
                        ) : (
                          <div>
                            <span>
                              {
                                priceInformation.subtotalLabel
                              }
                            </span>
                            <strong>
                              {formatIndianCurrency(
                                priceInformation.subtotal,
                              )}
                            </strong>
                          </div>
                        )}

                        {!priceInformation.ticketFarePending && (
                          <div>
                            <span>
                              Delivery Charge
                            </span>
                            <strong>
                              {formatIndianCurrency(
                                priceInformation.deliveryCharge,
                              )}
                            </strong>
                          </div>
                        )}

                        <div className="booking-price-total">
                          <span>
                            {priceInformation.ticketFarePending
                              ? "Payable Now"
                              : "Total Payable"}
                          </span>
                          <strong>
                            {formatIndianCurrency(
                              priceInformation.total,
                            )}
                          </strong>
                        </div>
                      </div>
                    )}
                </div>
              </div>

              <div className="booking-help-card">
                <MapPin size={24} />
                <div>
                  <strong>
                    Delivery matched to the service
                  </strong>
                  <p>
                    Only suitable delivery choices appear.
                    Home delivery details remain hidden
                    unless you select that option.
                  </p>
                </div>
                <Link to="/contact">
                  Need help?
                  <ArrowRight size={17} />
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

export default BookService;
