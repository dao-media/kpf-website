const { ScrollSmoother } = require("gsap/ScrollSmoother");

/**
 * Sticky header clearance for in-page scroll targets.
 * @returns {number}
 */
function getStickyOffsetPx() {
  if (typeof document === "undefined") return 96;
  const bar = document.querySelector(".kpf-site-chrome__header-bar");
  if (bar) {
    return Math.max(72, Math.round(bar.getBoundingClientRect().bottom) + 12);
  }
  return 96;
}

/**
 * @param {string|Element|null|undefined} target
 * @returns {Element|null}
 */
function resolveScrollElement(target) {
  if (!target || typeof document === "undefined") return null;
  if (typeof target !== "string") return target;
  const raw = target.trim();
  if (!raw || raw === "#") return null;
  const id = raw.startsWith("#") ? decodeURIComponent(raw.slice(1)) : raw;
  if (!id) return null;
  return document.getElementById(id);
}

/**
 * Scroll to an element or hash without breaking GSAP ScrollSmoother.
 * Native hash / scrollIntoView fights the smoother and leaves huge empty space.
 *
 * @param {string|Element|null|undefined} target
 * @param {{ smooth?: boolean, updateHash?: boolean }} [options]
 * @returns {boolean}
 */
function scrollToTarget(target, options = {}) {
  if (typeof window === "undefined") return false;
  const { smooth = true, updateHash = true } = options;
  const el = resolveScrollElement(target);
  if (!el) return false;

  const offset = getStickyOffsetPx();
  const smoother = ScrollSmoother.get();

  if (smoother) {
    // Position string keeps the target below the floating header.
    smoother.scrollTo(el, Boolean(smooth), `top ${offset}px`);
  } else {
    const top = window.scrollY + el.getBoundingClientRect().top - offset;
    window.scrollTo({
      top: Math.max(0, top),
      behavior: smooth ? "smooth" : "auto",
    });
  }

  if (updateHash && el.id && window.history?.replaceState) {
    const next = `${window.location.pathname}${window.location.search}#${el.id}`;
    window.history.replaceState(null, "", next);
  }

  return true;
}

/**
 * Same-document hash link? (e.g. href="#comments")
 * @param {string|null|undefined} href
 * @returns {boolean}
 */
function isSameDocumentHash(href) {
  if (!href || typeof href !== "string") return false;
  return href.startsWith("#") && href.length > 1;
}

module.exports = {
  getStickyOffsetPx,
  isSameDocumentHash,
  resolveScrollElement,
  scrollToTarget,
};
