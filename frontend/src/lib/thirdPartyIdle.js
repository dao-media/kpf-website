/**
 * Choose GTM xor gtag. Dual load is two long GTM tasks in PageSpeed.
 * The official IIFE lives in pages/_document.js so Tag Assistant sees it;
 * gtm.js itself waits until LCP so it does not contend with the hero paint.
 */

const GTM_FALLBACK_MS = 8000;
/** Wait after the last LCP candidate so gtm.js does not contend with hero paint. */
const GTM_LCP_SETTLE_MS = 500;
/** Idle timeout after LCP settles; interaction still loads GTM immediately. */
const GTM_IDLE_TIMEOUT_MS = 2000;
/** GSAP in-view/load can wait on LCP; hover cannot use the GTM 8s cap. */
const GSAP_FALLBACK_MS = 1200;
/** Hover/click GSAP binds soon, but not on the first-paint / LCP path. */
const GSAP_INTERACTIVE_IDLE_MS = 400;
const HOVER_GSAP_MQ = "(hover: hover) and (pointer: fine)";

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

function sanitizeGtmId(gtmId) {
  const id = String(gtmId || "").trim();
  return /^GTM-[A-Z0-9]+$/i.test(id) ? id : "";
}

/**
 * Official GTM snippet for _document. Pushes gtm.start immediately (Tag Assistant
 * greps this) but inserts gtm.js after LCP settles + idle (8s cap) so Slow 4G
 * LCP is not competing with ~280 KiB of tag-manager JS. The first LCP entry is
 * often an early candidate; loading on that callback races the real hero paint.
 * @param {string} gtmId
 */
function gtmBootstrapScript(gtmId) {
  const id = sanitizeGtmId(gtmId);
  if (!id) return "";
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var n=0,t;function g(){if(n)return;n=1;if(t)clearTimeout(t);var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);}function idle(){if(n)return;if(w.requestIdleCallback)w.requestIdleCallback(g,{timeout:${GTM_IDLE_TIMEOUT_MS}});else setTimeout(g,200);}function later(){if(n)return;clearTimeout(t);t=setTimeout(idle,${GTM_LCP_SETTLE_MS});}try{if(w.PerformanceObserver){var o=new PerformanceObserver(later);o.observe({type:'largest-contentful-paint',buffered:true});}}catch(e){}w.addEventListener('pointerdown',g,{once:true});w.addEventListener('keydown',g,{once:true});setTimeout(g,${GTM_FALLBACK_MS});})(window,document,'script','dataLayer','${id}');`;
}

/**
 * Badge / CMS hover GSAP is desktop-only. Phones still get in-view after LCP.
 * @param {(query: string) => { matches: boolean }} [media]
 */
function canBindHoverGsap(media) {
  const matchMedia =
    typeof media === "function"
      ? media
      : typeof globalThis.matchMedia === "function"
        ? globalThis.matchMedia.bind(globalThis)
        : null;
  if (!matchMedia) return true;
  try {
    return Boolean(matchMedia(HOVER_GSAP_MQ).matches);
  } catch {
    return true;
  }
}

/**
 * Run after LCP (or a short fallback) so GSAP does not steal the LCP window.
 * @param {() => void} callback
 * @param {number} [timeoutMs]
 */
function scheduleAfterLcp(callback, timeoutMs) {
  const timeout = Number.isFinite(timeoutMs) ? timeoutMs : GSAP_FALLBACK_MS;
  if (typeof callback !== "function") return function noop() {};
  let done = false;
  const listeners = [];
  function run() {
    if (done) return;
    done = true;
    listeners.forEach(([target, type, fn]) => target.removeEventListener(type, fn));
    callback();
  }
  let observer;
  try {
    if (typeof PerformanceObserver === "function") {
      observer = new PerformanceObserver(function () {
        run();
      });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
    } else {
      run();
      return function cancel() {
        done = true;
      };
    }
  } catch {
    run();
    return function cancel() {
      done = true;
    };
  }
  if (typeof window !== "undefined") {
    ["pointerdown", "keydown"].forEach((type) => {
      window.addEventListener(type, run, { once: true });
      listeners.push([window, type, run]);
    });
  }
  const timer = setTimeout(run, timeout);
  return function cancel() {
    done = true;
    clearTimeout(timer);
    listeners.forEach(([target, type, fn]) => target.removeEventListener(type, fn));
    if (observer) observer.disconnect();
  };
}

/**
 * Run on idle (or a short timeout) so hover GSAP is not competing with LCP.
 * Still well under the GTM 8s cap — badge swing must not wait for gtm.js.
 * @param {() => void} callback
 * @param {number} [timeoutMs]
 */
function scheduleIdle(callback, timeoutMs) {
  const timeout = Number.isFinite(timeoutMs) ? timeoutMs : GSAP_INTERACTIVE_IDLE_MS;
  if (typeof callback !== "function") return function noop() {};
  let done = false;
  function run() {
    if (done) return;
    done = true;
    callback();
  }
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(run, { timeout });
    return function cancel() {
      done = true;
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(id);
    };
  }
  const timer = setTimeout(run, timeout);
  return function cancel() {
    done = true;
    clearTimeout(timer);
  };
}

module.exports = {
  GTM_FALLBACK_MS,
  GTM_IDLE_TIMEOUT_MS,
  GTM_LCP_SETTLE_MS,
  GSAP_FALLBACK_MS,
  GSAP_INTERACTIVE_IDLE_MS,
  HOVER_GSAP_MQ,
  analyticsScriptsToLoad,
  canBindHoverGsap,
  gtmBootstrapScript,
  isGoogleTagSrc,
  isGtagSrc,
  isGtmContainerSrc,
  sanitizeGtmId,
  scheduleAfterLcp,
  scheduleIdle,
  shouldSkipSnippetAnalyticsSrc,
};
