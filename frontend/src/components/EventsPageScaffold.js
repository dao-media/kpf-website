import Link from "next/link";
import { EVENTS } from "@/lib/pageCopy";
const { resolveMedia } = require("@/lib/scaffoldMedia");

function ActionLink({ action }) {
  const className = `kpf-btn kpf-btn--${action.variant || "primary"}`;
  if (action.external) {
    return (
      <a href={action.href} className={className} target="_blank" rel="noopener noreferrer">
        {action.label}
        <span className="kpf-u-sr-only"> (opens in a new tab)</span>
      </a>
    );
  }
  return (
    <Link href={action.href} className={className}>
      {action.label}
    </Link>
  );
}

export default function EventsPageScaffold({ media = {} }) {
  const copy = EVENTS;
  const hero = resolveMedia(media, copy.hero.media.key, copy.hero.media);
  const featured = resolveMedia(media, copy.featured.media.key, copy.featured.media);
  const library = resolveMedia(media, copy.library.media.key, copy.library.media);

  return (
    <div className="kpf-page-events" data-kpf-scaffold="events">
      <section className="kpf-hero kpf-hero--events" aria-labelledby="kpf-events-hero-title">
        {hero.src ? (
          <img className="kpf-hero__media" src={hero.src} alt={hero.alt} decoding="async" />
        ) : null}
        <div className="kpf-hero__scrim" aria-hidden="true" />
        <div className="kpf-hero__content">
          <div className="kpf-content-block kpf-content-block--inverse">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">{copy.hero.eyebrow}</p>
                <h1
                  id="kpf-events-hero-title"
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
              <Link href={copy.hero.primaryCta.href} className="kpf-btn kpf-btn--primary">
                {copy.hero.primaryCta.label}
              </Link>
              <Link href={copy.hero.secondaryCta.href} className="kpf-btn kpf-btn--secondary">
                {copy.hero.secondaryCta.label}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="kpf-context kpf-section kpf-section--page" aria-labelledby="kpf-events-context-title">
        <div className="kpf-u-container">
          <div className="kpf-content-block">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">{copy.context.eyebrow}</p>
                <h2
                  id="kpf-events-context-title"
                  className="kpf-content-block__title kpf-content-block__title--h2"
                >
                  {copy.context.title}
                </h2>
              </div>
              <div className="kpf-content-block__body-group">
                {copy.context.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="kpf-content-block__body">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
            <div className="kpf-content-block__actions">
              <Link href={copy.context.cta.href} className="kpf-btn kpf-btn--secondary">
                {copy.context.cta.label}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        id={copy.featured.id}
        className="kpf-featured-event kpf-section kpf-section--surface"
        aria-labelledby="kpf-events-featured-title"
      >
        {featured.src ? (
          <img
            src={featured.src}
            alt={featured.alt}
            loading="lazy"
            decoding="async"
            style={{
              borderRadius: "var(--kpf-radius-lg)",
              display: "block",
              width: "100%",
              height: "auto",
              objectFit: "cover",
            }}
          />
        ) : null}
        <div className="kpf-content-block">
          <div className="kpf-content-block__copy">
            <div className="kpf-content-block__title-group">
              <p className="kpf-content-block__eyebrow">{copy.featured.eyebrow}</p>
              <h2
                id="kpf-events-featured-title"
                className="kpf-content-block__title kpf-content-block__title--h2"
              >
                {copy.featured.title}
              </h2>
            </div>
            <div className="kpf-content-block__body-group">
              {copy.featured.body.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="kpf-content-block__body">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
          <div className="kpf-content-block__actions">
            {copy.featured.actions.map((action) => (
              <ActionLink key={action.href} action={action} />
            ))}
          </div>
        </div>
      </section>

      <section className="kpf-event-library kpf-section" aria-labelledby="kpf-events-library-title">
        <div className="kpf-u-container">
          <div className="kpf-content-block">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">{copy.library.eyebrow}</p>
                <h2
                  id="kpf-events-library-title"
                  className="kpf-content-block__title kpf-content-block__title--h2"
                >
                  {copy.library.title}
                </h2>
              </div>
              <div className="kpf-content-block__body-group">
                <h3 className="kpf-content-block__title kpf-content-block__title--h3">
                  {copy.library.emptyTitle}
                </h3>
                <p className="kpf-content-block__body">{copy.library.emptyBody}</p>
              </div>
            </div>
            <div className="kpf-content-block__actions">
              <Link href="/contact/" className="kpf-btn kpf-btn--secondary">
                Get in touch
              </Link>
            </div>
          </div>
          {library.src ? (
            <div className="kpf-event-library__grid" style={{ marginTop: "var(--kpf-space-xl)" }}>
              <img
                src={library.src}
                alt={library.alt}
                loading="lazy"
                decoding="async"
                style={{
                  borderRadius: "var(--kpf-radius-md)",
                  display: "block",
                  width: "100%",
                  height: "auto",
                }}
              />
            </div>
          ) : null}
        </div>
      </section>

      <section className="kpf-cta-closing kpf-section" aria-labelledby="kpf-events-cta-title">
        <div className="kpf-u-container">
          <div className="kpf-content-block kpf-content-block--inverse">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <h2
                  id="kpf-events-cta-title"
                  className="kpf-content-block__title kpf-content-block__title--h2"
                >
                  {copy.cta.title}
                </h2>
              </div>
              <div className="kpf-content-block__body-group">
                <p className="kpf-content-block__body">{copy.cta.body}</p>
              </div>
            </div>
            <div className="kpf-content-block__actions">
              {copy.cta.actions.map((action) => (
                <ActionLink key={action.href} action={action} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
