import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Coins,
  Download,
  ImageIcon,
  Images,
  LayoutTemplate,
  Sparkles,
  WandSparkles,
} from "lucide-react";

import {
  getStudioCreations,
  STUDIO_CREATIONS_STORAGE_KEY,
} from "../../services/studioCreationHistory";
import { getStudioCreditBalance } from "../../services/studioService";

const studioCards = [
  {
    title: "AI Photo Studio",
    description:
      "Enhance photos, remove blur, refine portraits and create professional images.",
    action: "Enhance Photo",
    to: "/ai-photo-studio",
    icon: Sparkles,
    tone: "purple",
  },
  {
    title: "Poster Studio",
    description:
      "Create personalized birthday, festival, devotional and occasion posters.",
    action: "Create Poster",
    to: "/poster-studio",
    icon: Images,
    tone: "cyan",
  },
  {
    title: "Business Studio",
    description:
      "Create promotional posters for shops, products and services.",
    action: "Create Business Design",
    to: "/business-studio",
    icon: BriefcaseBusiness,
    tone: "green",
  },
  {
    title: "Design Studio",
    description: "Explore ready-made premium templates.",
    action: "Open Design Studio",
    to: "/studio",
    icon: LayoutTemplate,
    tone: "yellow",
  },
];

const formatCreationDate = (creation) => {
  const value = creation.createdAt || creation.savedAt;

  if (!value || Number.isNaN(Date.parse(value))) {
    return "Saved recently";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

const getCreationTitle = (creation) =>
  creation.title ||
  creation.templateTitle ||
  creation.name ||
  "Kushi Creation";

const getCreationType = (creation) =>
  creation.type ||
  creation.category ||
  (creation.source === "locked-template"
    ? "Design Studio"
    : "AI Creation");

const getCreationPreview = (creation) =>
  creation.previewUrl || creation.previewDataUrl || "";

function Dashboard() {
  const outletContext = useOutletContext();
  const displayName = outletContext?.displayName ?? "Creator";
  const [creations, setCreations] = useState(() => getStudioCreations());
  const [creditAccount, setCreditAccount] = useState({
    availableCredits: 0,
    reservedCredits: 0,
  });
  const [isLoadingCredits, setIsLoadingCredits] = useState(true);

  const refreshCreations = useCallback(() => {
    setCreations(getStudioCreations());
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadCredits = async () => {
      try {
        const account = await getStudioCreditBalance();

        if (isMounted) {
          setCreditAccount(account);
        }
      } catch (error) {
        console.error("Unable to load Studio credits:", error);
      } finally {
        if (isMounted) {
          setIsLoadingCredits(false);
        }
      }
    };

    loadCredits();

    const handleStorage = (event) => {
      if (!event.key || event.key === STUDIO_CREATIONS_STORAGE_KEY) {
        refreshCreations();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("kushi-creations-updated", refreshCreations);

    return () => {
      isMounted = false;
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        "kushi-creations-updated",
        refreshCreations,
      );
    };
  }, [refreshCreations]);

  const recentCreations = useMemo(() => creations.slice(0, 4), [creations]);

  const overviewCards = [
    {
      label: "Studio Credits",
      value: isLoadingCredits ? "..." : creditAccount.availableCredits,
      description:
        creditAccount.reservedCredits > 0
          ? `${creditAccount.reservedCredits} currently reserved`
          : "Available for AI creation",
      icon: Coins,
      className: "purple",
    },
    {
      label: "Total Creations",
      value: creations.length,
      description: "Saved across your Kushi studios",
      icon: WandSparkles,
      className: "cyan",
    },
    {
      label: "Recent Creations",
      value: recentCreations.length,
      description: "Latest saved designs shown below",
      icon: ImageIcon,
      className: "green",
    },
  ];

  return (
    <div className="customer-dashboard-page ai-dashboard-page">
      <section className="dashboard-welcome-banner">
        <div>
          <span className="dashboard-eyebrow">
            <Sparkles size={16} />
            AI Creator Dashboard
          </span>

          <h1>
            Welcome Back,
            <span className="gradient-text"> {displayName}</span>
          </h1>

          <p>
            Create AI-enhanced photos, personalized posters and business
            designs from one place.
          </p>

          <div className="dashboard-welcome-actions">
            <Link to="/ai-photo-studio" className="primary-button">
              <Sparkles size={18} />
              Create with AI
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/dashboard/creations"
              className="dashboard-secondary-button"
            >
              My Creations
            </Link>
          </div>
        </div>

        <div className="dashboard-account-summary ai-account-summary">
          <span>Creator Balance</span>
          <strong>
            <Coins size={18} />
            {isLoadingCredits
              ? "Loading credits..."
              : `${creditAccount.availableCredits} Studio Credits`}
          </strong>
          <div>
            <WandSparkles size={18} />
            <span>
              Saved creations
              <strong>{creations.length}</strong>
            </span>
          </div>
          <Link to="/dashboard/wallet">View Credits</Link>
        </div>
      </section>

      <section className="dashboard-studio-grid" aria-label="AI creation studios">
        {studioCards.map((studio) => {
          const Icon = studio.icon;

          return (
            <article
              className={`dashboard-studio-card ${studio.tone}`}
              key={studio.title}
            >
              <span className="dashboard-studio-icon">
                <Icon size={24} />
              </span>
              <h2>{studio.title}</h2>
              <p>{studio.description}</p>
              <Link to={studio.to}>
                {studio.action}
                <ArrowRight size={16} />
              </Link>
            </article>
          );
        })}
      </section>

      <section className="dashboard-overview-grid ai-overview-grid">
        {overviewCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.label}
              className={`dashboard-overview-card ${card.className}`}
            >
              <div className="dashboard-overview-icon">
                <Icon size={23} />
              </div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.description}</p>
            </article>
          );
        })}
      </section>

      <section className="dashboard-panel dashboard-creations-panel">
        <div className="dashboard-panel-header">
          <div>
            <span>Recent Creations</span>
            <h2>Your Latest AI Designs</h2>
          </div>
          <Link to="/dashboard/creations">
            View All
            <ArrowRight size={16} />
          </Link>
        </div>

        {recentCreations.length > 0 ? (
          <div className="dashboard-recent-creations">
            {recentCreations.map((creation) => {
              const preview = getCreationPreview(creation);
              const actionUrl = creation.downloadUrl || creation.previewUrl;

              return (
                <article className="dashboard-creation-row" key={creation.id}>
                  <div className="dashboard-creation-thumbnail">
                    {preview ? (
                      <img src={preview} alt="" />
                    ) : (
                      <ImageIcon size={23} />
                    )}
                  </div>
                  <div>
                    <span>{getCreationType(creation)}</span>
                    <h3>{getCreationTitle(creation)}</h3>
                    <p>{formatCreationDate(creation)}</p>
                  </div>
                  {actionUrl ? (
                    <a
                      href={actionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${getCreationTitle(creation)}`}
                    >
                      <Download size={17} />
                      Open
                    </a>
                  ) : (
                    <Link to="/studio">Open Studio</Link>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="dashboard-empty-state">
            <div>
              <WandSparkles size={30} />
            </div>
            <h3>No Creations Yet</h3>
            <p>
              Your saved AI photos, posters, business designs and premium
              template creations will appear here.
            </p>
            <Link to="/ai-photo-studio" className="primary-button">
              Create Your First Design
              <ArrowRight size={17} />
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
