import { SquareArrowOutUpRight } from "lucide-react";
import ChipCursorTooltip from "@/components/ChipCursorTooltip";
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
  return <SquareArrowOutUpRight size={18} strokeWidth={2} />;
}

/**
 * Same cursor-tracked icon tip as Donate — used on Get tickets and
 * other controls that leave the Foundation site.
 */
export default function ExternalExitTooltip({
  href = "",
  children,
  className = "kpf-exit-tip",
}) {
  return (
    <ChipCursorTooltip
      label={exitTooltipLabel(href)}
      className={className}
      desktopOnly
      icon={<ExitTooltipIcon />}
    >
      {children}
    </ChipCursorTooltip>
  );
}
