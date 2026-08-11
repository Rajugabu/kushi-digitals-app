const makePremiumThumbnail = ({
  title,
  subtitle,
  accent = "#D4AF37",
  start = "#0A0A0A",
  end = "#1C1710",
}) => {
  const svg = `
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="800"
      height="1000"
      viewBox="0 0 800 1000"
    >
      <defs>
        <linearGradient
          id="bg"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
        >
          <stop
            offset="0%"
            stop-color="${start}"
          />
          <stop
            offset="58%"
            stop-color="${end}"
          />
          <stop
            offset="100%"
            stop-color="${accent}"
          />
        </linearGradient>
      </defs>

      <rect
        width="800"
        height="1000"
        fill="url(#bg)"
      />

      <circle
        cx="650"
        cy="160"
        r="200"
        fill="${accent}"
        opacity="0.18"
      />

      <circle
        cx="130"
        cy="880"
        r="260"
        fill="${accent}"
        opacity="0.10"
      />

      <rect
        x="90"
        y="110"
        width="620"
        height="560"
        rx="32"
        fill="#FFFFFF"
        opacity="0.08"
      />

      <text
        x="400"
        y="755"
        text-anchor="middle"
        fill="#FFFFFF"
        font-family="Arial, sans-serif"
        font-size="42"
        font-weight="700"
      >
        ${title}
      </text>

      <text
        x="400"
        y="805"
        text-anchor="middle"
        fill="${accent}"
        font-family="Arial, sans-serif"
        font-size="20"
      >
        ${subtitle}
      </text>

      <text
        x="400"
        y="880"
        text-anchor="middle"
        fill="#FFFFFF"
        opacity="0.62"
        font-family="Arial, sans-serif"
        font-size="16"
        letter-spacing="5"
      >
        KUSHI AI STUDIO
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    svg,
  )}`;
};

export const TEMPLATE_FILTERS = [
  { id: "all", label: "All" },
  { id: "Good Morning", label: "Good Morning" },
  { id: "Good Night", label: "Good Night" },
  { id: "Birthday", label: "Birthday" },
  { id: "Anniversary", label: "Anniversary" },
  { id: "Love", label: "Love & Romance" },
  { id: "Motivation", label: "Motivation" },
  { id: "Festival", label: "Festival" },
  { id: "Devotional", label: "Devotional" },
  { id: "Quotes", label: "Life & Quotes" },
  { id: "Nature", label: "Nature & Scenery" },
  { id: "Special Days", label: "Special Days" },
  { id: "type:photo", label: "Photo Templates", type: "photo" },
  { id: "type:video", label: "Video Templates", type: "video" },
];

export const getTemplateFilter = (filterId) =>
  TEMPLATE_FILTERS.find((filter) => filter.id === filterId) ||
  TEMPLATE_FILTERS[0];

export const filterTemplates = (templates, filterId = "all") => {
  const filter = getTemplateFilter(filterId);

  if (filter.id === "all") {
    return templates;
  }

  if (filter.type) {
    return templates.filter(
      (template) => (template.type || "photo") === filter.type,
    );
  }

  return templates.filter(
    (template) => template.category === filter.id,
  );
};

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const normalizeFeatherValue = (value, fallback = 0) => {
  const numericValue = Number(value);
  return clamp(Number.isFinite(numericValue) ? numericValue : fallback, 0, 100);
};

export const getTemplateFeatherEdges = (photoSlot = {}) => {
  const legacyFeather = normalizeFeatherValue(photoSlot.feather, 0);
  const configuredEdges = photoSlot.featherEdges;

  return {
    top: normalizeFeatherValue(configuredEdges?.top, legacyFeather),
    right: normalizeFeatherValue(configuredEdges?.right, legacyFeather),
    bottom: normalizeFeatherValue(configuredEdges?.bottom, legacyFeather),
    left: normalizeFeatherValue(configuredEdges?.left, legacyFeather),
  };
};

