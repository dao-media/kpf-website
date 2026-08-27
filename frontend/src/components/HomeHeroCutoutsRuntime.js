import { useEffect } from "react";

const ENTERED_CLASS = "kpf-hero-cutouts-entered";
const DESKTOP_MQ = "(min-width: 64rem)";
const CUTOUT_ANIMATIONS = new Set([
  "kpf-hero-cutout-dad",
  "kpf-hero-cutout-runner",
]);

function markEntered() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add(ENTERED_CLASS);
}

/**
 * Homepage hero cutouts: CSS slides dad + runner in from off-stage left.
 * Alumni stays at rest from first paint so it can be LCP.
 * This runtime only flips html.kpf-hero-cutouts-entered — it does not load GSAP.
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
      markEntered();
      return undefined;
    }

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      markEntered();
    };

    const onEnd = (event) => {
      if (!CUTOUT_ANIMATIONS.has(event.animationName)) return;
      settle();
    };

    stage.addEventListener("animationend", onEnd);
    const safety = window.setTimeout(settle, 2400);
    return () => {
      window.clearTimeout(safety);
      stage.removeEventListener("animationend", onEnd);
      settle();
    };
  }, [stageRef]);

  return null;
}
