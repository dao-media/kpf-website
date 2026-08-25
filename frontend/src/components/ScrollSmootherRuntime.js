import { useEffect } from "react";
import { useRouter } from "next/router";
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const { sameDocumentHash, scrollToTarget } = require("@/lib/smoothScrollTo");

const SMOOTHED_CLASS = "kpf-scroll-smoothed";

function currentPath() {
  if (typeof window === "undefined") return "/";
  return window.location.pathname;
}

/**
 * Capture-phase intercept so Next.js <Link href="/#programs"> cannot native-scroll
 * the document (that fight with ScrollSmoother leaves a huge gap under the footer).
 * @param {MouseEvent} event
 * @param {{ smooth: boolean }} options
 */
function interceptSameDocumentHashClick(event, { smooth }) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }
  const anchor = event.target?.closest?.("a[href]");
  if (!anchor || anchor.target === "_blank") return;
  const hash =
    sameDocumentHash(anchor.getAttribute("href"), currentPath()) ||
    sameDocumentHash(anchor.href, currentPath());
  if (!hash) return;
  event.preventDefault();
  event.stopPropagation();
  scrollToTarget(hash, { smooth, updateHash: true });
}

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

/**
 * GSAP ScrollSmoother for the site shell.
 * Requires #smooth-wrapper > #smooth-content (see SiteChrome).
 * Skipped when the user prefers reduced motion.
 *
 * Also intercepts same-page hash links — native #anchor scrolling fights
 * ScrollSmoother and creates a huge empty gap under the page.
 */
export default function ScrollSmootherRuntime() {
  const router = useRouter();
  // Hash-only URL changes must not kill/recreate the smoother — that is how
  // `/#programs` left a huge empty gap under the footer.
  const routePath = String(router.asPath || "/").split(/[?#]/)[0] || "/";

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Still intercept hashes so reduced-motion gets header-aware scrolling.
      const onClickReduced = (event) => {
        interceptSameDocumentHashClick(event, { smooth: false });
      };
      document.addEventListener("click", onClickReduced, true);
      if (window.location.hash) {
        scrollToTarget(window.location.hash, {
          smooth: false,
          updateHash: false,
        });
      }
      return () => document.removeEventListener("click", onClickReduced, true);
    }

    const wrapper = document.querySelector("#smooth-wrapper");
    const content = document.querySelector("#smooth-content");
    if (!wrapper || !content) return undefined;

    ScrollSmoother.get()?.kill();
    document.documentElement.classList.add(SMOOTHED_CLASS);

    const smoother = ScrollSmoother.create({
      wrapper,
      content,
      smooth: 1.15,
      effects: true,
      smoothTouch: 0.1,
      normalizeScroll: true,
    });

    const refresh = () => {
      requestAnimationFrame(() => {
        smoother.refresh();
        ScrollTrigger.refresh();
      });
    };

    const scrollHash = ({ smooth = false } = {}) => {
      const { hash } = window.location;
      if (!hash) return;
      // Wait a frame so layout + smoother height are settled.
      requestAnimationFrame(() => {
        scrollToTarget(hash, { smooth, updateHash: false });
      });
    };

    const onClick = (event) => {
      interceptSameDocumentHashClick(event, { smooth: true });
    };

    const onHashChange = () => {
      scrollHash({ smooth: true });
    };

    refresh();
    scrollHash({ smooth: false });

    const onRouteComplete = () => {
      refresh();
      scrollHash({ smooth: false });
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("hashchange", onHashChange);
    router.events?.on("routeChangeComplete", onRouteComplete);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("hashchange", onHashChange);
      router.events?.off("routeChangeComplete", onRouteComplete);
      document.documentElement.classList.remove(SMOOTHED_CLASS);
      smoother.kill();
    };
  }, [routePath, router.events]);

  return null;
}
