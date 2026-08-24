const { withoutPagesLayer } = require("@/lib/globalStylesheet");

const wordpressUrl = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(
  /\/$/,
  "",
);

const GRAPHQL_QUERY = "query KpfPublicStylesheet { kpfStylesheet }";

async function fetchFromRest() {
  const response = await fetch(`${wordpressUrl}/wp-json/kpf-stylesheet/v1/public`, {
    headers: { Accept: "text/css, text/plain, */*" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return null;
  const type = String(response.headers.get("content-type") || "");
  if (type.includes("application/json")) return null;
  const css = withoutPagesLayer(await response.text());
  return css || null;
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
  return withoutPagesLayer(payload?.data?.kpfStylesheet || "");
}

export default async function handler(req, res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).end();
  }

  if (!wordpressUrl) {
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    return res.status(204).end();
  }

  try {
    const css = (await fetchFromRest()) || (await fetchFromGraphQL()) || "";
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    if (!css) {
      return res.status(204).end();
    }
    if (req.method === "HEAD") {
      return res.status(200).end();
    }
    return res.status(200).send(css);
  } catch {
    res.setHeader("Content-Type", "text/css; charset=utf-8");
    return res.status(204).end();
  }
}
