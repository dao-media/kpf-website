import { useLayoutEffect } from "react";

const ENTERED_CLASS = "kpf-hero-cutouts-entered";

/**
 * Depth-graded entrance: same clock, different travel.
 * Rear (dad) crawls; front (runner) covers the most ground.
 */
const LAYERS = [
  { selector: ".kpf-hero__cutout--dad", xPercent: -38 },
  { selector: ".kpf-hero__cutout--alumni", xPercent: -78 },
  { selector: ".kpf-hero__cutout--runner", xPercent: -124 },
];

const DURATION = 1.55;
const DELAY = 0.4;

function markEntered() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add(ENTERED_CLASS);
}

/**
 * Homepage hero cutouts: fade in while sliding right from off-stage left.
 * Skipped when the user prefers reduced motion; CSS then shows them at rest.
 */
export default function HomeHeroCutoutsRuntime() {
  useLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      markEntered();
      return undefined;
    }

    const stage = document.querySelector(".kpf-hero--home .kpf-hero__stage");
    if (!stage) {
      markEntered();
      return undefined;
    }

    let cancelled = false;
    let revert = () => {};
    const safety = window.setTimeout(markEntered, 2200);

    import("gsap").then(({ gsap }) => {
      if (cancelled) return;
      const ctx = gsap.context(() => {
        const visible = LAYERS.map((layer) => {
          const node = stage.querySelector(layer.selector);
          if (!node) return null;
          if (getComputedStyle(node).display === "none") return null;
          return { node, xPercent: layer.xPercent };
        }).filter(Boolean);

        if (!visible.length) {
          markEntered();
          return;
        }

        visible.forEach(({ node, xPercent }) => {
          gsap.from(node, {
            xPercent,
            autoAlpha: 0,
            duration: DURATION,
            delay: DELAY,
            ease: "expo.out",
            overwrite: "auto",
            onComplete: markEntered,
          });
        });
      }, stage);
      revert = () => ctx.revert();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      revert();
    };
  }, []);

  return null;
}
