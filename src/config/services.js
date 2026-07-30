import {
  Frame,
  IdCard,
  Printer,
  Sparkles,
  Ticket,
} from "lucide-react";

// TODO: Replace with Travel Ticket Booking image
import travelTicketBookingImage from "../assets/images/gallery/album-design.webp";
// TODO: Replace with PAN Card Services image
import panCardServicesImage from "../assets/images/gallery/digital-editing.webp";
import passportPhotosImage from "../assets/images/gallery/passport-photos.webp";
import premiumFrameImage from "../assets/images/gallery/premium-frame.webp";
import restorationImage from "../assets/images/gallery/restoration-before-after.webp";
import laminationsPrintImage from "../assets/images/gallery/print-lamination-support.webp";

export const servicesData = [
  {
    id: "passport-size-photos",
    number: "01",
    name: "Passport Size Photos",
    title: "Passport Size Photos",
    category: "Studio Services",
    tag: "STUDIO SERVICE",
    image: passportPhotosImage,
    imageAlt: "Professionally prepared passport-size photo sheet",
    icon: IdCard,
    homeDescription:
      "Professional passport and ID photos with correct sizing and clear finishing.",
    description:
      "Professional passport and ID photos with correct sizing, clear background and quality finishing.",
  },
  {
    id: "photo-frames",
    number: "02",
    name: "Photo Frames",
    title: "Photo Frames",
    category: "Studio Services",
    tag: "STUDIO SERVICE",
    image: premiumFrameImage,
    imageAlt: "Customized premium family photo frame",
    icon: Frame,
    homeDescription:
      "Elegant customized frames for family, wedding and special memories.",
    description:
      "Customized photo frames for family portraits, weddings, birthdays and memorable occasions.",
  },
  {
    id: "photo-restoration",
    number: "03",
    name: "Photo Restoration",
    title: "Photo Restoration",
    category: "Studio Services",
    tag: "PHOTO SERVICE",
    image: restorationImage,
    imageAlt: "Before and after example of an old photo restoration",
    icon: Sparkles,
    homeDescription:
      "Restore old, damaged or faded photos with clarity, detail and care.",
    description:
      "Restore old, damaged, faded or scratched photos and preserve important memories.",
  },
  {
    id: "pan-card-services",
    number: "04",
    name: "PAN Card Services",
    title: "PAN Card Services",
    category: "Online & Application Services",
    tag: "ONLINE SERVICE",
    image: panCardServicesImage,
    imageAlt: "PAN card application and correction assistance",
    icon: IdCard,
    homeDescription:
      "PAN card application, correction and related online assistance.",
    description:
      "Assistance for new PAN card applications, corrections and related online support.",
  },
  {
    id: "travel-ticket-booking",
    number: "05",
    name: "Travel Ticket Booking",
    title: "Travel Ticket Booking",
    category: "Online & Application Services",
    tag: "ONLINE SERVICE",
    image: travelTicketBookingImage,
    imageAlt: "Train, bus and flight ticket booking assistance",
    icon: Ticket,
    homeDescription:
      "Train, bus and flight ticket booking assistance.",
    description:
      "Assistance for train, bus and flight ticket booking based on customer travel requirements.",
  },
  {
    id: "laminations-print-support",
    number: "06",
    name: "Laminations & Print Support",
    title: "Laminations & Print Support",
    category: "Studio Services",
    tag: "STUDIO SERVICE",
    image: laminationsPrintImage,
    imageAlt:
      "Printer, documents, photo prints and lamination materials arranged in a studio",
    icon: Printer,
    homeDescription:
      "Clean lamination and quality printing support for documents and photos.",
    description:
      "Lamination, document printing, photo printing and basic Xerox support with neat finishing.",
  },
];

export const findService = (value) => {
  if (!value) {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  return (
    servicesData.find(
      (service) =>
        service.id.toLowerCase() === normalizedValue ||
        service.name.toLowerCase() === normalizedValue,
    ) || null
  );
};
