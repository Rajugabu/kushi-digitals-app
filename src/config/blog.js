export const BLOG_SITE_URL = "https://kushidigitals.com";
export const BLOG_PAGE_SIZE = 9;
export const ADMIN_BLOG_PAGE_SIZE = 10;
export const BLOG_IMAGE_BUCKET = "blog-images";
export const BLOG_MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const BLOG_ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export const BLOG_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export const slugify = (value = "") => {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 90)
    .replace(/-+$/g, "");

  if (!slug) {
    return "";
  }

  return /^\d+$/.test(slug)
    ? `article-${slug}`
    : slug;
};

export const isValidBlogSlug = (value = "") =>
  /^(?!\d+$)[a-z0-9]+(?:-[a-z0-9]+)*$/.test(
    value,
  );

export const calculateReadingTime = (
  content = "",
) => {
  const words = content
    .replace(/[`#>*_[\]()!-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 220));
};

export const formatBlogDate = (
  value,
  includeTime = false,
) => {
  if (!value) {
    return "Not scheduled";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  }).format(date);
};

export const getBlogCanonicalUrl = (slug) =>
  `${BLOG_SITE_URL}/blog/${slug}`;

export const isSafeUrl = (
  value,
  { allowRelative = true } = {},
) => {
  if (!value) {
    return false;
  }

  if (
    allowRelative &&
    (value.startsWith("/") ||
      value.startsWith("#"))
  ) {
    return !value.startsWith("//");
  }

  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(
      url.protocol,
    );
  } catch {
    return false;
  }
};

export const normalizeTags = (value) => {
  const values = Array.isArray(value)
    ? value
    : String(value || "").split(",");

  return [
    ...new Set(
      values
        .map((tag) => tag.trim())
        .filter(Boolean)
        .map((tag) => tag.slice(0, 40)),
    ),
  ].slice(0, 12);
};
