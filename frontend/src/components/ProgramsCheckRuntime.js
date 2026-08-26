import { useLayoutEffect } from "react";
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger);

/**
 * Lucide Check geometry, path reversed so DrawSVG 0→100% writes the mark
 * the way a person does: short arm → corner → long arm.
 */
export function ProgramsCheckIcon({ size = 28 }) {
  return (
    <svg
      className="lucide lucide-check"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}

/**
 * Programs list checkmarks: on enter viewport, wait 1s, then each icon
 * disappears → draws on via stroke → subtle pop. Stagger 0.4s.
 */
export default function ProgramsCheckRuntime({
  rootSelector = ".kpf-programs__list",
}) {
  useLayoutEffect(() => {
    if (typeof document === "undefined") return undefined;

    const list = document.querySelector(rootSelector);
    if (!list) return undefined;

    const paths = gsap.utils.toArray(
      `${rootSelector} .kpf-programs__check path`,
    );
    if (!paths.length) return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return undefined;

    const ctx = gsap.context(() => {
      const svgs = paths
        .map((path) => path.closest("svg"))
        .filter(Boolean);

      gsap.set(paths, { drawSVG: 0 });
      gsap.set(svgs, { transformOrigin: "50% 50%" });

      const drawDuration = 0.55;

      ScrollTrigger.create({
        trigger: list,
        start: "top 80%",
        once: true,
        onEnter: () => {
          const tl = gsap.timeline({ delay: 1 });

          paths.forEach((path, index) => {
            const svg = path.closest("svg");
            const at = index * 0.4;

            // Draw the check stroke into place.
            tl.fromTo(
              path,
              { drawSVG: 0 },
              {
                drawSVG: "100%",
                duration: drawDuration,
                ease: "power2.inOut",
              },
              at,
            );

            // Pulse only the checkmark SVG (not the red tile), starting
            // the instant the stroke finishes drawing.
            if (svg) {
              tl.fromTo(
                svg,
                { scale: 1 },
                {
                  scale: 1.2,
                  duration: 0.32,
                  ease: "sine.inOut",
                  yoyo: true,
                  repeat: 1,
                },
                at + drawDuration,
              );
            }
          });
        },
      });
    }, list);

    requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => ctx.revert();
  }, [rootSelector]);

  return null;
}