export const getTemplatePhotoSlot = (template) => {
  const configuredSlot = template?.photoSlot || {};
  const requestedMode =
    configuredSlot.mode || configuredSlot.shape || "rounded";
  const renderMode = requestedMode;
  const feather = clamp(
    Number(configuredSlot.feather) || 0,
    0,
    100,
  );
  const featherEdges = getTemplateFeatherEdges(configuredSlot);
  const legacyPosition = String(
    configuredSlot.defaultObjectPosition ||
      configuredSlot.objectPosition ||
      "50% 50%",
  ).match(/(-?\d+(?:\.\d+)?)%?\s+(-?\d+(?:\.\d+)?)%?/);
  const defaultObjectPositionX = clamp(
    Number(configuredSlot.defaultObjectPositionX ?? legacyPosition?.[1] ?? 50),
    0,
    100,
  );
  const defaultObjectPositionY = clamp(
    Number(configuredSlot.defaultObjectPositionY ?? legacyPosition?.[2] ?? 50),
    0,
    100,
  );
  const defaultZoom = clamp(Number(configuredSlot.defaultZoom) || 1, 1, 3);

  let borderRadius = configuredSlot.borderRadius;

  if (!borderRadius) {
    if (renderMode === "circle") {
      borderRadius = "999px";
    } else if (
      renderMode === "rectangle" ||
      renderMode === "feather" ||
      renderMode === "cutout" ||
      renderMode === "normal"
    ) {
      borderRadius = "0px";
    } else {
      borderRadius = "28px";
    }
  }

  return {
    enabled: configuredSlot.enabled !== false,
    top: configuredSlot.top || "11%",
    left: configuredSlot.left || "17%",
    width: configuredSlot.width || "66%",
    height: configuredSlot.height || "55%",
    mode: requestedMode,
    shape: renderMode,
    renderMode,
    isCutoutFallback: false,
    feather,
    featherEdges,
    borderRadius,
    objectFit: configuredSlot.objectFit || "cover",
    objectPosition: `${defaultObjectPositionX}% ${defaultObjectPositionY}%`,
    defaultObjectPositionX,
    defaultObjectPositionY,
    defaultZoom,
    zIndex: Number(configuredSlot.zIndex) || 2,
  };
};

export const getTemplateNameSlot = (template) => {
  const configuredSlot = template?.nameSlot || {};

  return {
    enabled: configuredSlot.enabled !== false,
    top: configuredSlot.top,
    bottom: configuredSlot.bottom || "2.5%",
    left: configuredSlot.left || "5%",
    width: configuredSlot.width || "90%",
    textAlign: configuredSlot.textAlign || "left",
    fontFamily: configuredSlot.fontFamily || "inherit",
    fontSize: configuredSlot.fontSize || "4%",
    fontWeight: configuredSlot.fontWeight || 700,
    color: configuredSlot.color || "#FFFFFF",
    letterSpacing: configuredSlot.letterSpacing || "0",
    zIndex: Number(configuredSlot.zIndex) || 5,
  };
};

export const getTemplateBackgroundStyle = (template) => {
  if (template?.backgroundImage) {
    return {
      background: `url('${template.backgroundImage}') center / cover no-repeat`,
    };
  }

  return {
    background:
      template?.background?.value ||
      `linear-gradient(145deg, ${template?.surfaceStart || "#1a1408"}, ${
        template?.surfaceEnd || "#08080b"
      })`,
  };
};

export const getTemplatePhotoAdjustment = (template, adjustment = {}) => {
  const photoSlot = getTemplatePhotoSlot(template);

  return {
    objectPositionX: clamp(
      Number(
        adjustment.objectPositionX ??
          adjustment.x ??
          photoSlot.defaultObjectPositionX,
      ),
      0,
      100,
    ),
    objectPositionY: clamp(
      Number(
        adjustment.objectPositionY ??
          adjustment.y ??
          photoSlot.defaultObjectPositionY,
      ),
      0,
      100,
    ),
    zoom: clamp(
      Number(adjustment.zoom ?? adjustment.scale ?? photoSlot.defaultZoom) || 1,
      1,
      3,
    ),
  };
};

