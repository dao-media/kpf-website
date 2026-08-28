import { useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const DESKTOP_MQ = "(min-width: 64rem)";

/** @param {"post" | "privacy"} pageKind */
function stickySidebarSelectors(pageKind) {
  const root = `.kpf-page--${pageKind}`;
  return {
    sidebar: `${root} .kpf-post-sidebar`,
    container: `${root} .kpf-post-body`,
    main: `${root} .kpf-post-main`,
  };
}

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
 * Desktop TOC sidebar (blog post, privacy policy): stay top-mounted under the
 * header while the article is taller than the TOC, then release once the sidebar
 * bottom is flush with the article column so both scroll off together at the end.
 * CSS sticky is cleared before pinning so GSAP's pin-spacer does not inherit
 * `top` and shift the column down. Tablet uses static sidebar (same as blog).
 */
export function useStickyPostSidebar(deps = [], pageKind = "post") {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const { sidebar: sidebarSel, container: containerSel, main: mainSel } =
      stickySidebarSelectors(pageKind);

    let ctx = null;
    let cancelled = false;

    const setup = () => {
      if (cancelled) return;

      ctx = gsap.context(() => {
        const mm = gsap.matchMedia();
        mm.add(DESKTOP_MQ, () => {
          const sidebar = document.querySelector(sidebarSel);
          const container = document.querySelector(containerSel);
          const main = document.querySelector(mainSel);
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
  }, [pageKind, ...deps]);
}
