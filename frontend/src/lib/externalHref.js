const {
  PRODUCTION_ORIGIN,
  WORDPRESS_CMS_ORIGIN,
} = require("./publicSiteUrl");

function hostnameKey(host) {
  return String(host || "")
    .toLowerCase()
    .split(":")[0]
    .replace(/^www\./, "");
}

function originHost(origin) {
  try {
    return hostnameKey(new URL(origin).hostname);
  } catch {
    return "";
  }
}

const SITE_HOST = originHost(PRODUCTION_ORIGIN);
const CMS_HOST = originHost(WORDPRESS_CMS_ORIGIN);
const ADMIN_HOST = "admin.kevinpopkefoundation.org";

/**
 * True for http(s) URLs that leave the Foundation site (not PayPal-or-not —
 * any third-party origin). Relative, mailto, tel, and same-site hosts are false.
 * @param {string} href
 * @param {string} [currentOrigin]
 * @returns {boolean}
 */
function isOffsiteHttpHref(href, currentOrigin) {
  const value = String(href || "").trim();
  if (!/^https?:\/\//i.test(value)) return false;

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }

  const host = hostnameKey(parsed.hostname);
  if (!host) return false;

  const here =
    currentOrigin ||
    (typeof window !== "undefined" && window.location
      ? window.location.origin
      : PRODUCTION_ORIGIN);
  const currentHost = originHost(here);

  if (host === currentHost) return false;
  if (host === SITE_HOST) return false;
  if (host === CMS_HOST) return false;
  if (host === ADMIN_HOST) return false;
  return true;
}

function hrefFromExitTarget(el) {
  if (!(el instanceof Element)) return "";
  return (
    el.getAttribute("href") ||
    el.getAttribute("data-kpf-href") ||
    ""
  );
}

module.exports = {
  hrefFromExitTarget,
  isOffsiteHttpHref,
};
