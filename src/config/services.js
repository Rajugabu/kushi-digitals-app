import {
  BookOpen,
  Camera,
  Frame,
  IdCard,
  Monitor,
  Sparkles,
} from "lucide-react";

export const servicesData = [
  {
    id: "passport-photos",
    icon: IdCard,
    title: "Passport Photos",
    shortDescription:
      "Perfectly sized, professionally edited and high-quality passport photographs.",
    description:
      "Professionally captured and edited passport-size photographs with accurate sizing, clean backgrounds and premium printing.",
    tag: "Quick Delivery",
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
    icon: Sparkles,
    title: "Photo Restoration",
    shortDescription:
      "Bring old, blurred, damaged and faded memories back to life.",
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
    icon: Frame,
    title: "Premium Frames",
    shortDescription:
      "Elegant customized frames designed to preserve your special moments.",
    description:
      "Beautiful customized frames for family portraits, weddings, birthdays, memorials and special occasions.",
    tag: "Custom Made",
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
    icon: BookOpen,
    title: "Album Designing",
    shortDescription:
      "Modern wedding, birthday and event albums with premium layouts.",
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
    icon: Camera,
    title: "Photography",
    shortDescription:
      "Professional photography for families, events and celebrations.",
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
    icon: Monitor,
    title: "Digital Services",
    shortDescription:
      "Photo editing, background change, printing and digital support.",
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
];