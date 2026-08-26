import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { KPF_GSAP_QUERY } from "@/lib/gsapQuery";

const { animationsUsedOnPage } = require("@/lib/gsapPlugins");

const GsapRuntime = dynamic(() => import("@/components/GsapRuntime"), {
  ssr: false,
});

export { KPF_GSAP_QUERY };

function usedKey(list) {
  return (list || [])
    .map((item) => item?.databaseId ?? item?.selector ?? "")
    .join("|");
}

/**
 * Loads GsapRuntime (and Club plugins) only when this page has matching
 * animation targets. The CMS list is site-wide; unused selectors never
 * download MorphSVG / Physics / Flip / DrawSVG / etc.
 */
export default function GsapRuntimeGate({ animations = [] }) {
  const router = useRouter();
  const [used, setUsed] = useState([]);
  const listRef = useRef(animations);
  listRef.current = animations;
  const ids = usedKey(animations);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setUsed([]);
      return undefined;
    }

    let cancelled = false;
    function scan() {
      if (cancelled) return;
      const next = animationsUsedOnPage(listRef.current, document);
      setUsed((prev) => (usedKey(prev) === usedKey(next) ? prev : next));
    }

    scan();
    const frame = requestAnimationFrame(scan);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [ids, router.asPath]);

  if (!used.length) return null;
  return <GsapRuntime animations={used} />;
}
