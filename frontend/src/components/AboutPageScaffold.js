import Link from "next/link";
import { ABOUT } from "@/lib/pageCopy";
const { resolveMedia } = require("@/lib/scaffoldMedia");

export default function AboutPageScaffold({ media = {} }) {
  const copy = ABOUT;
  const background = resolveMedia(media, copy.hero.background.key, copy.hero.background);
  const frame = resolveMedia(media, copy.hero.frame.key, copy.hero.frame);

  return (
    <div className="kpf-page-about" data-kpf-scaffold="about">
      <section className="kpf-hero kpf-hero--about" aria-labelledby="kpf-about-hero-title">
        {background.src ? (
          <img
            className="kpf-hero__media"
            src={background.src}
            alt={background.alt}
            decoding="async"
          />
        ) : null}
        <div className="kpf-hero__frame">
          {frame.src ? <img src={frame.src} alt={frame.alt} decoding="async" /> : null}
        </div>
        <div className="kpf-hero__content">
          <div className="kpf-content-block">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">{copy.hero.eyebrow}</p>
                <h1
                  id="kpf-about-hero-title"
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

      <section className="kpf-history kpf-section kpf-section--page" aria-labelledby="kpf-about-history-title">
        <div
          className="kpf-history__stack"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 40% 30%, color-mix(in srgb, var(--kpf-ember) 28%, transparent), transparent 55%), url(/media/kpf-tartan-tile.png)",
            backgroundSize: "auto, 220px",
            borderRadius: "var(--kpf-radius-lg)",
          }}
        >
          {copy.history.layers.map((layer) => {
            const resolved = resolveMedia(media, layer.key, layer);
            if (!resolved.src) return null;
            return (
              <div key={layer.key || layer.src} className={`kpf-history__layer ${layer.className}`}>
                <img src={resolved.src} alt={resolved.alt} loading="lazy" decoding="async" />
              </div>
            );
          })}
        </div>
        <div className="kpf-history__card">
          <div className="kpf-content-block">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">{copy.history.eyebrow}</p>
                <h2
                  id="kpf-about-history-title"
                  className="kpf-content-block__title kpf-content-block__title--h2"
                >
                  {copy.history.title}
                </h2>
              </div>
              <div className="kpf-content-block__body-group">
                {copy.history.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="kpf-content-block__body">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id={copy.mission.id}
        className="kpf-mission kpf-section kpf-section--surface"
        aria-labelledby="kpf-about-mission-title"
      >
        <div className="kpf-u-container kpf-u-container--narrow">
          <div className="kpf-content-block">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">{copy.mission.eyebrow}</p>
                <h2
                  id="kpf-about-mission-title"
                  className="kpf-content-block__title kpf-content-block__title--h2"
                >
                  {copy.mission.title}
                </h2>
              </div>
              <div className="kpf-content-block__body-group">
                {copy.mission.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="kpf-content-block__body">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="kpf-section kpf-section--page" aria-labelledby="kpf-about-choose-title">
        <div className="kpf-u-container kpf-u-container--narrow">
          <div className="kpf-content-block">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">{copy.choose.eyebrow}</p>
                <h2
                  id="kpf-about-choose-title"
                  className="kpf-content-block__title kpf-content-block__title--h2"
                >
                  {copy.choose.title}
                </h2>
              </div>
              <div className="kpf-content-block__body-group">
                {copy.choose.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="kpf-content-block__body">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="kpf-grantees kpf-section kpf-section--surface" aria-labelledby="kpf-about-grantees-title">
        <div className="kpf-u-container">
          <div className="kpf-content-block">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">{copy.grantees.eyebrow}</p>
                <h2
                  id="kpf-about-grantees-title"
                  className="kpf-content-block__title kpf-content-block__title--h2"
                >
                  {copy.grantees.title}
                </h2>
              </div>
              <div className="kpf-content-block__body-group">
                <p className="kpf-content-block__body">{copy.grantees.body}</p>
                <p className="kpf-content-block__notation">{copy.grantees.note}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="kpf-cta-closing kpf-section" aria-labelledby="kpf-about-cta-title">
        <div className="kpf-u-container">
          <div className="kpf-content-block kpf-content-block--inverse">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">{copy.cta.eyebrow}</p>
                <h2
                  id="kpf-about-cta-title"
                  className="kpf-content-block__title kpf-content-block__title--h2"
                >
                  {copy.cta.title}
                </h2>
              </div>
            </div>
            <div className="kpf-content-block__actions">
              {copy.cta.actions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`kpf-btn kpf-btn--${action.variant}`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
