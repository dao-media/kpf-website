import { gsap } from "gsap";

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
 * @param {{ resetY?: boolean }} [opts]
 *   resetY: also snap translateY to 0. Use after `context.revert()`, not
 *   while the header entrance drop is still playing.
 */
export function restoreHeaderBadge({ resetY = true } = {}) {
  if (typeof document === "undefined") return;
  document.querySelectorAll(HEADER_BADGE_SELECTOR).forEach((badge) => {
    gsap.killTweensOf(
      badge,
      resetY ? "autoAlpha,opacity,visibility,y" : "autoAlpha,opacity,visibility",
    );
    gsap.set(badge, {
      autoAlpha: 1,
      ...(resetY ? { y: 0 } : {}),
      overwrite: false,
    });
    badge.style.opacity = "";
    badge.style.visibility = "";
  });
}
