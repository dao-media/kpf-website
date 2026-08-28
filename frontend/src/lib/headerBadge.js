export const HEADER_BADGE_SELECTOR = "[data-kpf-badge], .kpf-header__badge";

export function isHeaderBadgeNode(node) {
  return Boolean(
    node &&
      typeof node.matches === "function" &&
      (node.matches(HEADER_BADGE_SELECTOR) || node.closest?.(HEADER_BADGE_SELECTOR)),
  );
}

/**
 * Keep the anniversary mark visible and resting. CMS hover/scroll tweens and
 * SPA `gsap.context().revert()` were restoring the entrance's autoAlpha:0
 * (and sometimes y: -140). Rotation is left alone unless `resetSwing` is set.
 *
 * Pass `gsap` when the motion runtime is already loaded so tweens are
 * killed. Reduced-motion / chrome-without-GSAP only clears CSS visibility.
 *
 * @param {{
 *   resetY?: boolean,
 *   resetSwing?: boolean,
 *   gsap?: { killTweensOf: Function, set: Function },
 * }} [opts]
 */
export function restoreHeaderBadge({
  resetY = true,
  resetSwing = false,
  gsap = null,
} = {}) {
  if (typeof document === "undefined") return;
  const dropPlaying = !document.documentElement.classList.contains("kpf-nav-entered");
  const applyY = resetY && !dropPlaying;
  document.querySelectorAll(HEADER_BADGE_SELECTOR).forEach((badge) => {
    // If GSAP is about to own the badge, kill the CSS drop so a mid-flight
    // translateY is not baked into the GSAP transform matrix (looks like the
    // badge jumped halfway off the page on hover).
    if (gsap && applyY) {
      badge.style.animation = "none";
    }
    if (gsap) {
      const killProps = [
        "autoAlpha",
        "opacity",
        "visibility",
        ...(applyY ? ["y", "x"] : []),
        ...(resetSwing ? ["rotation"] : []),
      ].join(",");
      gsap.killTweensOf(badge, killProps);
      gsap.set(badge, {
        autoAlpha: 1,
        ...(applyY ? { x: 0, y: 0 } : {}),
        ...(resetSwing ? { rotation: 0 } : {}),
        overwrite: false,
      });
    }
    badge.style.opacity = "";
    badge.style.visibility = "";
    if (applyY && !gsap) {
      badge.style.transform = "";
    }
  });
}

/**
 * True when the CSS badge drop has finished (or reduced-motion skipped it).
 */
export function isHeaderBadgeEntranceSettled() {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("kpf-nav-entered");
}
