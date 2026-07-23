import {
  BookOpen,
  Camera,
  Frame,
  IdCard,
  Monitor,
  PlusCircle,
  Sparkles,
} from "lucide-react";

import otherServiceImage from "../assets/hero.png";
import albumDesignImage from "../assets/images/gallery/album-design.webp";
import digitalEditingImage from "../assets/images/gallery/digital-editing.webp";
import passportPhotosImage from "../assets/images/gallery/passport-photos.webp";
import premiumFrameImage from "../assets/images/gallery/premium-frame.webp";
import restorationImage from "../assets/images/gallery/restoration-before-after.webp";
import studioPortraitImage from "../assets/images/gallery/studio-portrait.webp";

export const servicesData = [
  {
    id: "passport-photos",
    name: "Passport Photos",
    image: passportPhotosImage,
    imageAlt: "Professionally prepared passport photo sheet",
    icon: IdCard,
    title: "Passport Photos",
    shortDescription:
      "Professional passport and stamp-size photo sheets.",
    description:
      "Professionally captured and edited passport-size photographs with accurate sizing, clean backgrounds and premium printing.",
    tag: "Quick Service",
    price: "₹50",
    priceLabel: "Starting From",
    benefits: [
      "4 passport photos from ₹50",
      "8 passport photos from ₹80",
      "Professional studio lighting",
      "Background correction",
      "Accurate passport sizing",
    ],
  },
  {
    id: "photo-restoration",
    name: "Photo Restoration",
    image: restorationImage,
    imageAlt: "Before and after example of an old photo restoration",
    icon: Sparkles,
    title: "Photo Restoration",
    shortDescription:
      "Restore old, damaged or faded photos digitally.",
    description:
      "Restore faded, scratched, torn, blurred or damaged photographs while preserving the natural identity and original memory.",
    tag: "AI Enhanced",
    price: "₹199",
    priceLabel: "Starting From",
    benefits: [
      "Damage and scratch removal",
      "Natural face enhancement",
      "Color and clarity correction",
      "High-resolution output",
    ],
  },
  {
    id: "premium-frames",
    name: "Premium Frames",
    image: premiumFrameImage,
    imageAlt: "Premium framed family portrait",
    icon: Frame,
    title: "Premium Frames",
    shortDescription:
      "Premium photo frames in standard and custom sizes.",
    description:
      "Beautiful customized frames for family portraits, weddings, birthdays, memorials and special occasions.",
    tag: "Premium",
    price: "₹400",
    priceLabel: "Starting From",
    benefits: [
      "Multiple frame sizes",
      "PVC, MDF and Acrylic options",
      "Premium finishing",
      "Custom photo layouts",
    ],
  },
  {
    id: "album-designing",
    name: "Album Designing",
    image: albumDesignImage,
    imageAlt: "Professionally designed wedding photo album",
    icon: BookOpen,
    title: "Album Designing",
    shortDescription:
      "Professional wedding and event album designing.",
    description:
      "Creative album layouts for weddings, engagements, birthdays, functions and family celebrations.",
    tag: "Creative Design",
    price: "Custom Quote",
    priceLabel: "Pricing",
    benefits: [
      "Modern page layouts",
      "Professional color balance",
      "Story-based sequencing",
      "Print-ready album files",
    ],
  },
  {
    id: "photography",
    name: "Photography",
    image: studioPortraitImage,
    imageAlt: "Professional studio portrait",
    icon: Camera,
    title: "Photography",
    shortDescription:
      "Photography for weddings, birthdays, events and studio shoots.",
    description:
      "Quality photography services focused on natural expressions, memorable moments and polished results.",
    tag: "Studio Quality",
    price: "Custom Quote",
    priceLabel: "Pricing",
    benefits: [
      "Studio portraits",
      "Family photography",
      "Event coverage",
      "Professional editing",
    ],
  },
  {
    id: "digital-services",
    name: "Digital Services",
    image: digitalEditingImage,
    imageAlt: "Digital photo editing workspace",
    icon: Monitor,
    title: "Digital Services",
    shortDescription:
      "Online and digital service support for your requirements.",
    description:
      "Convenient digital assistance for photo editing, background changes, resizing and print preparation.",
    tag: "All In One",
    price: "₹99",
    priceLabel: "Starting From",
    benefits: [
      "Background replacement",
      "Photo resizing",
      "Digital file delivery",
      "Print preparation",
    ],
  },
  {
    id: "other-service",
    name: "Other Service",
    image: otherServiceImage,
    imageAlt: "Abstract Kushi Digitals brand artwork",
    imageStyle: "contain",
    icon: PlusCircle,
    title: "Other Service",
    shortDescription:
      "Request any custom service not listed above.",
    description:
      "Tell us about a custom photography, print or digital requirement and our team will guide you personally.",
    tag: "Custom Request",
    price: "Custom Quote",
    priceLabel: "Pricing",
    benefits: [
      "Flexible custom requirements",
      "Personal guidance",
      "Digital and print options",
      "Clear quote before work begins",
    ],
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
