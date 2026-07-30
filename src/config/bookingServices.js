export const approvedBookingServiceNames = [
  "Passport Size Photos",
  "Photo Frames",
  "Photo Restoration",
  "PAN Card Services",
  "Travel Ticket Booking",
  "Laminations & Print Support",
];

export const bookingServiceConfiguration = {
  "Passport Size Photos": {
    category: "Studio Services",
    supportsUpload: true,
    requiresPhotoForOnline: true,
    acceptsPdf: false,
    uploadLabel: "Upload photos for passport-size preparation",
    quantityLabel: "Number of Sets",
    deliveryOptions: [
      "Online Delivery",
      "Studio Pickup",
      "Home Delivery",
    ],
    photoTypes: [
      "Passport Size Photos — 8 Photos",
      "Stamp Size Photos — 12 Photos",
      "Passport + Stamp Combo — 4 + 4 Photos",
    ],
    backgrounds: [
      "White",
      "Light Blue",
      "Red",
      "Custom Background",
    ],
    dressRequirements: [
      "Keep Original Dress",
      "White Shirt",
      "Formal Coat",
      "Coat and Tie",
    ],
    instructionsPlaceholder:
      "Add hair correction, beard removal, background preference or other editing notes...",
  },
  "Photo Frames": {
    category: "Studio Services",
    supportsUpload: true,
    requiresPhoto: true,
    acceptsPdf: false,
    uploadLabel: "Upload the photos to be framed",
    quantityLabel: "Quantity",
    deliveryOptions: [
      "Studio Pickup",
      "Home Delivery",
    ],
    frameSizes: [
      "8 × 12 Inches",
      "10 × 15 Inches",
      "12 × 15 Inches",
      "12 × 18 Inches",
    ],
    frameMaterials: [
      "MDF",
      "PVC",
    ],
    instructionsPlaceholder:
      "Add the occasion, preferred finish or any layout instructions...",
  },
  "Photo Restoration": {
    category: "Studio Services",
    supportsUpload: true,
    requiresPhoto: true,
    acceptsPdf: false,
    uploadLabel: "Upload the photos to be restored",
    quantityLabel: "Quantity",
    deliveryOptions: [
      "Online Delivery",
      "Studio Pickup",
      "Home Delivery",
    ],
    restorationTypes: [
      "Required Photo Enhancement",
      "Photo Enhancement + Colorization",
    ],
    outputPreferences: [
      "Digital File",
      "Printed Photo",
      "Digital + Printed",
    ],
    printSizes: [
      "4 × 6 Inches",
      "5 × 7 Inches",
      "8 × 12 Inches",
      "10 × 15 Inches",
      "12 × 18 Inches",
    ],
    instructionsPlaceholder:
      "Describe damaged areas, color preference, face clarity or background repair requirements...",
  },
  "PAN Card Services": {
    category: "Online & Application Services",
    supportsUpload: true,
    requiresPhoto: false,
    acceptsPdf: true,
    uploadLabel: "Upload optional supporting documents",
    deliveryOptions: [
      "Online Delivery",
      "Studio Pickup",
    ],
    panServiceTypes: [
      "New PAN Card Application",
      "PAN Card Correction",
      "PAN Card Reprint",
      "e-PAN Download",
      "PAN Application Status Check",
    ],
    applicantTypes: [
      "Individual",
      "Minor",
      "Business / Firm",
    ],
    instructionsPlaceholder:
      "Add applicant name, date of birth, correction details or another PAN-related requirement...",
    privacyNote:
      "Please upload only the documents required for the selected service. Your files are used only to process your request.",
  },
  "Travel Ticket Booking": {
    category: "Online & Application Services",
    supportsUpload: true,
    requiresPhoto: false,
    acceptsPdf: true,
    uploadLabel: "Upload optional ID proof documents",
    quantityLabel: "Number of Passengers",
    deliveryOptions: [
      "Online Delivery",
    ],
    travelTypes: [
      "Train",
      "Bus",
      "Flight",
    ],
    journeyTypes: [
      "One Way",
      "Round Trip",
    ],
    genderOptions: [
      "Female",
      "Male",
      "Other",
    ],
    travelPreferences: {
      Train: [
        "General",
        "Sleeper",
        "3A",
        "2A",
        "1A",
        "Chair Car",
      ],
      Bus: [
        "Non-AC",
        "AC",
        "Sleeper",
        "Semi Sleeper",
      ],
      Flight: [
        "Economy",
        "Premium Economy",
        "Business",
      ],
    },
    note:
      "Final fare and seat availability will be confirmed after reviewing the travel details.",
  },
  "Laminations & Print Support": {
    category: "Studio Services",
    supportsUpload: true,
    requiresPhoto: false,
    acceptsPdf: false,
    uploadLabel: "Upload optional document or photo files",
    quantityLabel: "Quantity",
    deliveryOptions: [
      "Studio Pickup",
      "Home Delivery",
    ],
    serviceTypes: [
      "Document Lamination",
      "ID Card Lamination",
      "Photo Print",
      "Document Print",
      "Xerox",
    ],
    sizes: [
      "ID Card",
      "A4",
      "A3",
      "4 × 6 Inches",
      "5 × 7 Inches",
      "8 × 12 Inches",
      "Custom Size",
    ],
    printTypes: [
      "Black & White",
      "Color",
    ],
    laminationTypes: [
      "Standard",
      "Thick",
    ],
    instructionsPlaceholder:
      "Add paper type, print side, copy details or finishing notes...",
  },
};

const legacyServiceAliases = {
  "passport photos": "Passport Size Photos",
  "premium frames": "Photo Frames",
};

export function getBookingServiceConfiguration(service) {
  return bookingServiceConfiguration[service] || null;
}

export function findBookingService(value) {
  if (!value) {
    return null;
  }

  const normalizedValue = decodeURIComponent(value)
    .trim()
    .toLowerCase();
  const service =
    legacyServiceAliases[normalizedValue] ||
    approvedBookingServiceNames.find(
      (item) => item.toLowerCase() === normalizedValue,
    );

  if (!service) {
    return null;
  }

  return {
    category:
      bookingServiceConfiguration[service].category,
    service,
  };
}
