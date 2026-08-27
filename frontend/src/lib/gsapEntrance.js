/**
 * Sitewide CMS entrances are `from { autoAlpha: 0, y }`.
 *
 * GSAP 3.11+ ScrollTrigger defaults `lazy: true`. A delayed `from()` (we boot
 * after LCP) then samples the already-painted opacity:1 as the destination and
 * never applies the hidden start — only the slide plays. Force fromTo with an
 * explicit 0→1 alpha, immediateRender, and lazy:false.
 *
 * Hero copy used to strip autoAlpha for LCP. GsapRuntimeGate already waits for
 * LCP, so that strip now causes the same “shift with no fade” on the hero.
 */

const AXIS_KEYS = ["x", "y", "xPercent", "yPercent"];

function cloneVars(vars) {
  if (!vars || typeof vars !== "object" || Array.isArray(vars)) return {};
  return { ...vars };
}

function stripHideProps(vars) {
  if (!vars || typeof vars !== "object" || Array.isArray(vars)) return vars;
  const next = { ...vars };
  delete next.autoAlpha;
  delete next.opacity;
  delete next.visibility;
  return next;
}

function isHiddenStart(vars) {
  if (!vars || typeof vars !== "object") return false;
  if (Number(vars.autoAlpha) === 0) return true;
  if (Number(vars.opacity) === 0) return true;
  return String(vars.visibility || "").toLowerCase() === "hidden";
}

function restFromOffset(from) {
  const to = {};
  for (const key of AXIS_KEYS) {
    if (from[key] != null && from[key] !== "") to[key] = 0;
  }
  return to;
}

function coerceHiddenFrom(from) {
  const next = cloneVars(from);
  delete next.opacity;
  next.autoAlpha = 0;
  return next;
}

function coerceVisibleTo(from, to) {
  const next = {
    ...restFromOffset(from),
    ...cloneVars(to),
  };
  delete next.opacity;
  if (next.autoAlpha == null) next.autoAlpha = 1;
  return next;
}

function inViewEntranceExtra(extra = {}) {
  return {
    ...extra,
    immediateRender: extra.immediateRender !== false,
    lazy: false,
  };
}

/**
 * @param {{
 *   method?: string,
 *   from?: object,
 *   to?: object,
 *   hideProtected?: boolean,
 *   extra?: object,
 * }} [opts]
 * @returns {{ method: string, fromVars: object, toVars: object, extra: object }}
 */
function normalizeEntranceTween({
  method = "from",
  from,
  to,
  hideProtected = false,
  extra = {},
} = {}) {
  const fromVars = hideProtected ? stripHideProps(cloneVars(from)) : cloneVars(from);
  const toVars = hideProtected ? stripHideProps(cloneVars(to)) : cloneVars(to);
  const extraOut = { ...extra };
  const resolvedMethod = method || "from";

  const shouldHarden =
    !hideProtected &&
    isHiddenStart(fromVars) &&
    (resolvedMethod === "from" || resolvedMethod === "fromTo");

  if (shouldHarden) {
    return {
      method: "fromTo",
      fromVars: coerceHiddenFrom(fromVars),
      toVars: coerceVisibleTo(fromVars, toVars),
      extra: inViewEntranceExtra(extraOut),
    };
  }

  return {
    method: resolvedMethod,
    fromVars,
    toVars,
    extra: extraOut,
  };
}

module.exports = {
  coerceHiddenFrom,
  coerceVisibleTo,
  inViewEntranceExtra,
  isHiddenStart,
  normalizeEntranceTween,
  stripHideProps,
};
