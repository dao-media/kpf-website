import { useEffect, useState } from "react";
import { KPF_DONATE_HREF } from "@/lib/navigation";

export const EXIT_TOOLTIP_LABEL = "Opens in a new tab";
export const DONATE_TOOLTIP_LABEL = "Opens PayPal";

export function exitTooltipLabel(href = "") {
  const value = String(href || "");
  if (value === KPF_DONATE_HREF || /paypal\.com/i.test(value)) {
    return DONATE_TOOLTIP_LABEL;
  }
  return EXIT_TOOLTIP_LABEL;
}

export function ExitTooltipIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
      <path d="m21 3-9 9" />
      <path d="M15 3h6v6" />
    </svg>
  );
}

/**
 * Same cursor-tracked icon tip as Donate — used on Get tickets and
 * other controls that leave the Foundation site.
 * GSAP (ChipCursorTooltip) loads only when motion is allowed.
 */
export default function ExternalExitTooltip({
  href = "",
  children,
  className = "kpf-exit-tip",
}) {
  const [Tip, setTip] = useState(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }
    let cancelled = false;
    import("@/components/ChipCursorTooltip").then((mod) => {
      if (!cancelled) setTip(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Tip) return children;

  return (
    <Tip
      label={exitTooltipLabel(href)}
      className={className}
      desktopOnly
      icon={<ExitTooltipIcon />}
    >
      {children}
    </Tip>
  );
}
