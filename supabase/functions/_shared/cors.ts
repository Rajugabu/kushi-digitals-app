const DEFAULT_ALLOWED_HEADERS =
  "authorization, x-client-info, apikey, content-type";

function getAllowedOrigins() {
  return (Deno.env.get("STUDIO_ALLOWED_ORIGINS") || "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function isOriginAllowed(request: Request) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = getAllowedOrigins();

  return (
    !origin ||
    allowedOrigins.includes("*") ||
    allowedOrigins.includes(origin)
  );
}

export function getCorsHeaders(request: Request) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = getAllowedOrigins();
  const allowOrigin = allowedOrigins.includes("*")
    ? "*"
    : origin && allowedOrigins.includes(origin)
      ? origin
      : allowedOrigins[0] || "null";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": DEFAULT_ALLOWED_HEADERS,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
