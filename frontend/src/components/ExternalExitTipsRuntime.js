import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { ExitTooltipIcon, exitTooltipLabel } from "@/components/ExternalExitTooltip";
const { hrefFromExitTarget, isOffsiteHttpHref } = require("@/lib/externalHref");

let exitTipSeq = 0;

function shouldBindExitTip(el) {
  if (!(el instanceof Element)) return false;
  if (el.classList.contains("kpf-btn--donate")) return false;
  const wrap = el.closest(".kpf-chip-tip-host");
  if (wrap && wrap !== el) return false;
  const href = hrefFromExitTarget(el);
  return isOffsiteHttpHref(href);
}

function collectExitTargets(root) {
  const nodes = [];
  root
    .querySelectorAll("a[href], button[data-kpf-href]")
    .forEach((el) => {
      if (!shouldBindExitTip(el)) return;
      if (!el.getAttribute("data-kpf-exit-id")) {
        exitTipSeq += 1;
        el.setAttribute("data-kpf-exit-id", String(exitTipSeq));
      }
      nodes.push(el);
    });
  return nodes;
}

/**
 * Attach the Donate-style exit tooltip to leftover off-site text links
 * and design-HTML buttons that React did not wrap.
 */
export default function ExternalExitTipsRuntime() {
  const router = useRouter();
  const [hosts, setHosts] = useState([]);
  const [BoundTip, setBoundTip] = useState(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }
    let cancelled = false;
    import("@/components/ChipCursorTooltip").then((mod) => {
      if (!cancelled) setBoundTip(() => mod.BoundChipCursorTooltip);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const root = document.querySelector(".kpf-site-chrome") || document.body;

    const scan = () => {
      const next = collectExitTargets(root);
      setHosts((prev) => {
        if (
          prev.length === next.length &&
          prev.every((node, index) => node === next[index])
        ) {
          return prev;
        }
        return next;
      });
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [router.asPath]);

  if (!BoundTip) return null;

  return hosts.map((host) => (
    <BoundTip
      key={host.getAttribute("data-kpf-exit-id")}
      host={host}
      label={exitTooltipLabel(hrefFromExitTarget(host))}
      desktopOnly
      icon={<ExitTooltipIcon />}
    />
  ));
}
