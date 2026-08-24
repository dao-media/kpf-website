import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const DESKTOP_MQ = "(min-width: 64rem)";
const SIDEBAR_SEL = ".kpf-page--post .kpf-post-sidebar";
const MAIN_SEL = ".kpf-page--post .kpf-post-main";

/**
 * Sticky blog-post sidebar on desktop only.
 * CSS `position: sticky` works when ScrollSmoother is off (reduced motion);
 * with ScrollSmoother active, pin via ScrollTrigger instead.
 */
export function useStickyPostSidebar(deps = []) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let ctx = null;
    let cancelled = false;

    const setup = () => {
      if (cancelled) return;

      ctx = gsap.context(() => {
        const mm = gsap.matchMedia();
        mm.add(DESKTOP_MQ, () => {
          const sidebar = document.querySelector(SIDEBAR_SEL);
          const main = document.querySelector(MAIN_SEL);
          if (!sidebar || !main) return undefined;

          // Without ScrollSmoother, pages.css sticky is enough.
          if (!ScrollSmoother.get()) return undefined;

          const st = ScrollTrigger.create({
            trigger: sidebar,
            start: () => {
              const header = document.querySelector(
                ".kpf-site-chrome__header-bar, .kpf-header",
              );
              const gap = 16;
              const offset = header
                ? Math.ceil(header.getBoundingClientRect().bottom) + gap
                : 104;
              return `top top+=${offset}`;
            },
            endTrigger: main,
            end: "bottom bottom",
            pin: true,
            pinSpacing: false,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          });

          requestAnimationFrame(() => ScrollTrigger.refresh());

          return () => {
            st.kill();
          };
        });
      });
    };

    // Let ScrollSmootherRuntime create the smoother first.
    const timer = window.setTimeout(setup, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller passes content deps
  }, deps);
}
