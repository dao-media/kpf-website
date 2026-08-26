const SMOOTHER_KEY = "__kpfScrollSmoother";

function getScrollSmoother() {
  if (typeof window === "undefined") return null;
  return window[SMOOTHER_KEY] || null;
}

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
 * Pathname without query/hash, trailing slash stripped.
 * @param {string|null|undefined} path
 * @returns {string}
 */
function normalizePathname(path) {
  let next = String(path || "/").split(/[?#]/)[0] || "/";
  if (next.length > 1 && next.endsWith("/")) next = next.slice(0, -1);
  return next || "/";
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
  const smoother = getScrollSmoother();

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
 * Hash for a same-document in-page link, or null.
 * Treats `#programs`, `/#programs`, and same-path `/about/#grantees` as in-page.
 *
 * @param {string|null|undefined} href
 * @param {string|null|undefined} [currentPath]
 * @returns {string|null} e.g. `#programs`
 */
function sameDocumentHash(href, currentPath) {
  if (!href || typeof href !== "string") return null;
  const raw = href.trim();
  if (!raw || raw === "#") return null;
  if (raw.startsWith("#") && raw.length > 1) return raw;

  let parsed;
  try {
    const base =
      typeof window !== "undefined" && window.location?.href
        ? window.location.href
        : "https://kpf.local/";
    parsed = new URL(raw, base);
  } catch {
    return null;
  }

  if (!parsed.hash || parsed.hash.length < 2) return null;

  if (typeof window !== "undefined" && window.location?.origin) {
    if (parsed.origin !== window.location.origin) return null;
  }

  const here = normalizePathname(
    currentPath ??
      (typeof window !== "undefined" ? window.location.pathname : parsed.pathname)
  );
  if (normalizePathname(parsed.pathname) !== here) return null;
  return parsed.hash;
}

/**
 * Same-document hash link? (`#comments`, `/#programs` on `/`, not `/about/#x` on `/`)
 * @param {string|null|undefined} href
 * @param {string|null|undefined} [currentPath]
 * @returns {boolean}
 */
function isSameDocumentHash(href, currentPath) {
  return Boolean(sameDocumentHash(href, currentPath));
}

module.exports = {
  getStickyOffsetPx,
  isSameDocumentHash,
  normalizePathname,
  resolveScrollElement,
  sameDocumentHash,
  scrollToTarget,
};
