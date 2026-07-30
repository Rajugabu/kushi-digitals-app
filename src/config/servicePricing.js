// TEMPORARY DEMO PRICES
// All prices can be changed later from this file.
// Do not hardcode prices inside BookService.jsx.

export const servicePricing = {
  "Passport Size Photos": {
    packs: {
      "Passport Size Photos — 8 Photos": 80,
      "Stamp Size Photos — 12 Photos": 100,
      "Passport + Stamp Combo — 4 + 4 Photos": 100,
    },
    dressCharges: {
      "Keep Original Dress": 0,
      "White Shirt": 50,
      "Formal Coat": 80,
      "Coat and Tie": 100,
    },
    backgroundCharges: {
      White: 0,
      "Light Blue": 0,
      Red: 0,
      "Custom Background": 30,
    },
  },
  "Photo Frames": {
    "8 × 12 Inches": {
      PVC: 400,
      MDF: 500,
    },
    "10 × 15 Inches": {
      PVC: 550,
      MDF: 650,
    },
    "12 × 15 Inches": {
      PVC: 700,
      MDF: 800,
    },
    "12 × 18 Inches": {
      PVC: 900,
      MDF: 1000,
    },
  },
  "Photo Restoration": {
    restoration: {
      "Required Photo Enhancement": 299,
      "Photo Enhancement + Colorization": 499,
    },
    print: {
      "4 × 6 Inches": 30,
      "5 × 7 Inches": 50,
      "8 × 12 Inches": 100,
      "10 × 15 Inches": 180,
      "12 × 18 Inches": 300,
    },
  },
  "PAN Card Services": {
    "New PAN Card Application": 250,
    "PAN Card Correction": 300,
    "PAN Card Reprint": 200,
    "e-PAN Download": 100,
    "PAN Application Status Check": 50,
  },
  "Travel Ticket Booking": {
    Train: 50,
    Bus: 50,
    Flight: 150,
  },
  "Laminations & Print Support": {
    "Document Lamination": {
      A4: {
        Standard: 30,
        Thick: 50,
      },
      A3: {
        Standard: 60,
        Thick: 90,
      },
    },
    "ID Card Lamination": {
      "ID Card": {
        Standard: 20,
        Thick: 30,
      },
    },
    "Photo Print": {
      "4 × 6 Inches": 20,
      "5 × 7 Inches": 35,
      "8 × 12 Inches": 80,
    },
    "Document Print": {
      A4: {
        "Black & White": 5,
        Color: 15,
      },
      A3: {
        "Black & White": 10,
        Color: 30,
      },
    },
    Xerox: {
      A4: {
        "Black & White": 3,
        Color: 12,
      },
      A3: {
        "Black & White": 8,
        Color: 25,
      },
    },
  },
};

// Temporary flat home-delivery charge. Update later if needed.
export const deliveryCharges = {
  "Online Delivery": 0,
  "Studio Pickup": 0,
  "Home Delivery": 60,
};

export const incompletePriceMessage =
  "Select the required options to view the price.";

