import { useEffect } from "react";

const ENTERED_CLASS = "kpf-hero-cutouts-entered";
const DESKTOP_MQ = "(min-width: 64rem)";

/**
 * Depth-graded entrance: same clock, different travel as a percent of the
 * cutout’s own width (avoids measuring stage.clientWidth). Values match
 * travel / CSS width at 64rem+: dad 0.28 / 36.74%, runner 1.05 / 30.83%.
 */
const LAYERS = [
  { selector: ".kpf-hero__cutout--dad", xPercent: -76.21 },
  { selector: ".kpf-hero__cutout--runner", xPercent: -340.58 },
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
 * Homepage hero cutouts: dad + runner fade in while sliding from off-stage
 * left. Alumni stays at rest from first paint so it can be LCP.
 * Skipped when the user prefers reduced motion; CSS then shows all at rest.
 */
export default function HomeHeroCutoutsRuntime({ stageRef } = {}) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      markEntered();
      return undefined;
    }
    if (!window.matchMedia(DESKTOP_MQ).matches) {
      markEntered();
      return undefined;
    }

    const stage =
      (stageRef && stageRef.current) ||
      document.querySelector(".kpf-hero--home .kpf-hero__stage");
    if (!stage) {
      return undefined;
    }

    const visible = LAYERS.map((layer) => {
      const node = stage.querySelector(layer.selector);
      if (!node) return null;
      return { node, xPercent: layer.xPercent };
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
        visible.forEach(({ node, xPercent }) => {
          gsap.fromTo(
            node,
            { xPercent, autoAlpha: 0 },
            {
              xPercent: 0,
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
