import CtaClosingFlag from "@/components/CtaClosingFlag";
import DonateButton, { isDonateAction } from "@/components/DonateButton";
import KpfButton from "@/components/KpfButton";

export const CTA_CLOSING_DEFAULTS = {
  title: "There's more than one way to make a difference.",
  body: "Volunteer a Saturday. Point us toward an org that deserves a look. Or give — every gift becomes a grant in Kevin's name.",
  actions: [
    { donate: true, label: "Donate", variant: "primary" },
    { href: "/contact/", label: "Get in touch", variant: "outline" },
  ],
  media: {
    key: "cta.flag",
    src: "/media/brand/kpf-flag.mp4",
    alt: "",
  },
};

/**
 * Closing flag-band CTA shared by Events + About (Donate / Get in touch).
 */
export default function CtaClosingBand({
  title = CTA_CLOSING_DEFAULTS.title,
  body = CTA_CLOSING_DEFAULTS.body,
  actions = CTA_CLOSING_DEFAULTS.actions,
  flagSrc = "",
  titleId = "kpf-cta-closing-title",
}) {
  const list = Array.isArray(actions) && actions.length > 0
    ? actions
    : CTA_CLOSING_DEFAULTS.actions;

  return (
    <section className="kpf-cta-closing kpf-section" aria-labelledby={titleId}>
      <CtaClosingFlag src={flagSrc} />
      <div className="kpf-u-container">
        <div className="kpf-content-block kpf-u-invert kpf-cta-closing__block">
          <div className="kpf-content-block__copy">
            <div className="kpf-content-block__title-group">
              <h2
                id={titleId}
                className="kpf-content-block__title kpf-content-block__title--h2"
              >
                {title}
              </h2>
            </div>
            {body ? (
              <div className="kpf-content-block__body-group">
                <p className="kpf-content-block__body">{body}</p>
              </div>
            ) : null}
          </div>
          <div className="kpf-content-block__actions">
            {list.map((action) => {
              const className = `kpf-btn kpf-btn--${action.variant || "primary"}`;
              const key = `${action.donate ? "donate" : action.href}-${action.label}`;
              if (isDonateAction(action)) {
                return (
                  <DonateButton
                    key={key}
                    label={action.label}
                    className={className}
                  />
                );
              }
              return (
                <KpfButton
                  key={key}
                  href={action.href}
                  external={Boolean(action.external)}
                  className={className}
                >
                  {action.label}
                </KpfButton>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
