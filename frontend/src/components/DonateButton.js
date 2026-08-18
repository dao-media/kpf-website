import KpfButton from "@/components/KpfButton";
import { KPF_DONATE_HREF } from "@/lib/navigation";

export const DONATE_BUTTON_DEFAULT_LABEL = "Donate";

/**
 * True when copy/action config should render {@link DonateButton}
 * (owns the PayPal URL — no href required on the action).
 */
export function isDonateAction(action) {
  if (!action || typeof action !== "object") return false;
  if (action.donate === true) return true;
  return Boolean(action.href && action.href === KPF_DONATE_HREF);
}

/**
 * PayPal donation CTA. Destination is always {@link KPF_DONATE_HREF}.
 */
export default function DonateButton({
  children,
  label = DONATE_BUTTON_DEFAULT_LABEL,
  className = "kpf-btn kpf-btn--primary",
  variant = "primary",
  size,
  ...rest
}) {
  return (
    <KpfButton
      href={KPF_DONATE_HREF}
      className={className}
      variant={variant}
      size={size}
      {...rest}
    >
      {children ?? label}
    </KpfButton>
  );
}
