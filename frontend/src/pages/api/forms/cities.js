export default async function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      code: "method_not_allowed",
      message: "Use GET to look up city suggestions.",
    });
  }

  const wordpressUrl = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(
    /\/$/,
    "",
  );
  if (!wordpressUrl) {
    return res.status(503).json({
      code: "wordpress_unavailable",
      message: "City suggestions are temporarily unavailable.",
      cities: [],
    });
  }

  const q = typeof req.query.q === "string" ? req.query.q : "";
  try {
    const response = await fetch(
      `${wordpressUrl}/wp-json/kpf-forms/v1/cities?q=${encodeURIComponent(q)}`,
      { headers: { Accept: "application/json" } },
    );
    const payload = await response.json().catch(() => ({ cities: [] }));
    return res.status(response.ok ? 200 : response.status).json({
      cities: payload.cities || [],
    });
  } catch {
    return res.status(502).json({
      code: "cities_unavailable",
      message: "City suggestions are temporarily unavailable.",
      cities: [],
    });
  }
}
