import {
  ArrowRight,
  BriefcaseBusiness,
  Camera,
  CheckCircle2,
  ImagePlus,
  Palette,
  Sparkles,
  Star,
  WandSparkles,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";

import SEO from "../../components/SEO";

const coreTools = [
  {
    title: "AI Photo Studio",
    description:
      "Enhance ordinary photos into clean, professional-quality portraits using AI.",
    route: "/ai-photo-studio",
    cta: "Enhance a Photo",
    features: [
      "Photo Enhance",
      "Blur Removal",
      "Face Detail Enhancement",
      "Hair Refinement",
      "Studio Background",
      "Passport Photo",
      "Old Photo Restoration",
      "Image Upscaling",
    ],
    accent: "purple",
    icon: Camera,
  },
  {
    title: "Personalized Poster Studio",
    description:
      "Upload your photo, enter your name or occasion details and create personalized posters instantly.",
    route: "/poster-studio",
    cta: "Create a Poster",
    features: [
      "Birthday",
      "Anniversary",
      "Wedding",
      "Engagement",
      "Baby Birthday",
      "Festival",
      "Devotional",
      "Motivation",
      "Love",
      "Special Days",
    ],
    accent: "cyan",
    icon: Palette,
  },
  {
    title: "AI Business Studio",
    description:
      "Generate professional promotional designs for shops, businesses, services and social media.",
    route: "/business-studio",
    cta: "Create Business Design",
    features: [
      "Business Offers",
      "Festival Promotions",
      "Product Ads",
      "Shop Opening Posters",
      "Restaurant Offers",
      "Real Estate Ads",
      "Social Media Promotions",
      "Tuition / Education Posters",
    ],
    accent: "rose",
    icon: BriefcaseBusiness,
  },
];

const processSteps = [
  {
    number: "01",
    title: "Choose a Studio",
    text: "Start with the creation flow that fits your goal — photo, poster or business design.",
  },
  {
    number: "02",
    title: "Upload Photo / Enter Details",
    text: "Add your image, text or campaign details and personalise the design in seconds.",
  },
  {
    number: "03",
    title: "Generate & Download",
    text: "Create a high-quality result and download it instantly for sharing or publishing.",
  },
];

const exampleTransforms = [
  {
    label: "Before Photo → Enhanced Photo",
    tone: "purple",
    before: "Original portrait",
    after: "Enhanced portrait",
  },
  {
    label: "Normal Photo → Birthday Poster",
    tone: "cyan",
    before: "Casual image",
    after: "Personalized birthday poster",
  },
  {
    label: "Business Details → Promotional Poster",
    tone: "rose",
    before: "Basic business brief",
    after: "Premium promo creative",
  },
];

const trendingTemplates = [
  "Good Morning",
  "Birthday",
  "Festival",
  "Devotional",
  "Business",
  "Motivation",
];

const benefits = [
  {
    title: "AI Powered",
    text: "Smart creative workflows built for premium visuals.",
  },
  {
    title: "Easy to Use",
    text: "No complex editing. Just upload, customise and generate.",
  },
  {
    title: "Ready to Share",
    text: "Download polished results for social media, print or reels.",
  },
  {
    title: "Made for Indian Creators",
    text: "Designed around local festivals, occasions and business needs.",
  },
];

function Home() {
  return (
    <div className="ai-home">
      <SEO
        title="KUSHI AI STUDIO – AI Photo, Poster & Business Creation"
        description="Create stunning AI-powered photos, personalized posters and business designs with Kushi Digitals."
        canonical="https://kushidigitals.com/"
      />

      <section className="ai-hero">
        <div className="container ai-hero-layout">
          <div className="ai-hero-copy">
            <span className="ai-eyebrow">
              <Sparkles size={15} />
              AI POWERED CREATIVE STUDIO
            </span>

            <h1>
              Create Stunning
              <span className="ai-gradient-text"> Photos</span>,
              <span className="ai-gradient-text"> Posters</span> &
              <span className="ai-gradient-text"> Business Designs</span>
              with AI
            </h1>

            <p>
              Turn your photos and ideas into professional AI-enhanced images,
              personalized posters and ready-to-share business creatives in
              minutes.
            </p>

            <div className="ai-hero-actions">
              <Link to="/ai-photo-studio" className="primary-button">
                Start Creating
                <ArrowRight size={18} />
              </Link>

              <Link to="/poster-studio" className="secondary-button">
                Explore Templates
              </Link>
            </div>

            <ul className="ai-proof-list">
              <li>
                <CheckCircle2 size={16} />
                Photo enhancement
              </li>
              <li>
                <CheckCircle2 size={16} />
                Poster generation
              </li>
              <li>
                <CheckCircle2 size={16} />
                Business creatives
              </li>
            </ul>
          </div>

          <div className="ai-showcase-panel" aria-label="AI product preview">
            <div className="ai-showcase-card ai-photo-card">
              <span className="mini-label">AI Photo Enhancement</span>
              <div className="showcase-thumbnail photo-thumbnail" />
              <strong>Professional portrait</strong>
            </div>

            <div className="ai-showcase-card ai-poster-card">
              <span className="mini-label">Birthday Poster</span>
              <div className="showcase-thumbnail poster-thumbnail" />
              <strong>Celebrate in style</strong>
            </div>

            <div className="ai-showcase-card ai-business-card">
              <span className="mini-label">Business Promotion</span>
              <div className="showcase-thumbnail business-thumbnail" />
              <strong>Ready-to-share offer</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="ai-tools-section" id="studio-tools">
        <div className="container">
          <div className="section-heading center-heading">
            <span className="section-kicker">
              <WandSparkles size={15} />
              Everything You Need to Create
            </span>
            <h2>
              Three powerful AI studios built for everyday creators, families
              and businesses.
            </h2>
          </div>

          <div className="ai-tool-grid">
            {coreTools.map((tool) => {
              const ToolIcon = tool.icon;

              return (
                <Link
                  key={tool.title}
                  to={tool.route}
                  className={`ai-tool-card ${tool.accent}`}
                >
                  <div className="tool-icon-wrap">
                    <ToolIcon size={22} />
                  </div>

                  <h3>{tool.title}</h3>
                  <p>{tool.description}</p>

                  <ul>
                    {tool.features.slice(0, 4).map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>

                  <span className="tool-link">
                    {tool.cta}
                    <ArrowRight size={16} />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="ai-process-section">
        <div className="container">
          <div className="section-heading center-heading">
            <span className="section-kicker">
              <Zap size={15} />
              How It Works
            </span>
            <h2>
              No complex editing. Choose a tool, provide your content and let AI
              create the design.
            </h2>
          </div>

          <div className="ai-process-grid">
            {processSteps.map((step) => (
              <article key={step.number} className="ai-process-card">
                <span className="process-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ai-transform-section">
        <div className="container">
          <div className="section-heading center-heading">
            <span className="section-kicker">
              <ImagePlus size={15} />
              Example Transformations
            </span>
            <h2>From simple input to polished visual output.</h2>
          </div>

          <div className="ai-transform-grid">
            {exampleTransforms.map((transform) => (
              <article
                key={transform.label}
                className={`ai-transform-card ${transform.tone}`}
              >
                <span>{transform.label}</span>
                <div className="comparison-row">
                  <div className="comparison-box before-box">
                    <strong>{transform.before}</strong>
                  </div>
                  <div className="comparison-arrow">→</div>
                  <div className="comparison-box after-box">
                    <strong>{transform.after}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ai-template-section">
        <div className="container">
          <div className="section-heading row-heading">
            <div>
              <span className="section-kicker">
                <Palette size={15} />
                Trending Templates
              </span>
              <h2>Ready-made ideas for your next creative.</h2>
            </div>
            <Link to="/poster-studio" className="secondary-button">
              Use Template
            </Link>
          </div>

          <div className="ai-template-row">
            {trendingTemplates.map((template) => (
              <div key={template} className="ai-template-pill">
                {template}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="ai-benefits-section">
        <div className="container">
          <div className="section-heading center-heading">
            <span className="section-kicker">
              <Star size={15} />
              Why KUSHI DIGITALS
            </span>
            <h2>
              AI-powered creativity built for expressive, elegant and effective
              results.
            </h2>
          </div>

          <div className="ai-benefits-grid">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="ai-benefit-card">
                <div className="benefit-icon">
                  <Sparkles size={18} />
                </div>
                <h3>{benefit.title}</h3>
                <p>{benefit.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="ai-final-cta">
        <div className="container">
          <div className="ai-cta-box">
            <span className="section-kicker">
              <Sparkles size={15} />
              KUSHI AI STUDIO
            </span>
            <h2>Turn Your Idea Into a Design</h2>
            <p>
              Create professional photos, personalized posters and business
              designs in just a few steps.
            </p>
            <Link to="/ai-photo-studio" className="primary-button">
              Start Creating
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
