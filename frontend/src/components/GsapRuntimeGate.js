import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { KPF_GSAP_QUERY } from "@/lib/gsapQuery";

const {
  animationsUsedOnPage,
  partitionGsapAnimations,
} = require("@/lib/gsapPlugins");
const {
  GSAP_FALLBACK_MS,
  GSAP_INTERACTIVE_IDLE_MS,
  canBindHoverGsap,
  scheduleAfterLcp,
  scheduleIdle,
} = require("@/lib/thirdPartyIdle");

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
 * Hover/click bind on idle (~400ms) only when the pointer can hover — badge
 * swing must not wait for GTM’s 8s cap, and phones must not download GSAP
 * for hover. In-view/load wait for LCP so Club GSAP stays off the LCP path.
 * Unused CMS selectors never download MorphSVG / Physics / Flip / DrawSVG.
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
    function apply(list) {
      if (cancelled) return;
      setUsed((prev) => (usedKey(prev) === usedKey(list) ? prev : list));
    }
    function usedNow() {
      return animationsUsedOnPage(listRef.current, document);
    }

    const hoverOk = canBindHoverGsap();
    const cancelIdle = hoverOk
      ? scheduleIdle(() => {
          const { interactive } = partitionGsapAnimations(usedNow());
          if (interactive.length) apply(interactive);
        }, GSAP_INTERACTIVE_IDLE_MS)
      : function noopIdle() {};

    const cancelPaint = scheduleAfterLcp(() => {
      const used = usedNow();
      if (hoverOk) {
        apply(used);
        return;
      }
      const { deferred } = partitionGsapAnimations(used);
      apply(deferred);
    }, GSAP_FALLBACK_MS);

    return () => {
      cancelled = true;
      cancelIdle();
      cancelPaint();
    };
  }, [ids, router.asPath]);

  if (!used.length) return null;
  return <GsapRuntime animations={used} />;
}
