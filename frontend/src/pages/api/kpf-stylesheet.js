const {
  EMPTY_OVERLAY_CSS,
  publicOverlayCss,
} = require("@/lib/globalStylesheet");

const wordpressUrl = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(
  /\/$/,
  "",
);

const GRAPHQL_QUERY = "query KpfPublicStylesheet { kpfStylesheet }";

function sendCss(res, req, css) {
  const body = String(css || "").trim() ? css : EMPTY_OVERLAY_CSS;
  res.setHeader("Content-Type", "text/css; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
  if (req.method === "HEAD") {
    return res.status(200).end();
  }
  return res.status(200).send(body);
}

/**
 * WP REST already returns the public overlay (possibly empty). Empty 200 is
 * authoritative — do not fall through to the megabyte GraphQL payload.
 * @returns {Promise<string|null>} overlay CSS, "" for none, null to try GraphQL
 */
async function fetchFromRest() {
  const response = await fetch(`${wordpressUrl}/wp-json/kpf-stylesheet/v1/public`, {
    headers: { Accept: "text/css, text/plain, */*" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return null;
  const type = String(response.headers.get("content-type") || "");
  if (type.includes("application/json")) return null;
  const text = await response.text();
  if (!text.trim()) return "";
  return publicOverlayCss(text);
}

async function fetchFromGraphQL() {
  const response = await fetch(`${wordpressUrl}/graphql`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: GRAPHQL_QUERY }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return null;
  const payload = await response.json();
  return publicOverlayCss(payload?.data?.kpfStylesheet || "");
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    return res.status(405).end();
  }

  if (!wordpressUrl) {
    return sendCss(res, req, EMPTY_OVERLAY_CSS);
  }

  try {
    const rest = await fetchFromRest();
    const css = rest !== null ? rest : (await fetchFromGraphQL()) || "";
    return sendCss(res, req, css);
  } catch {
    return sendCss(res, req, EMPTY_OVERLAY_CSS);
  }
}
