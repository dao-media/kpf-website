import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const DESKTOP_MQ = "(min-width: 64rem)";
const SIDEBAR_SEL = ".kpf-page--post .kpf-post-sidebar";
const CONTAINER_SEL = ".kpf-page--post .kpf-post-body";
const MAIN_SEL = ".kpf-page--post .kpf-post-main";

function headerOffsetPx() {
  const header = document.querySelector(
    ".kpf-site-chrome__header-bar, .kpf-header",
  );
  const gap = 16;
  return header
    ? Math.ceil(header.getBoundingClientRect().bottom) + gap
    : 104;
}

function pinDistancePx(sidebar, main) {
  return Math.max(0, Math.round(main.offsetHeight - sidebar.offsetHeight));
}

/**
 * Desktop blog-post sidebar: stay top-mounted under the header while the
 * article is taller than the TOC, then release once the sidebar bottom is
 * flush with the article column so both scroll off together at the end.
 * CSS sticky is cleared before pinning so GSAP's pin-spacer does not inherit
 * `top` and shift the column down.
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
          const main = document.querySelector(MAIN_SEL);
          if (!sidebar || !container || !main) return undefined;

          gsap.set(sidebar, { position: "relative", top: "auto", bottom: "auto" });

          const st = ScrollTrigger.create({
            trigger: sidebar,
            start: () => `top top+=${headerOffsetPx()}`,
            end: () => `+=${pinDistancePx(sidebar, main)}`,
            pin: true,
            pinSpacing: true,
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
