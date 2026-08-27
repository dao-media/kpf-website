const { SCRAPBOOK_TILE_FIELDS } = require("../../lib/scrapbookTiles");

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=60");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ tiles: [], total: 0 });
  }

  const wordpressUrl = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(
    /\/$/,
    "",
  );
  if (!wordpressUrl) {
    return res.status(503).json({ tiles: [], total: 0 });
  }

  const first = clampInt(req.query.first, 12, 1, 48);
  const offset = clampInt(req.query.offset, 0, 0, 2000);

  try {
    const response = await fetch(`${wordpressUrl}/graphql`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query KpfScrapbookTilesPage($first: Int, $offset: Int) {
            kpfScrapbookTilesCount
            kpfScrapbookTiles(first: $first, offset: $offset) {
              ${SCRAPBOOK_TILE_FIELDS}
            }
          }
        `,
        variables: { first, offset },
      }),
      signal: AbortSignal.timeout(8000),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.errors?.length) {
      return res.status(502).json({ tiles: [], total: 0 });
    }
    return res.status(200).json({
      tiles: payload?.data?.kpfScrapbookTiles || [],
      total: Number(payload?.data?.kpfScrapbookTilesCount) || 0,
    });
  } catch {
    return res.status(502).json({ tiles: [], total: 0 });
  }
}
