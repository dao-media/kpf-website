import { SquareArrowOutUpRight } from "lucide-react";
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

function withDonateClass(className) {
  const tokens = String(className || "")
    .split(/\s+/)
    .filter(Boolean);
  if (!tokens.includes("kpf-btn--donate")) tokens.push("kpf-btn--donate");
  return tokens.join(" ");
}

/** Official 2014 PayPal monogram — baked white + alpha, do not tint. */
export function PayPalMark() {
  return (
    <img
      className="kpf-btn__paypal"
      src="/media/brand/paypal-icon.png"
      alt=""
      width={16}
      height={20}
      decoding="async"
      draggable={false}
    />
  );
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
      className={withDonateClass(className)}
      variant={variant}
      size={size}
      data-kpf-track="donate_clicked"
      data-kpf-track-component="donate"
      {...rest}
    >
      <span className="kpf-btn__cluster">
        <span className="kpf-btn__label">{children ?? label}</span>
        <span className="kpf-btn__paypal-clip">
          <span className="kpf-btn__icon kpf-btn__icon--trailing kpf-btn__icon--paypal" aria-hidden="true">
            <PayPalMark />
          </span>
        </span>
      </span>
      <span className="kpf-btn__ext-tip" aria-hidden="true">
        <SquareArrowOutUpRight size={16} strokeWidth={2} absoluteStrokeWidth />
      </span>
    </KpfButton>
  );
}
