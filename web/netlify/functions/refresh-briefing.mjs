/**
 * Legacy refresh bridge — disabled (manual publish + GitHub Pages only).
 * Kept so an accidental Netlify deploy cannot re-arm repository_dispatch.
 */
const ALLOWED_ORIGINS = [
  "https://linshanova-ops.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function corsHeaders(origin) {
  const allow =
    origin && ALLOWED_ORIGINS.some((o) => origin === o || origin.startsWith(o))
      ? origin
      : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
  };
}

export async function handler(event) {
  const origin = event.headers?.origin || event.headers?.Origin || "";
  const headers = corsHeaders(origin);

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  return {
    statusCode: 410,
    headers,
    body: JSON.stringify({
      ok: false,
      status: "gone",
      message:
        "Refresh API disabled. Public site is GitHub Pages; briefings publish manually. Disconnect this Netlify site to stop credit use.",
    }),
  };
}
