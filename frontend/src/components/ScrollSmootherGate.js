import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const { sameDocumentHash, scrollToTarget } = require("@/lib/smoothScrollTo");

const ScrollSmootherRuntime = dynamic(
  () => import("@/components/ScrollSmootherRuntime"),
  { ssr: false },
);

function currentPath() {
  if (typeof window === "undefined") return "/";
  return window.location.pathname;
}

/**
 * Header-aware hash clicks without loading GSAP ScrollSmoother.
 */
function HashClickRuntime({ smooth }) {
  const router = useRouter();

  useEffect(() => {
    const onClick = (event) => {
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
    };

    document.addEventListener("click", onClick, true);
    if (window.location.hash) {
      scrollToTarget(window.location.hash, {
        smooth: false,
        updateHash: false,
      });
    }
    return () => document.removeEventListener("click", onClick, true);
  }, [smooth, router.asPath]);

  return null;
}

/**
 * Load ScrollSmoother only when motion is allowed. Reduced-motion still
 * intercepts same-page hashes so the sticky header does not cover targets.
 */
export default function ScrollSmootherGate() {
  const [mode, setMode] = useState("unknown");

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setMode(reduce ? "reduce" : "motion");
  }, []);

  if (mode === "motion") {
    return <ScrollSmootherRuntime />;
  }

  return <HashClickRuntime smooth={false} />;
}