export const getTemplatePhotoMaskStyle = (photoSlot) => {
  if (photoSlot?.renderMode !== "feather" && photoSlot?.shape !== "feather") {
    return {};
  }

  const edges = getTemplateFeatherEdges(photoSlot);
  const fadeDistance = (value) => (value / 100) * 0.45;
  const gradient = (id, direction, strength) => {
    const distance = fadeDistance(strength);

    if (distance === 0) {
      return `<linearGradient id="${id}"><stop offset="0" stop-color="white"/><stop offset="1" stop-color="white"/></linearGradient>`;
    }

    const solidOffset = (1 - distance).toFixed(4);
    const fadeOffset = distance.toFixed(4);

    if (direction === "top") {
      return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="white" stop-opacity="0"/><stop offset="${fadeOffset}" stop-color="white"/><stop offset="1" stop-color="white"/></linearGradient>`;
    }

    if (direction === "bottom") {
      return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="white"/><stop offset="${solidOffset}" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>`;
    }

    if (direction === "left") {
      return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="white" stop-opacity="0"/><stop offset="${fadeOffset}" stop-color="white"/><stop offset="1" stop-color="white"/></linearGradient>`;
    }

    return `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="white"/><stop offset="${solidOffset}" stop-color="white"/><stop offset="1" stop-color="white" stop-opacity="0"/></linearGradient>`;
  };
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1" preserveAspectRatio="none">',
    "<defs>",
    gradient("top", "top", edges.top),
    gradient("right", "right", edges.right),
    gradient("bottom", "bottom", edges.bottom),
    gradient("left", "left", edges.left),
    '<mask id="mt" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" mask-type="alpha"><rect width="1" height="1" fill="url(#top)"/></mask>',
    '<mask id="mr" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" mask-type="alpha"><rect width="1" height="1" fill="url(#right)"/></mask>',
    '<mask id="mb" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" mask-type="alpha"><rect width="1" height="1" fill="url(#bottom)"/></mask>',
    '<mask id="ml" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox" mask-type="alpha"><rect width="1" height="1" fill="url(#left)"/></mask>',
    "</defs>",
    '<g mask="url(#mt)"><g mask="url(#mr)"><g mask="url(#mb)"><rect width="1" height="1" fill="white" mask="url(#ml)"/></g></g></g>',
    "</svg>",
  ].join("");
  const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

  return {
    WebkitMaskImage: mask,
    maskImage: mask,
    WebkitMaskMode: "alpha",
    maskMode: "alpha",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskSize: "100% 100%",
    maskSize: "100% 100%",
  };
};

export const getTemplateDecorationPosition = (position) => {
  switch (position) {
    case "top-left":
      return { top: "-12%", left: "-14%" };
    case "top-right":
      return { top: "-12%", right: "-14%" };
    case "top-center":
      return { top: "-16%", left: "50%", transform: "translateX(-50%)" };
    case "bottom-left":
      return { bottom: "-15%", left: "-15%" };
    case "bottom-right":
      return { bottom: "-15%", right: "-15%" };
    case "bottom-center":
      return { bottom: "-18%", left: "50%", transform: "translateX(-50%)" };
    default:
      return { top: "-10%", right: "-10%" };
  }
};

export const sampleTemplates = [
  {
    id: "good-morning-gold",
    type: "photo",
    title: "Golden Good Morning",
    category: "Good Morning",
    isPremium: false,
    accentColor: "#D4AF37",
    accentSoft: "rgba(212, 175, 55, 0.18)",
    surfaceStart: "#211708",
    surfaceEnd: "#070707",
    defaultName: "Good Morning",
    defaultMessage:
      "May your day begin with happiness, peace and beautiful moments.",

    thumbnail: "/templates/backgrounds/golden-good-morning.webp",
    previewImage: "/templates/backgrounds/golden-good-morning.webp",

    canvas: {
      width: 1080,
      height: 1350,
      ratio: "4:5",
    },

    background: {
      type: "gradient",
      value:
        "radial-gradient(circle at 82% 10%, rgba(255,214,91,0.42), transparent 25%), radial-gradient(circle at 15% 32%, rgba(212,175,55,0.16), transparent 30%), linear-gradient(155deg, #332307 0%, #171005 48%, #060606 100%)",
    },

    photoSlot: {
      enabled: true,
      mode: "circle",
      shape: "circle",
      top: "9%",
      left: "31%",
      width: "38%",
      height: "30.4%",
      borderRadius: "999px",
      objectFit: "cover",
      objectPosition: "50% 38%",
      defaultObjectPosition: "50% 38%",
      feather: 0,
      zIndex: 2,
    },

    nameSlot: {
      enabled: true,
      bottom: "2.5%",
      left: "5%",
      width: "90%",
      textAlign: "left",
      fontSize: "4%",
      fontWeight: 700,
      color: "#FFFFFF",
    },

    textLayout: {
      align: "center",

      eyebrow: {
        text: "A BEAUTIFUL NEW DAY",
        top: "70%",
        left: "10%",
        width: "80%",
      },

      heading: {
        top: "75%",
        left: "8%",
        width: "84%",
      },

      message: {
        top: "84%",
        left: "12%",
        width: "76%",
      },

      brand: {
        bottom: "4%",
        left: "10%",
        width: "80%",
      },
    },

    decorations: [],
  },

  {
    id: "devotional-divine",
    type: "photo",
    title: "Divine Blessings",
    category: "Devotional",
    isPremium: true,
    accentColor: "#F59E0B",
    accentSoft: "rgba(245, 158, 11, 0.18)",
    surfaceStart: "#2A1404",
    surfaceEnd: "#090604",
    defaultName: "Divine Blessings",
    defaultMessage:
      "May divine grace guide your heart and fill your life with peace.",
    thumbnail: "/templates/backgrounds/divine-blessings.webp",
    canvas: {
      width: 1080,
      height: 1350,
      ratio: "4:5",
    },
    background: {
  type: "image",
  value:
    "linear-gradient(rgba(5,3,1,0.08), rgba(5,3,1,0.08)), url('/templates/backgrounds/divine-blessings.webp') center center / cover no-repeat",
},
    photoSlot: {
      enabled: true,
      mode: "rounded",
      shape: "rounded",
      top: "10%",
      left: "19%",
      width: "62%",
      height: "55%",
      borderRadius: "46% 46% 28px 28px",
      objectFit: "cover",
      objectPosition: "50% 50%",
      defaultObjectPosition: "50% 50%",
      zIndex: 2,
    },
    nameSlot: {
      enabled: true,
      bottom: "2.5%",
      left: "6%",
      width: "88%",
      textAlign: "center",
      fontSize: "3.8%",
      fontWeight: 700,
      color: "#FFF7E6",
    },
    textLayout: {
      align: "center",
      eyebrow: {
        text: "GRACE • FAITH • PEACE",
        top: "69%",
        left: "10%",
        width: "80%",
      },
      heading: {
        top: "75%",
        left: "8%",
        width: "84%",
      },
      message: {
        top: "84%",
        left: "12%",
        width: "76%",
      },
      brand: {
        bottom: "4%",
        left: "10%",
        width: "80%",
      },
    },
    decorations: [
      {
        type: "halo",
        position: "top-center",
        color: "#F59E0B",
      },
      {
        type: "glow",
        position: "bottom-center",
        color: "#B45309",
      },
    ],
  },

  {
    id: "birthday-luxury",
    type: "photo",
    title: "Luxury Birthday",
    category: "Birthday",
    isPremium: true,
    accentColor: "#E879F9",
    accentSoft: "rgba(232, 121, 249, 0.18)",
    surfaceStart: "#28102D",
    surfaceEnd: "#080609",
    defaultName: "Happy Birthday",
    defaultMessage:
      "Wishing you a beautiful year filled with happiness, success and unforgettable memories.",
    thumbnail: makePremiumThumbnail({
      title: "Happy Birthday",
      subtitle: "Celebrate Beautifully",
      accent: "#E879F9",
      start: "#2D0D35",
      end: "#0D0711",
    }),
    canvas: {
      width: 1080,
      height: 1350,
      ratio: "4:5",
    },
    background: {
      type: "gradient",
      value:
        "linear-gradient(145deg, #32113B 0%, #140817 48%, #070609 100%)",
    },
    photoSlot: {
      enabled: true,
      mode: "rectangle",
      shape: "rectangle",
      top: "9%",
      left: "14%",
      width: "72%",
      height: "58%",
      borderRadius: "0px",
      objectFit: "cover",
      objectPosition: "50% 50%",
      defaultObjectPosition: "50% 50%",
      zIndex: 2,
    },
    nameSlot: {
      enabled: true,
      bottom: "2.6%",
      left: "7%",
      width: "86%",
      textAlign: "center",
      fontSize: "4%",
      fontWeight: 800,
      color: "#FFFFFF",
    },
    textLayout: {
      align: "center",
      eyebrow: {
        text: "CELEBRATE BEAUTIFULLY",
        top: "70%",
        left: "10%",
        width: "80%",
      },
      heading: {
        top: "75%",
        left: "8%",
        width: "84%",
      },
      message: {
        top: "84%",
        left: "12%",
        width: "76%",
      },
      brand: {
        bottom: "4%",
        left: "10%",
        width: "80%",
      },
    },
    decorations: [
      {
        type: "glow",
        position: "top-left",
        color: "#E879F9",
      },
      {
        type: "glow",
        position: "bottom-right",
        color: "#7C3AED",
      },
    ],
  },

  {
    id: "motivation-rise",
    type: "photo",
    title: "Rise & Shine",
    category: "Motivation",
    isPremium: false,
    accentColor: "#60A5FA",
    accentSoft: "rgba(96, 165, 250, 0.18)",
    surfaceStart: "#071A2F",
    surfaceEnd: "#05070C",
    defaultName: "Rise & Shine",
    defaultMessage:
      "Believe in yourself. Every new day is another chance to move forward.",
    thumbnail: makePremiumThumbnail({
      title: "Rise & Shine",
      subtitle: "Dream • Believe • Achieve",
      accent: "#60A5FA",
      start: "#071D38",
      end: "#060910",
    }),
    canvas: {
      width: 1080,
      height: 1350,
      ratio: "4:5",
    },
    background: {
      type: "gradient",
      value:
        "linear-gradient(160deg, #0A2849 0%, #081321 44%, #05070C 100%)",
    },
    photoSlot: {
      enabled: true,
      mode: "feather",
      shape: "feather",
      feather: 70,
      top: "12%",
      left: "16%",
      width: "68%",
      height: "55%",
      borderRadius: "0px",
      objectFit: "cover",
      objectPosition: "50% 50%",
      defaultObjectPosition: "50% 50%",
      zIndex: 2,
    },
    nameSlot: {
      enabled: true,
      bottom: "2.5%",
      left: "9%",
      width: "82%",
      textAlign: "left",
      fontSize: "3.8%",
      fontWeight: 700,
      color: "#DBEAFE",
    },
    textLayout: {
      align: "left",
      eyebrow: {
        text: "DREAM • BELIEVE • ACHIEVE",
        top: "70%",
        left: "9%",
        width: "82%",
      },
      heading: {
        top: "75%",
        left: "9%",
        width: "82%",
      },
      message: {
        top: "84%",
        left: "9%",
        width: "76%",
      },
      brand: {
        bottom: "4%",
        left: "9%",
        width: "82%",
      },
    },
    decorations: [
      {
        type: "glow",
        position: "top-right",
        color: "#60A5FA",
      },
      {
        type: "glow",
        position: "bottom-left",
        color: "#2563EB",
      },
    ],
  },

  {
    id: "love-elegance",
    type: "photo",
    title: "Forever Love",
    category: "Love",
    isPremium: true,
    accentColor: "#FB7185",
    accentSoft: "rgba(251, 113, 133, 0.18)",
    surfaceStart: "#311018",
    surfaceEnd: "#090608",
    defaultName: "Forever Love",
    defaultMessage:
      "Every beautiful moment becomes more special when it is shared with you.",
    thumbnail: makePremiumThumbnail({
      title: "Forever Love",
      subtitle: "Together • Always",
      accent: "#FB7185",
      start: "#351018",
      end: "#0D0709",
    }),
    canvas: {
      width: 1080,
      height: 1350,
      ratio: "4:5",
    },
    background: {
      type: "gradient",
      value:
        "radial-gradient(circle at 50% 20%, #541523 0%, #1A0B10 42%, #080608 82%)",
    },
    photoSlot: {
      enabled: true,
      mode: "rounded",
      shape: "rounded",
      top: "10%",
      left: "17%",
      width: "66%",
      height: "57%",
      borderRadius: "44px 44px 110px 110px",
      objectFit: "cover",
      objectPosition: "50% 50%",
      defaultObjectPosition: "50% 50%",
      zIndex: 2,
    },
    nameSlot: {
      enabled: true,
      bottom: "2.5%",
      left: "5%",
      width: "90%",
      textAlign: "center",
      fontSize: "3.9%",
      fontWeight: 700,
      color: "#FFF1F2",
    },
    textLayout: {
      align: "center",
      eyebrow: {
        text: "TOGETHER • ALWAYS",
        top: "70%",
        left: "10%",
        width: "80%",
      },
      heading: {
        top: "75%",
        left: "8%",
        width: "84%",
      },
      message: {
        top: "84%",
        left: "12%",
        width: "76%",
      },
      brand: {
        bottom: "4%",
        left: "10%",
        width: "80%",
      },
    },
    decorations: [
      {
        type: "glow",
        position: "top-left",
        color: "#FB7185",
      },
      {
        type: "glow",
        position: "bottom-right",
        color: "#BE123C",
      },
    ],
  },

  {
    id: "business-offer",
    type: "photo",
    title: "Grand Offer Poster",
    category: "Business",
    isPremium: true,
    accentColor: "#34D399",
    accentSoft: "rgba(52, 211, 153, 0.18)",
    surfaceStart: "#06241C",
    surfaceEnd: "#050908",
    defaultName: "Grand Offer",
    defaultMessage:
      "Premium quality. Special price. Limited-time offer available now.",
    thumbnail: makePremiumThumbnail({
      title: "Grand Offer",
      subtitle: "Limited Time Deal",
      accent: "#34D399",
      start: "#06291F",
      end: "#050A08",
    }),
    canvas: {
      width: 1080,
      height: 1350,
      ratio: "4:5",
    },
    background: {
      type: "gradient",
      value:
        "linear-gradient(145deg, #073629 0%, #0B1814 48%, #050807 100%)",
    },
    photoSlot: {
      enabled: true,
      mode: "rectangle",
      shape: "rectangle",
      top: "11%",
      left: "12%",
      width: "76%",
      height: "52%",
      borderRadius: "0px",
      objectFit: "cover",
      objectPosition: "50% 50%",
      defaultObjectPosition: "50% 50%",
      zIndex: 2,
    },
    nameSlot: {
      enabled: true,
      bottom: "2.5%",
      left: "9%",
      width: "82%",
      textAlign: "left",
      fontSize: "3.8%",
      fontWeight: 800,
      color: "#ECFDF5",
    },
    textLayout: {
      align: "left",
      eyebrow: {
        text: "LIMITED TIME DEAL",
        top: "68%",
        left: "9%",
        width: "82%",
      },
      heading: {
        top: "73%",
        left: "9%",
        width: "82%",
      },
      message: {
        top: "83%",
        left: "9%",
        width: "76%",
      },
      brand: {
        bottom: "4%",
        left: "9%",
        width: "82%",
      },
    },
    decorations: [
      {
        type: "glow",
        position: "top-right",
        color: "#34D399",
      },
      {
        type: "glow",
        position: "bottom-left",
        color: "#047857",
      },
    ],
  },
];

export const createBackgrounds = [
  {
    id: "create-aurora-night",
    experience: "create",
    type: "photo",
    title: "Aurora Night",
    category: "Background",
    isPremium: false,
    accentColor: "#67E8F9",
    accentSoft: "rgba(103, 232, 249, 0.18)",
    surfaceStart: "#102A43",
    surfaceEnd: "#05070D",
    canvas: { width: 1080, height: 1350, ratio: "4:5" },
    background: {
      type: "gradient",
      value:
        "radial-gradient(circle at 18% 14%, rgba(103,232,249,.36), transparent 30%), radial-gradient(circle at 84% 36%, rgba(167,139,250,.4), transparent 34%), linear-gradient(155deg, #102a43, #111827 52%, #05070d)",
    },
    photoSlot: {
      enabled: true,
      mode: "rounded",
      top: "12%",
      left: "13%",
      width: "74%",
      height: "67%",
      borderRadius: "42px",
      objectFit: "cover",
      defaultObjectPosition: "50% 50%",
      zIndex: 2,
    },
    nameSlot: {
      enabled: true,
      bottom: "4%",
      left: "7%",
      width: "86%",
      textAlign: "center",
      fontSize: "4.2%",
      fontWeight: 800,
      color: "#FFFFFF",
    },
    showDesignText: false,
  },
  {
    id: "create-sunset-glow",
    experience: "create",
    type: "photo",
    title: "Sunset Glow",
    category: "Background",
    isPremium: false,
    accentColor: "#FDBA74",
    accentSoft: "rgba(253, 186, 116, 0.18)",
    surfaceStart: "#7C2D12",
    surfaceEnd: "#1C0A0A",
    canvas: { width: 1080, height: 1350, ratio: "4:5" },
    background: {
      type: "gradient",
      value:
        "radial-gradient(circle at 72% 12%, rgba(254,215,170,.62), transparent 28%), linear-gradient(165deg, #9a3412 0%, #7c2d12 34%, #3f1015 68%, #120609 100%)",
    },
    photoSlot: {
      enabled: true,
      mode: "feather",
      feather: 66,
      top: "9%",
      left: "10%",
      width: "80%",
      height: "72%",
      objectFit: "cover",
      defaultObjectPosition: "50% 45%",
      zIndex: 2,
    },
    nameSlot: {
      enabled: true,
      bottom: "4%",
      left: "7%",
      width: "86%",
      textAlign: "left",
      fontSize: "4.2%",
      fontWeight: 800,
      color: "#FFF7ED",
    },
    showDesignText: false,
  },
  {
    id: "create-minimal-gold",
    experience: "create",
    type: "photo",
    title: "Minimal Gold",
    category: "Background",
    isPremium: false,
    accentColor: "#FDE68A",
    accentSoft: "rgba(253, 230, 138, 0.18)",
    surfaceStart: "#27210F",
    surfaceEnd: "#070707",
    canvas: { width: 1080, height: 1350, ratio: "4:5" },
    background: {
      type: "gradient",
      value:
        "radial-gradient(circle at 80% 10%, rgba(253,230,138,.25), transparent 26%), linear-gradient(145deg, #30280f, #12100b 48%, #070707)",
    },
    photoSlot: {
      enabled: true,
      mode: "circle",
      top: "14%",
      left: "17%",
      width: "66%",
      height: "52.8%",
      borderRadius: "999px",
      objectFit: "cover",
      defaultObjectPosition: "50% 42%",
      zIndex: 2,
    },
    nameSlot: {
      enabled: true,
      bottom: "7%",
      left: "7%",
      width: "86%",
      textAlign: "center",
      fontSize: "4.3%",
      fontWeight: 800,
      color: "#FEF3C7",
    },
    showDesignText: false,
  },
];

export const allUserTemplates = [
  ...sampleTemplates,
  ...createBackgrounds,
];

export const getTemplateById = (templateId) =>
  allUserTemplates.find(
    (template) => template.id === templateId,
  ) || null;
