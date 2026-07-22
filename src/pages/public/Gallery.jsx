import { useState } from "react";
import { Expand, Image as ImageIcon, X } from "lucide-react";
import PageHero from "../../components/PageHero";

import premiumFrame from "../../assets/images/gallery/premium-frame.webp";
import studioPortrait from "../../assets/images/gallery/studio-portrait.webp";
import albumDesign from "../../assets/images/gallery/album-design.webp";
import passportPhotos from "../../assets/images/gallery/passport-photos.webp";
import digitalEditing from "../../assets/images/gallery/digital-editing.webp";

const galleryItems = [
  {
    image: premiumFrame,
    title: "Premium Family Frame",
    category: "Frames",
    description:
      "Elegant customized family frame with premium finishing.",
  },
  {
    image: studioPortrait,
    title: "Professional Studio Portrait",
    category: "Photography",
    description:
      "Soft studio lighting with premium portrait retouching.",
  },
  {
    image: albumDesign,
    title: "Wedding Album Design",
    category: "Albums",
    description:
      "Modern wedding album layout with cinematic storytelling.",
  },
  {
    image: passportPhotos,
    title: "Passport Photo Sheet",
    category: "Passport Photos",
    description:
      "Clean background, accurate sizing and professional output.",
  },
  {
    image: digitalEditing,
    title: "Digital Photo Editing",
    category: "Editing",
    description:
      "Before-and-after restoration and professional color enhancement.",
  },
];

const filters = [
  "All",
  "Frames",
  "Photography",
  "Albums",
  "Passport Photos",
  "Editing",
];

function Gallery() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [selectedImage, setSelectedImage] = useState(null);

  const filteredItems =
    activeFilter === "All"
      ? galleryItems
      : galleryItems.filter(
          (item) => item.category === activeFilter,
        );

  return (
    <>
      <PageHero
        eyebrow="Creative Showcase"
        title="A Glimpse Of Our"
        highlight="Premium Work"
        description="Explore Kushi Digitals photography, frames, albums, passport photos and professional digital editing services."
      />

      <section className="page-section">
        <div className="container">
          <div className="gallery-filter-row">
            {filters.map((filter) => (
              <button
                key={filter}
                type="button"
                className={`gallery-filter ${
                  activeFilter === filter ? "active" : ""
                }`}
                onClick={() => setActiveFilter(filter)}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="real-gallery-grid">
            {filteredItems.map((item, index) => (
              <article
                className={`real-gallery-card ${
                  index === 0 ? "real-gallery-featured" : ""
                }`}
                key={item.title}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  loading="lazy"
                />

                <div className="real-gallery-overlay">
                  <span>{item.category}</span>
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>

                  <button
                    type="button"
                    onClick={() => setSelectedImage(item)}
                    aria-label={`View ${item.title}`}
                  >
                    <Expand size={18} />
                    View Photo
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="gallery-note">
            <ImageIcon size={21} />
            <p>
              These are sample portfolio images. Later, your real customer
              projects can be uploaded through the Admin Dashboard.
            </p>
          </div>
        </div>
      </section>

      {selectedImage && (
        <div
          className="gallery-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={selectedImage.title}
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            className="gallery-lightbox-close"
            onClick={() => setSelectedImage(null)}
            aria-label="Close image preview"
          >
            <X size={25} />
          </button>

          <div
            className="gallery-lightbox-content"
            onClick={(event) => event.stopPropagation()}
          >
            <img
              src={selectedImage.image}
              alt={selectedImage.title}
            />

            <div>
              <span>{selectedImage.category}</span>
              <h2>{selectedImage.title}</h2>
              <p>{selectedImage.description}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Gallery;