/**
 * Defer GTM/gtag until after first paint, then idle or first input.
 * dataLayer events queued before then still flush when the container loads.
 */

const INTERACTION_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"];

function isGtmContainerSrc(src) {
  return /googletagmanager\.com\/gtm\.js/i.test(String(src || ""));
}

function isGtagSrc(src) {
  return /googletagmanager\.com\/gtag\/js/i.test(String(src || ""));
}

function isGoogleTagSrc(src) {
  return isGtmContainerSrc(src) || isGtagSrc(src);
}

/**
 * Load GTM xor gtag. Dual load is what PageSpeed lists as two long GTM tasks.
 * @param {string} gtmId
 * @param {string} gaId
 */
function analyticsScriptsToLoad(gtmId, gaId) {
  const gtm = String(gtmId || "").trim();
  const ga = String(gaId || "").trim();
  if (gtm) return { gtm, ga: "" };
  if (ga) return { gtm: "", ga };
  return { gtm: "", ga: "" };
}

/**
 * Skip WP Code GTM/gtag tags when Faust already injects the same vendors.
 * @param {string} src
 * @param {string} gtmId
 * @param {string} gaId
 */
function shouldSkipSnippetAnalyticsSrc(src, gtmId, gaId) {
  const { gtm, ga } = analyticsScriptsToLoad(gtmId, gaId);
  if (gtm && isGoogleTagSrc(src)) return true;
  if (ga && isGtagSrc(src)) return true;
  return false;
}

module.exports = {
  INTERACTION_EVENTS,
  analyticsScriptsToLoad,
  isGoogleTagSrc,
  isGtagSrc,
  isGtmContainerSrc,
  shouldSkipSnippetAnalyticsSrc,
};
