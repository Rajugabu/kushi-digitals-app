import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Download,
  ExternalLink,
  ImageIcon,
  LayoutGrid,
  Sparkles,
} from "lucide-react";

import {
  getStudioCreations,
  STUDIO_CREATIONS_STORAGE_KEY,
} from "../../services/studioCreationHistory";

const creationFilters = [
  { id: "all", label: "All Creations" },
  { id: "ai-photo", label: "AI Photos" },
  { id: "poster", label: "Posters" },
  { id: "business", label: "Business" },
  { id: "design", label: "Design Studio" },
];

const getCreationType = (creation) =>
  creation.type ||
  creation.category ||
  (creation.source === "locked-template"
    ? "Design Studio"
    : "AI Creation");

const getCreationTitle = (creation) =>
  creation.title ||
  creation.templateTitle ||
  creation.name ||
  "Kushi Creation";

const getCreationPreview = (creation) =>
  creation.previewUrl || creation.previewDataUrl || "";

const getCreationDate = (creation) => {
  const value = creation.createdAt || creation.savedAt;

  if (!value || Number.isNaN(Date.parse(value))) {
    return "Saved recently";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};

const getCreationGroup = (creation) => {
  const type = getCreationType(creation).toLowerCase();

  if (type.includes("photo")) return "ai-photo";
  if (type.includes("poster")) return "poster";
  if (type.includes("business")) return "business";
  return "design";
};

function Orders() {
  const [creations, setCreations] = useState(() => getStudioCreations());
  const [activeFilter, setActiveFilter] = useState("all");

  const refreshCreations = useCallback(() => {
    setCreations(getStudioCreations());
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (!event.key || event.key === STUDIO_CREATIONS_STORAGE_KEY) {
        refreshCreations();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("kushi-creations-updated", refreshCreations);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        "kushi-creations-updated",
        refreshCreations,
      );
    };
  }, [refreshCreations]);

  const filteredCreations = useMemo(
    () =>
      activeFilter === "all"
        ? creations
        : creations.filter(
            (creation) => getCreationGroup(creation) === activeFilter,
          ),
    [activeFilter, creations],
  );

  return (
    <div className="creations-page">
      <section className="dashboard-page-header creations-page-header">
        <div>
          <span>Creator Library</span>
          <h1>My Creations</h1>
          <p>
            Open your latest AI photos, posters, business designs and saved
            premium-template creations.
          </p>
        </div>
        <Link to="/ai-photo-studio" className="primary-button">
          <Sparkles size={18} />
          Create with AI
        </Link>
      </section>

      <section className="creations-toolbar" aria-label="Creation filters">
        <div>
          <LayoutGrid size={19} />
          <strong>{creations.length} Saved Creations</strong>
        </div>
        <div className="creations-filter-list">
          {creationFilters.map((filter) => (
            <button
              type="button"
              key={filter.id}
              className={activeFilter === filter.id ? "active" : ""}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </section>

      {filteredCreations.length > 0 ? (
        <section className="creations-grid">
          {filteredCreations.map((creation) => {
            const preview = getCreationPreview(creation);
            const actionUrl = creation.downloadUrl || creation.previewUrl;

            return (
              <article className="creation-library-card" key={creation.id}>
                <div className="creation-library-preview">
                  {preview ? (
                    <img
                      src={preview}
                      alt={`${getCreationTitle(creation)} preview`}
                    />
                  ) : (
                    <ImageIcon size={38} />
                  )}
                  <span>{getCreationType(creation)}</span>
                </div>
                <div className="creation-library-content">
                  <h2>{getCreationTitle(creation)}</h2>
                  <p>{getCreationDate(creation)}</p>
                  <div>
                    {actionUrl ? (
                      <a
                        href={actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink size={16} />
                        Open
                      </a>
                    ) : (
                      <Link to="/studio">
                        <ExternalLink size={16} />
                        Open Studio
                      </Link>
                    )}
                    {creation.downloadUrl ? (
                      <a href={creation.downloadUrl} download>
                        <Download size={16} />
                        Download
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="dashboard-panel dashboard-empty-state creations-empty-state">
          <div>
            <Sparkles size={30} />
          </div>
          <h3>No Creations Found</h3>
          <p>
            Create an AI-enhanced photo, poster or business design and save it
            to see it here.
          </p>
          <Link to="/ai-photo-studio" className="primary-button">
            Start Creating
            <ArrowRight size={17} />
          </Link>
        </section>
      )}
    </div>
  );
}

export default Orders;
