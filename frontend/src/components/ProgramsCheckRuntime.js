import { useEffect } from "react";

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
 * DrawSVG loads only when this list is on the page.
 */
export default function ProgramsCheckRuntime({
  rootSelector = ".kpf-programs__list",
}) {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const list = document.querySelector(rootSelector);
    if (!list) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    let cancelled = false;
    let ctx;
    let started = false;

    const run = async () => {
      if (cancelled || started) return;
      started = true;
      const { gsap } = await import("gsap");
      const { DrawSVGPlugin } = await import("gsap/DrawSVGPlugin");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      if (cancelled) return;

      const paths = gsap.utils.toArray(
        `${rootSelector} .kpf-programs__check path`,
      );
      if (!paths.length) return;

      gsap.registerPlugin(DrawSVGPlugin, ScrollTrigger);

      ctx = gsap.context(() => {
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
    };

    if (typeof IntersectionObserver === "undefined") {
      run();
      return () => {
        cancelled = true;
        ctx?.revert();
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        run();
      },
      { rootMargin: "25% 0px" },
    );
    observer.observe(list);

    return () => {
      cancelled = true;
      observer.disconnect();
      ctx?.revert();
    };
  }, [rootSelector]);

  return null;
}