export function formatIndianCurrency(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getQuantity(value) {
  const quantity = Number.parseInt(value, 10);
  return Number.isInteger(quantity) && quantity > 0
    ? quantity
    : null;
}

function createIncompleteResult() {
  return {
    isComplete: false,
    requiresManualConfirmation: false,
    baseLabel: "Base Price",
    basePrice: null,
    additionalCharges: [],
    quantity: null,
    subtotal: null,
    deliveryCharge: null,
    total: null,
    estimatedPrice: null,
    finalPrice: null,
    ticketFarePending: false,
    status: incompletePriceMessage,
  };
}

function createManualResult(deliveryType) {
  return {
    ...createIncompleteResult(),
    isComplete: true,
    requiresManualConfirmation: true,
    deliveryCharge:
      deliveryCharges[deliveryType] ?? null,
    status: "Price confirmation required.",
  };
}

function createKnownPriceResult({
  service,
  baseLabel = "Base Price",
  basePrice,
  additionalCharges = [],
  additionalChargesLabel = "Additional Charges",
  quantity = null,
  quantityLabel = "Quantity",
  subtotal,
  subtotalLabel = "Subtotal",
  deliveryType,
  ticketFarePending = false,
}) {
  const deliveryCharge = deliveryCharges[deliveryType];

  if (deliveryCharge === undefined) {
    return createIncompleteResult();
  }

  const total = subtotal + deliveryCharge;

  return {
    isComplete: true,
    requiresManualConfirmation: false,
    baseLabel,
    basePrice,
    additionalCharges,
    additionalChargesLabel,
    quantity,
    quantityLabel,
    subtotal,
    subtotalLabel,
    deliveryCharge,
    total,
    estimatedPrice: total,
    finalPrice:
      service === "Travel Ticket Booking"
        ? null
        : total,
    ticketFarePending,
    status: `Total payable: ${formatIndianCurrency(total)}`,
  };
}

function calculatePassportPrice(formData) {
  const quantity = getQuantity(formData.quantity);
  const prices =
    servicePricing["Passport Size Photos"];
  const packPrice =
    prices.packs[formData.photoType];
  const dressCharge =
    prices.dressCharges[formData.dressRequirement];
  const backgroundCharge =
    prices.backgroundCharges[formData.background];

  if (
    quantity === null ||
    packPrice === undefined ||
    dressCharge === undefined ||
    backgroundCharge === undefined
  ) {
    return createIncompleteResult();
  }

  return createKnownPriceResult({
    service: formData.service,
    baseLabel: "Photo Pack Price (per set)",
    basePrice: packPrice,
    additionalCharges: [
      {
        label: "Dress Charge",
        amount: dressCharge,
      },
      {
        label: "Background Charge",
        amount: backgroundCharge,
      },
    ].filter((charge) => charge.amount > 0),
    quantity,
    quantityLabel: "Sets",
    subtotal:
      (packPrice + dressCharge + backgroundCharge) *
      quantity,
    deliveryType: formData.deliveryType,
  });
}

function calculateFramePrice(formData) {
  const quantity = getQuantity(formData.quantity);
  const unitPrice =
    servicePricing["Photo Frames"][
      formData.frameSize
    ]?.[formData.frameMaterial];

  if (
    quantity === null ||
    !formData.frameSize ||
    !formData.frameMaterial
  ) {
    return createIncompleteResult();
  }

  if (unitPrice === undefined) {
    return createManualResult(formData.deliveryType);
  }

  return createKnownPriceResult({
    service: formData.service,
    basePrice: unitPrice,
    quantity,
    subtotal: unitPrice * quantity,
    deliveryType: formData.deliveryType,
  });
}

function calculateRestorationPrice(
  formData,
  uploadedFileCount,
) {
  const quantity = getQuantity(formData.quantity);
  const prices =
    servicePricing["Photo Restoration"];
  const restorationUnitPrice =
    prices.restoration[formData.restorationType];
  const isPrinted = [
    "Printed Photo",
    "Digital + Printed",
  ].includes(formData.outputPreference);
  const printUnitPrice = isPrinted
    ? prices.print[formData.printSize]
    : 0;

  if (uploadedFileCount < 1) {
    return {
      ...createIncompleteResult(),
      status:
        "Upload photos to calculate the restoration total.",
    };
  }

  if (
    quantity === null ||
    restorationUnitPrice === undefined ||
    !formData.outputPreference ||
    (isPrinted && !formData.printSize)
  ) {
    return createIncompleteResult();
  }

  if (isPrinted && printUnitPrice === undefined) {
    return createManualResult(formData.deliveryType);
  }

  const restorationPrice =
    restorationUnitPrice * uploadedFileCount;
  const printCharge = printUnitPrice * quantity;

  return createKnownPriceResult({
    service: formData.service,
    baseLabel: "Restoration Price (per photo)",
    basePrice: restorationUnitPrice,
    additionalCharges: isPrinted
      ? [
          {
            label: "Print Charge",
            amount: printCharge,
          },
        ]
      : [],
    additionalChargesLabel: "Print Charges",
    quantity: uploadedFileCount,
    quantityLabel: "Uploaded Photos",
    subtotal: restorationPrice + printCharge,
    subtotalLabel: "Restoration Subtotal",
    deliveryType: formData.deliveryType,
  });
}

function calculatePanPrice(formData) {
  const price =
    servicePricing["PAN Card Services"][
      formData.panServiceType
    ];

  if (price === undefined) {
    return createIncompleteResult();
  }

  return createKnownPriceResult({
    service: formData.service,
    basePrice: price,
    subtotal: price,
    deliveryType: formData.deliveryType,
  });
}

function calculateTravelPrice(formData) {
  const price =
    servicePricing["Travel Ticket Booking"][
      formData.travelType
    ];

  if (price === undefined) {
    return createIncompleteResult();
  }

  return createKnownPriceResult({
    service: formData.service,
    baseLabel: "Booking Assistance Fee",
    basePrice: price,
    subtotal: price,
    deliveryType: formData.deliveryType,
    ticketFarePending: true,
  });
}

function getSupportUnitPrice(formData) {
  const prices =
    servicePricing["Laminations & Print Support"];
  const servicePrices =
    prices[formData.supportServiceType];

  if (
    formData.supportServiceType ===
      "Document Lamination" ||
    formData.supportServiceType ===
      "ID Card Lamination"
  ) {
    return servicePrices?.[formData.supportSize]?.[
      formData.laminationType
    ];
  }

  if (formData.supportServiceType === "Photo Print") {
    return servicePrices?.[formData.supportSize];
  }

  return servicePrices?.[formData.supportSize]?.[
    formData.printType
  ];
}

function calculateSupportPrice(formData) {
  const quantity = getQuantity(formData.quantity);
  const unitPrice = getSupportUnitPrice(formData);
  const needsPrintType = [
    "Document Print",
    "Xerox",
  ].includes(formData.supportServiceType);
  const needsLaminationType = [
    "Document Lamination",
    "ID Card Lamination",
  ].includes(formData.supportServiceType);

  if (
    quantity === null ||
    !formData.supportServiceType ||
    !formData.supportSize ||
    (needsPrintType && !formData.printType) ||
    (needsLaminationType &&
      !formData.laminationType)
  ) {
    return createIncompleteResult();
  }

  if (unitPrice === undefined) {
    return createManualResult(formData.deliveryType);
  }

  return createKnownPriceResult({
    service: formData.service,
    basePrice: unitPrice,
    quantity,
    subtotal: unitPrice * quantity,
    deliveryType: formData.deliveryType,
  });
}

export function calculateServicePrice(
  formData,
  uploadedFileCount = 0,
) {
  switch (formData.service) {
    case "Passport Size Photos":
      return calculatePassportPrice(formData);
    case "Photo Frames":
      return calculateFramePrice(formData);
    case "Photo Restoration":
      return calculateRestorationPrice(
        formData,
        uploadedFileCount,
      );
    case "PAN Card Services":
      return calculatePanPrice(formData);
    case "Travel Ticket Booking":
      return calculateTravelPrice(formData);
    case "Laminations & Print Support":
      return calculateSupportPrice(formData);
    default:
      return createIncompleteResult();
  }
}
