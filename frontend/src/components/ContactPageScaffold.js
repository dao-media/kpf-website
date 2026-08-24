import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import CtaClosingBand from "@/components/CtaClosingBand";
import DonateButton, { isDonateAction } from "@/components/DonateButton";
import FormRenderer from "@/components/FormRenderer";
import KpfButton from "@/components/KpfButton";
import { CONTACT } from "@/lib/pageCopy";

const { resolveMedia } = require("@/lib/scaffoldMedia");

function withInquiryDefault(definition, inquiry) {
  if (!inquiry || !definition?.fields) return definition;
  const next = {
    ...definition,
    fields: { ...definition.fields },
  };
  for (const [id, field] of Object.entries(next.fields)) {
    if (field?.name === "inquiry" || id.includes("inquiry")) {
      const allowed = new Set((field.options || []).map((o) => o.value));
      if (allowed.has(inquiry)) {
        next.fields[id] = { ...field, defaultValue: inquiry };
      }
    }
  }
  return next;
}

/** Contact form UI defaults — Start over + Send message. */
function withContactFormUi(definition) {
  if (!definition) return definition;
  return {
    ...definition,
    settings: {
      ...(definition.settings || {}),
      submitLabel: definition.settings?.submitLabel || "Send message",
      resetLabel: definition.settings?.resetLabel || "Start over",
      showReset: true,
      showSubmitIcon: false,
      showResetIcon: false,
    },
  };
}

function HeroAction({ action }) {
  const className = `kpf-btn kpf-btn--${action.variant || "primary"}`;
  if (isDonateAction(action)) {
    return <DonateButton label={action.label} className={className} />;
  }
  return (
    <KpfButton href={action.href} className={className}>
      {action.label}
    </KpfButton>
  );
}

/**
 * Contact page scaffold — Figma 956:2439 / 956:2802 / 956:3045.
 * Uses the published WP form via `kpfForm(slug: "contact")`.
 */
export default function ContactPageScaffold({ form = null, media = {} }) {
  const copy = CONTACT;
  const router = useRouter();
  const inquiry =
    typeof router.query?.inquiry === "string" ? router.query.inquiry : "";

  const definition = useMemo(() => {
    const raw = form?.definitionJson || form?.definition || null;
    let parsed = raw;
    if (typeof raw === "string") {
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
    }
    return withContactFormUi(withInquiryDefault(parsed, inquiry));
  }, [form, inquiry]);

  const hero = copy.hero.media || {};
  const heroSrc = hero.src || "/media/contact/hero-bridge.webp";
  const ctaFlag = resolveMedia(media, copy.cta.media.key, copy.cta.media);

  useEffect(() => {
    if (inquiry) {
      const { scrollToTarget } = require("@/lib/smoothScrollTo");
      scrollToTarget("message", {
        smooth: true,
        updateHash: false,
      });
    }
  }, [inquiry]);

  return (
    <div className="kpf-page-contact" data-kpf-scaffold="contact">
      <section
        className="kpf-hero kpf-hero--contact"
        aria-labelledby="kpf-contact-hero-title"
      >
        {heroSrc ? (
          <div className="kpf-hero__media-frame">
            <picture className="kpf-hero__media-host">
              <source type="image/webp" srcSet="/media/contact/hero-bridge.webp" />
              <img
                className="kpf-hero__media"
                src="/media/contact/hero-bridge.jpg"
                alt={hero.alt || ""}
                decoding="async"
                fetchpriority="high"
              />
            </picture>
          </div>
        ) : null}
        <div className="kpf-hero__scrim" aria-hidden="true" />
        <div className="kpf-u-container kpf-hero__layout">
          <div className="kpf-hero__content">
            <div className="kpf-content-block">
              <div className="kpf-content-block__copy">
                <div className="kpf-content-block__title-group">
                  <p className="kpf-content-block__eyebrow">{copy.hero.eyebrow}</p>
                  <h1
                    id="kpf-contact-hero-title"
                    className="kpf-content-block__title kpf-content-block__title--h1"
                  >
                    {copy.hero.title}
                  </h1>
                </div>
                <div className="kpf-content-block__body-group">
                  <p className="kpf-content-block__body">{copy.hero.body}</p>
                </div>
              </div>
              <div className="kpf-content-block__actions kpf-hero__actions">
                <HeroAction action={copy.hero.primaryCta} />
                <HeroAction action={copy.hero.secondaryCta} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id={copy.form.id}
        className="kpf-contact kpf-section kpf-section--page"
        aria-labelledby="kpf-contact-form-title"
      >
        <div className="kpf-u-container kpf-contact__inner">
          <div className="kpf-contact__intro">
            <div className="kpf-content-block">
              <div className="kpf-content-block__copy">
                <div className="kpf-content-block__title-group">
                  <h2
                    id="kpf-contact-form-title"
                    className="kpf-content-block__title kpf-content-block__title--h2"
                  >
                    {copy.form.title}
                  </h2>
                </div>
                <div className="kpf-content-block__body-group">
                  {copy.form.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 48)} className="kpf-content-block__body">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="kpf-contact__form">
            {definition ? (
              <FormRenderer
                slug={form?.slug || "contact"}
                formId={form?.databaseId || 0}
                title={form?.title || "Contact"}
                definition={definition}
              />
            ) : (
              <p className="kpf-content-block__body">
                The contact form isn’t published yet. Check back shortly.
              </p>
            )}
          </div>
        </div>
      </section>

      <CtaClosingBand
        title={copy.cta.title}
        body={copy.cta.body}
        actions={copy.cta.actions}
        flagSrc={ctaFlag.src}
        titleId="kpf-contact-cta-title"
      />
    </div>
  );
}
