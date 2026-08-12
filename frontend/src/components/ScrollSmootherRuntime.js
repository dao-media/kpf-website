import { useEffect } from "react";
import { useRouter } from "next/router";
import { gsap } from "gsap";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

/**
 * GSAP ScrollSmoother for the site shell.
 * Requires #smooth-wrapper > #smooth-content (see SiteChrome).
 * Skipped when the user prefers reduced motion.
 */
export default function ScrollSmootherRuntime() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    const wrapper = document.querySelector("#smooth-wrapper");
    const content = document.querySelector("#smooth-content");
    if (!wrapper || !content) return undefined;

    ScrollSmoother.get()?.kill();

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

    refresh();
    router.events?.on("routeChangeComplete", refresh);

    return () => {
      router.events?.off("routeChangeComplete", refresh);
      smoother.kill();
    };
  }, [router.asPath, router.events]);

  return null;
}
