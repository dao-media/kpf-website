import { useLayoutEffect } from "react";

const ENTERED_CLASS = "kpf-hero-cutouts-entered";

/**
 * Depth-graded entrance: same clock, different travel (fraction of stage width).
 * Rear (dad) crawls; front (runner) covers the most ground, from off-stage left.
 */
const LAYERS = [
  { selector: ".kpf-hero__cutout--dad", travel: 0.28 },
  { selector: ".kpf-hero__cutout--alumni", travel: 0.62 },
  { selector: ".kpf-hero__cutout--runner", travel: 1.05 },
];

const DURATION = 1.55;
const DELAY = 0.4;

function markEntered() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add(ENTERED_CLASS);
}

function showResting(nodes) {
  nodes.forEach((node) => {
    node.style.opacity = "";
    node.style.visibility = "";
    node.style.transform = "";
    node.style.translate = "";
  });
  markEntered();
}

function resolveGsap(mod) {
  if (typeof mod?.gsap?.fromTo === "function") return mod.gsap;
  if (typeof mod?.default?.fromTo === "function") return mod.default;
  if (typeof mod?.fromTo === "function") return mod;
  return null;
}

/**
 * Homepage hero cutouts: fade in while sliding right from off-stage left.
 * Skipped when the user prefers reduced motion; CSS then shows them at rest.
 */
export default function HomeHeroCutoutsRuntime({ stageRef } = {}) {
  useLayoutEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      markEntered();
      return undefined;
    }

    const stage =
      (stageRef && stageRef.current) ||
      document.querySelector(".kpf-hero--home .kpf-hero__stage");
    if (!stage) {
      return undefined;
    }

    const stageWidth = stage.getBoundingClientRect().width || stage.offsetWidth;
    const visible = LAYERS.map((layer) => {
      const node = stage.querySelector(layer.selector);
      if (!node) return null;
      if (getComputedStyle(node).display === "none") return null;
      return { node, x: -Math.round(stageWidth * layer.travel) };
    }).filter(Boolean);

    if (!visible.length) {
      markEntered();
      return undefined;
    }

    const nodes = visible.map((layer) => layer.node);
    let cancelled = false;
    let revert = () => {};
    const safety = window.setTimeout(() => showResting(nodes), 2400);

    import("gsap").then((mod) => {
      if (cancelled) return;
      const gsap = resolveGsap(mod);
      if (!gsap) {
        showResting(nodes);
        return;
      }

      const ctx = gsap.context(() => {
        visible.forEach(({ node, x }) => {
          gsap.fromTo(
            node,
            { x, autoAlpha: 0 },
            {
              x: 0,
              autoAlpha: 1,
              duration: DURATION,
              delay: DELAY,
              ease: "expo.out",
              overwrite: true,
              immediateRender: true,
              onStart: markEntered,
              onComplete: markEntered,
            },
          );
        });
      }, stage);
      revert = () => ctx.revert();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(safety);
      revert();
    };
  }, [stageRef]);

  return null;
}
