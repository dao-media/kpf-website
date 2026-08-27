const { PRODUCTION_ORIGIN } = require("./publicSiteUrl");

/** Crawlers must always get a valid file, even when WordPress is slow. */
const ROBOTS_CACHE_CONTROL =
  "public, max-age=600, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=86400";

const ALLOWED_LINE =
  /^\s*(?:#.*|user-agent:|allow:|disallow:|sitemap:|crawl-delay:|host:|$)/i;

function fallbackRobotsTxt(origin = PRODUCTION_ORIGIN) {
  const site = String(origin || PRODUCTION_ORIGIN).replace(/\/$/, "");
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${site}/sitemap.xml`,
    "",
  ].join("\n");
}

/**
 * Keep Google-legal robots.txt lines only. Drop BOM, unknown directives, and
 * oversized bodies so a CMS extra rule cannot invalidate the whole file.
 */
function sanitizeRobotsTxt(raw, origin = PRODUCTION_ORIGIN) {
  const text = String(raw || "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const lines = text.split("\n").filter((line) => ALLOWED_LINE.test(line));
  let body = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (body.length > 500 * 1024) {
    body = body.slice(0, 500 * 1024);
  }
  if (!/^user-agent:/im.test(body) || !/^(allow|disallow):/im.test(body)) {
    return fallbackRobotsTxt(origin);
  }
  if (!/^sitemap:/im.test(body)) {
    const site = String(origin || PRODUCTION_ORIGIN).replace(/\/$/, "");
    body = `${body}\n\nSitemap: ${site}/sitemap.xml`;
  }
  return `${body}\n`;
}

function applyRobotsHeaders(res) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", ROBOTS_CACHE_CONTROL);
  res.setHeader("CDN-Cache-Control", ROBOTS_CACHE_CONTROL);
  res.setHeader("Vercel-CDN-Cache-Control", ROBOTS_CACHE_CONTROL);
  res.setHeader("X-Content-Type-Options", "nosniff");
}

module.exports = {
  ROBOTS_CACHE_CONTROL,
  applyRobotsHeaders,
  fallbackRobotsTxt,
  sanitizeRobotsTxt,
};
