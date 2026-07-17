import { escapeXml, fetchSeoPublic } from "@/lib/wordpressPublic";

export default async function handler(req, res) {
  try {
    const data = await fetchSeoPublic("/public/sitemap");
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${(data.sitemaps || [])
  .map(
    (entry) => `  <sitemap>
    <loc>${escapeXml(entry.loc)}</loc>
    ${entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : ""}
  </sitemap>`
  )
  .join("\n")}
</sitemapindex>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).send(body);
  } catch (error) {
    res.status(500).send("Unable to generate sitemap index");
  }
}
