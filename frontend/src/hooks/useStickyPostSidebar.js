import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const DESKTOP_MQ = "(min-width: 64rem)";
const SIDEBAR_SEL = ".kpf-page--post .kpf-post-sidebar";
const CONTAINER_SEL = ".kpf-page--post .kpf-post-body";

function headerOffsetPx() {
  const header = document.querySelector(
    ".kpf-site-chrome__header-bar, .kpf-header",
  );
  const gap = 16;
  return header
    ? Math.ceil(header.getBoundingClientRect().bottom) + gap
    : 104;
}

/**
 * Desktop blog-post sidebar: stay top-mounted under the header while the
 * article is in view, then leave with the section (still top-aligned — never
 * docked to the bottom of the column). CSS sticky is cleared before pinning
 * so GSAP's pin-spacer does not inherit `top` and shift the column down.
 * `overflow: clip` on `.kpf-post-body` hides the pinned sidebar as the
 * section scrolls away.
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
          const container = document.querySelector(CONTAINER_SEL);
          if (!sidebar || !container) return undefined;

          gsap.set(sidebar, { position: "relative", top: 0 });

          const st = ScrollTrigger.create({
            trigger: sidebar,
            start: () => `top top+=${headerOffsetPx()}`,
            endTrigger: container,
            end: "bottom top",
            pin: true,
            pinSpacing: false,
            pinType: "transform",
            anticipatePin: 1,
            invalidateOnRefresh: true,
          });

          const featured = container.querySelector(".kpf-post-featured img");
          const refresh = () => ScrollTrigger.refresh();
          featured?.addEventListener("load", refresh);
          requestAnimationFrame(refresh);

          return () => {
            featured?.removeEventListener("load", refresh);
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
