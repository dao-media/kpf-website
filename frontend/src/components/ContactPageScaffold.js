import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo } from "react";
import DonateButton from "@/components/DonateButton";
import FormRenderer from "@/components/FormRenderer";
import { CONTACT } from "@/lib/pageCopy";

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

/**
 * Contact page scaffold — ways to help + FormRenderer + sidebar.
 */
export default function ContactPageScaffold({ form = null }) {
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
    return withInquiryDefault(parsed, inquiry);
  }, [form, inquiry]);

  useEffect(() => {
    if (inquiry) {
      const { scrollToTarget } = require("@/lib/smoothScrollTo");
      scrollToTarget("kpf-contact-form-title", {
        smooth: true,
        updateHash: false,
      });
    }
  }, [inquiry]);

  return (
    <div className="kpf-page-contact" data-kpf-scaffold="contact">
      <section className="kpf-hero kpf-hero--contact" aria-labelledby="kpf-contact-hero-title">
        <div className="kpf-hero__scrim" aria-hidden="true" />
        <div className="kpf-hero__content">
          <div className="kpf-content-block kpf-content-block--inverse">
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
          </div>
        </div>
      </section>

      <section className="kpf-section kpf-section--page" aria-labelledby="kpf-contact-ways-title">
        <div className="kpf-u-container">
          <div className="kpf-content-block">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">{copy.ways.eyebrow}</p>
                <h2
                  id="kpf-contact-ways-title"
                  className="kpf-content-block__title kpf-content-block__title--h2"
                >
                  {copy.ways.title}
                </h2>
              </div>
            </div>
          </div>
          <div className="kpf-values__grid">
            {copy.ways.cards.map((card) => (
              <div key={card.title} className="kpf-content-block">
                <div className="kpf-content-block__copy">
                  <div className="kpf-content-block__title-group">
                    <h3 className="kpf-content-block__title kpf-content-block__title--h3">
                      {card.title}
                    </h3>
                  </div>
                  <div className="kpf-content-block__body-group">
                    <p className="kpf-content-block__body">{card.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="kpf-contact kpf-section kpf-section--surface" aria-labelledby="kpf-contact-form-title">
        <div className="kpf-u-container kpf-u-split">
          <div>
            <div className="kpf-content-block">
              <div className="kpf-content-block__copy">
                <div className="kpf-content-block__title-group">
                  <p className="kpf-content-block__eyebrow">{copy.form.eyebrow}</p>
                  <h2
                    id="kpf-contact-form-title"
                    className="kpf-content-block__title kpf-content-block__title--h2"
                  >
                    {copy.form.title}
                  </h2>
                </div>
                <div className="kpf-content-block__body-group">
                  <p className="kpf-content-block__body">{copy.form.body}</p>
                </div>
              </div>
            </div>
            {definition ? (
              <FormRenderer
                slug={form?.slug || "contact"}
                formId={form?.databaseId || 0}
                title={form?.title || "Contact"}
                definition={definition}
              />
            ) : (
              <p className="kpf-content-block__body">
                The contact form isn’t published yet. Check back shortly, or use the
                sidebar details once they’re confirmed.
              </p>
            )}
          </div>
          <aside className="kpf-content-block kpf-contact__aside">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">{copy.aside.eyebrow}</p>
                <h2 className="kpf-content-block__title kpf-content-block__title--h3">
                  {copy.aside.title}
                </h2>
              </div>
              <div className="kpf-content-block__body-group">
                <address className="kpf-content-block__body">
                  <strong>{copy.aside.org}</strong>
                  <br />
                  {copy.aside.note}
                </address>
                <p className="kpf-content-block__body">
                  Prefer to just give?{" "}
                  <DonateButton
                    label={copy.aside.donate.label}
                    className="kpf-btn kpf-btn--primary kpf-btn--sm"
                  />
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
