/**
 * Choose GTM xor gtag. Dual load is two long GTM tasks in PageSpeed.
 * The official IIFE lives in pages/_document.js so Tag Assistant sees it;
 * gtm.js itself waits until LCP so it does not contend with the hero paint.
 */

const GTM_FALLBACK_MS = 8000;
/** GSAP in-view/load can wait on LCP; hover cannot use the GTM 8s cap. */
const GSAP_FALLBACK_MS = 1200;
/** Hover/click GSAP binds soon, but not on the first-paint / LCP path. */
const GSAP_INTERACTIVE_IDLE_MS = 400;

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
 * greps this) but inserts gtm.js after LCP (8s cap) so Slow 4G LCP is not
 * competing with ~280 KiB of tag-manager JS.
 * @param {string} gtmId
 */
function gtmBootstrapScript(gtmId) {
  const id = sanitizeGtmId(gtmId);
  if (!id) return "";
  return `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var n=0;function g(){if(n)return;n=1;var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);}try{if(w.PerformanceObserver){var o=new PerformanceObserver(function(){g();});o.observe({type:'largest-contentful-paint',buffered:true});}}catch(e){}w.addEventListener('pointerdown',g,{once:true});w.addEventListener('keydown',g,{once:true});setTimeout(g,${GTM_FALLBACK_MS});})(window,document,'script','dataLayer','${id}');`;
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
  GSAP_FALLBACK_MS,
  GSAP_INTERACTIVE_IDLE_MS,
  analyticsScriptsToLoad,
  gtmBootstrapScript,
  isGoogleTagSrc,
  isGtagSrc,
  isGtmContainerSrc,
  sanitizeGtmId,
  scheduleAfterLcp,
  scheduleIdle,
  shouldSkipSnippetAnalyticsSrc,
};
