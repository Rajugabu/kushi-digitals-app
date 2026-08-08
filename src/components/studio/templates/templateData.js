const makePremiumThumbnail = (title, accent = "#D4AF37") => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0A0A0A" />
          <stop offset="55%" stop-color="#1C1710" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
      </defs>
      <rect width="800" height="1000" fill="url(#bg)" />
      <circle cx="640" cy="170" r="190" fill="${accent}" opacity="0.20" />
      <circle cx="170" cy="860" r="250" fill="${accent}" opacity="0.12" />
      <rect x="80" y="120" width="640" height="540" rx="28" fill="#FFFFFF" opacity="0.10" />
      <text x="400" y="760" text-anchor="middle" fill="#FFFFFF"
        font-family="Arial, sans-serif" font-size="42" font-weight="bold">
        ${title}
      </text>
      <text x="400" y="815" text-anchor="middle" fill="${accent}"
        font-family="Arial, sans-serif" font-size="20" letter-spacing="4">
        KUSHI AI STUDIO
      </text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const sampleTemplates = [
  {
    id: "good-morning-gold",
    title: "Golden Good Morning",
    category: "Good Morning",
    isPremium: false,
    thumbnail: makePremiumThumbnail("Good Morning", "#D4AF37"),
  },
  {
    id: "devotional-divine",
    title: "Divine Blessings",
    category: "Devotional",
    isPremium: true,
    thumbnail: makePremiumThumbnail("Divine Blessings", "#F59E0B"),
  },
  {
    id: "birthday-luxury",
    title: "Luxury Birthday",
    category: "Birthday",
    isPremium: true,
    thumbnail: makePremiumThumbnail("Happy Birthday", "#E879F9"),
  },
  {
    id: "motivation-rise",
    title: "Rise & Shine",
    category: "Motivation",
    isPremium: false,
    thumbnail: makePremiumThumbnail("Rise & Shine", "#60A5FA"),
  },
  {
    id: "love-elegance",
    title: "Forever Love",
    category: "Love",
    isPremium: true,
    thumbnail: makePremiumThumbnail("Forever Love", "#FB7185"),
  },
  {
    id: "business-offer",
    title: "Grand Offer Poster",
    category: "Business",
    isPremium: true,
    thumbnail: makePremiumThumbnail("Grand Offer", "#34D399"),
  },
];