export const HEADER_BADGE_SELECTOR = "[data-kpf-badge], .kpf-header__badge";

export function isHeaderBadgeNode(node) {
  return Boolean(
    node &&
      typeof node.matches === "function" &&
      (node.matches(HEADER_BADGE_SELECTOR) || node.closest?.(HEADER_BADGE_SELECTOR)),
  );
}

/**
 * Keep the anniversary mark visible. CMS hover/scroll tweens and SPA
 * `gsap.context().revert()` were restoring the entrance's autoAlpha:0
 * (and sometimes y: -140). Does not touch rotation — hover swing stays.
 *
 * Pass `gsap` when the motion runtime is already loaded so tweens are
 * killed. Reduced-motion / chrome-without-GSAP only clears CSS visibility.
 *
 * @param {{ resetY?: boolean, gsap?: { killTweensOf: Function, set: Function } }} [opts]
 */
export function restoreHeaderBadge({ resetY = true, gsap = null } = {}) {
  if (typeof document === "undefined") return;
  const dropPlaying = !document.documentElement.classList.contains("kpf-nav-entered");
  const applyY = resetY && !dropPlaying;
  document.querySelectorAll(HEADER_BADGE_SELECTOR).forEach((badge) => {
    if (gsap) {
      gsap.killTweensOf(
        badge,
        applyY ? "autoAlpha,opacity,visibility,y" : "autoAlpha,opacity,visibility",
      );
      gsap.set(badge, {
        autoAlpha: 1,
        ...(applyY ? { y: 0 } : {}),
        overwrite: false,
      });
    }
    badge.style.opacity = "";
    badge.style.visibility = "";
  });
}
