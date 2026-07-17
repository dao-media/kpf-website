import { escapeXml, fetchSeoPublic } from "@/lib/wordpressPublic";

export default async function handler(req, res) {
  const { type, page } = req.query;

  try {
    const data = await fetchSeoPublic(
      `/public/sitemap/${encodeURIComponent(type)}/${encodeURIComponent(page)}`
    );

    const urls = (data.urls || [])
      .map((entry) => {
        const images = (entry.images || [])
          .map(
            (image) => `    <image:image>
      <image:loc>${escapeXml(image)}</image:loc>
    </image:image>`
          )
          .join("\n");

        return `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    ${entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : ""}
${images}
  </url>`;
      })
      .join("\n");

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).send(body);
  } catch (error) {
    res.status(500).send("Unable to generate sitemap page");
  }
}
