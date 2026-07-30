import { useState } from "react";
import { Expand, Image as ImageIcon, X } from "lucide-react";
import PageHero from "../../components/PageHero";
import { galleryItems } from "../../config/galleryItems";

const filters = [
  "All",
  "Studio Service",
  "Photo Service",
  "Online Service",
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
        description="Explore Kushi Digitals passport photos, photo frames, restoration, PAN card assistance, travel booking and print support."
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
                aria-pressed={activeFilter === filter}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="real-gallery-grid">
            {filteredItems.map((item) => (
              <article
                className={`real-gallery-card editorial-gallery-card gallery-card--${item.orientation} gallery-card--${item.size} gallery-card--${item.overlayTone}-overlay`}
                key={item.id}
                style={{
                  "--gallery-object-position": item.objectPosition,
                  "--gallery-object-fit": item.objectFit,
                }}
              >
                <img
                  src={item.image}
                  alt={item.alt}
                  loading="lazy"
                />

                <div className="real-gallery-overlay editorial-gallery-overlay">
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
              alt={selectedImage.alt}
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
