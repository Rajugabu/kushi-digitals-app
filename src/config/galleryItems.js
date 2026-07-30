import { servicesData } from "./services";

function createGalleryItem(serviceId, metadata) {
  const service = servicesData.find(
    (item) => item.id === serviceId,
  );

  if (!service) {
    throw new Error(
      `Missing service data for gallery item: ${serviceId}`,
    );
  }

  return {
    id: service.id,
    title: service.title,
    category: metadata.category,
    image: service.image,
    alt: service.imageAlt,
    description: service.homeDescription,
    orientation: metadata.orientation,
    size: metadata.size,
    objectPosition:
      metadata.objectPosition || "center",
    objectFit: metadata.objectFit || "cover",
    overlayTone:
      metadata.overlayTone || "standard",
    showOnHome: metadata.showOnHome ?? true,
  };
}

export const galleryItems = [
  createGalleryItem("photo-frames", {
    category: "Studio Service",
    orientation: "landscape",
    size: "featured",
    objectPosition: "50% 45%",
  }),
  createGalleryItem("laminations-print-support", {
    category: "Studio Service",
    orientation: "landscape",
    size: "standard",
    objectPosition: "50% 50%",
  }),
  createGalleryItem("travel-ticket-booking", {
    category: "Online Service",
    orientation: "landscape",
    size: "standard",
    overlayTone: "light",
  }),
  createGalleryItem("passport-size-photos", {
    category: "Studio Service",
    orientation: "landscape",
    size: "large",
    objectFit: "contain",
  }),
  createGalleryItem("photo-restoration", {
    category: "Photo Service",
    orientation: "wide",
    size: "wide",
    objectPosition: "50% 48%",
  }),
  createGalleryItem("pan-card-services", {
    category: "Online Service",
    orientation: "landscape",
    size: "standard",
    overlayTone: "light",
  }),
];

export const homepageGalleryItems = galleryItems.filter(
  (item) => item.showOnHome,
);
