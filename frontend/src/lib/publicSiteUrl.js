const PRODUCTION_ORIGIN = "https://kevinpopkefoundation.org";

/** CMS hostname. Vercel terminates SSL; middleware sends it to WordPress. */
const ADMIN_CMS_HOST = "admin.kevinpopkefoundation.org";
const WORDPRESS_CMS_ORIGIN = "https://kpf.dreamhosters.com";

/** Production Vercel alias — 301 onto the custom domain. Preview hosts stay as-is. */
const VERCEL_PRODUCTION_HOSTS = Object.freeze(["kpf-site.vercel.app"]);

function publicSiteOrigin() {
  const fromEnv = String(process.env.NEXT_PUBLIC_SITE_URL || "").replace(
    /\/$/,
    ""
  );
  if (fromEnv && !isEphemeralUrl(fromEnv)) {
    return fromEnv;
  }
  return PRODUCTION_ORIGIN;
}

function isVercelProductionAlias(host) {
  const name = String(host || "")
    .toLowerCase()
    .split(":")[0];
  return VERCEL_PRODUCTION_HOSTS.includes(name);
}

function isAdminCmsHost(host) {
  const name = String(host || "")
    .toLowerCase()
    .split(":")[0];
  return name === ADMIN_CMS_HOST;
}

function adminCmsDestination(pathname, search = "") {
  const path = pathname === "/" || pathname === "" ? "/wp-admin/" : pathname;
  return `${WORDPRESS_CMS_ORIGIN}${path}${search || ""}`;
}

function isEphemeralHost(host) {
  const name = String(host || "").toLowerCase();
  if (!name || name === "localhost" || name === "127.0.0.1") return true;
  return name === "vercel.app" || name.endsWith(".vercel.app");
}

function isEphemeralUrl(url) {
  try {
    return isEphemeralHost(new URL(url, PRODUCTION_ORIGIN).hostname);
  } catch {
    return true;
  }
}

function toPublicUrl(url) {
  if (!url || typeof url !== "string") return url;
  try {
    const parsed = new URL(url, publicSiteOrigin());
    if (!isEphemeralHost(parsed.hostname)) {
      return url;
    }
    return `${publicSiteOrigin()}${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return url;
  }
}

function rewriteEphemeralHostsInText(text) {
  if (!text || typeof text !== "string") return text;
  const origin = publicSiteOrigin();
  return text.replace(
    /https?:\/\/(?:localhost(?::\d+)?|127\.0\.0\.1(?::\d+)?|[a-z0-9.-]*vercel\.app)/gi,
    origin
  );
}

function rewriteSeoPublicUrls(seo) {
  if (!seo || typeof seo !== "object") return seo;
  const next = { ...seo };
  if (next.canonical) next.canonical = toPublicUrl(next.canonical);
  if (next.openGraph?.url) {
    next.openGraph = { ...next.openGraph, url: toPublicUrl(next.openGraph.url) };
  }
  if (Array.isArray(next.breadcrumbs)) {
    next.breadcrumbs = next.breadcrumbs.map((crumb) =>
      crumb?.url ? { ...crumb, url: toPublicUrl(crumb.url) } : crumb
    );
  }
  if (Array.isArray(next.customMeta)) {
    next.customMeta = next.customMeta.map((tag) =>
      tag?.href ? { ...tag, href: toPublicUrl(tag.href) } : tag
    );
  }
  if (typeof next.schemaJson === "string") {
    next.schemaJson = rewriteEphemeralHostsInText(next.schemaJson);
  }
  return next;
}

module.exports = {
  ADMIN_CMS_HOST,
  PRODUCTION_ORIGIN,
  VERCEL_PRODUCTION_HOSTS,
  WORDPRESS_CMS_ORIGIN,
  adminCmsDestination,
  isAdminCmsHost,
  isEphemeralHost,
  isEphemeralUrl,
  isVercelProductionAlias,
  publicSiteOrigin,
  rewriteEphemeralHostsInText,
  rewriteSeoPublicUrls,
  toPublicUrl,
};
