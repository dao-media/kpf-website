import { useEffect } from "react";

const ENTERED_CLASS = "kpf-hero-cutouts-entered";

function markEntered() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.add(ENTERED_CLASS);
}

/**
 * Homepage hero cutouts paint from the first frame (desktop runner is LCP).
 * This runtime only flips html.kpf-hero-cutouts-entered so leftover CSS
 * entrance rules cannot hide the runner. It does not load GSAP.
 */
export default function HomeHeroCutoutsRuntime() {
  useEffect(() => {
    markEntered();
  }, []);

  return null;
}
