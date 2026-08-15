import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { ABOUT } from "@/lib/pageCopy";
import GranteeCardsSlider from "@/components/GranteeCardsSlider";
const { resolveMedia } = require("@/lib/scaffoldMedia");

/** Match --kpf-accordion-duration; hold outgoing panel so section height doesn’t dip. */
const ACCORDION_HOLD_MS = 180;

export default function AboutPageScaffold({ media = {} }) {
  const copy = ABOUT;
  const background = resolveMedia(media, copy.hero.background.key, copy.hero.background);
  const frame = resolveMedia(media, copy.hero.frame.key, copy.hero.frame);
  const featured = resolveMedia(media, copy.gallery.featured.key, copy.gallery.featured);

  const [openAccordion, setOpenAccordion] = useState(
    () => copy.mission.criteria.find((item) => item.open)?.id ?? null,
  );
  const [heldAccordionIds, setHeldAccordionIds] = useState([]);
  const accordionHoldTimerRef = useRef(null);
  const [historySlide, setHistorySlide] = useState(0);

  useEffect(() => {
    return () => {
      if (accordionHoldTimerRef.current) {
        clearTimeout(accordionHoldTimerRef.current);
      }
    };
  }, []);

  function selectAccordion(id) {
    if (accordionHoldTimerRef.current) {
      clearTimeout(accordionHoldTimerRef.current);
      accordionHoldTimerRef.current = null;
    }

    setOpenAccordion((current) => {
      if (current === id) {
        setHeldAccordionIds([]);
        return null;
      }

      if (current) {
        setHeldAccordionIds([current]);
        accordionHoldTimerRef.current = setTimeout(() => {
          setHeldAccordionIds([]);
          accordionHoldTimerRef.current = null;
        }, ACCORDION_HOLD_MS);
      } else {
        setHeldAccordionIds([]);
      }

      return id;
    });
  }

  const historyDotCount = copy.history.layers.length;

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

      <section
        id={copy.history.id}
        className="kpf-history kpf-section kpf-section--page"
        aria-labelledby="kpf-about-history-title"
      >
        <div className="kpf-u-container">
          <div className="kpf-history__intro kpf-content-block">
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
                <p className="kpf-content-block__body kpf-content-block__body--lede">
                  {copy.history.intro}
                </p>
              </div>
            </div>
          </div>

          <div className="kpf-history__split">
            <div className="kpf-history__stack">
              <div className="kpf-history__stage">
                {copy.history.layers.map((layer) => {
                  const resolved = resolveMedia(media, layer.key, layer);
                  if (!resolved.src) return null;
                  return (
                    <div
                      key={layer.key || layer.src}
                      className={`kpf-history__layer ${layer.className}`}
                    >
                      <img
                        src={resolved.src}
                        alt={resolved.alt}
                        width={1120}
                        height={1296}
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="kpf-history__aside">
              <div className="kpf-history__card">
                <div className="kpf-content-block">
                  <div className="kpf-content-block__copy">
                    <div className="kpf-content-block__title-group">
                      <p className="kpf-content-block__eyebrow">{copy.history.card.eyebrow}</p>
                      <h3 className="kpf-content-block__title kpf-content-block__title--h3">
                        {copy.history.card.title}
                      </h3>
                    </div>
                    <div className="kpf-content-block__body-group">
                      {copy.history.card.body.map((paragraph) => (
                        <p key={paragraph.slice(0, 40)} className="kpf-content-block__body">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="kpf-history__dots" role="tablist" aria-label="History slides">
                {Array.from({ length: historyDotCount }, (_, i) => (
                  <button
                    key={`history-dot-${i}`}
                    type="button"
                    role="tab"
                    className={`kpf-history__dot${i === historySlide ? " is-active" : ""}`}
                    aria-label={`Show history image ${i + 1} of ${historyDotCount}`}
                    aria-selected={i === historySlide}
                    aria-current={i === historySlide ? "true" : undefined}
                    onClick={() => setHistorySlide(i)}
                  />
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
        <div className="kpf-u-container kpf-mission__inner">
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

          <div className="kpf-mission__criteria kpf-donate__list">
            {copy.mission.criteria.map((item) => {
              const isOpen =
                openAccordion === item.id || heldAccordionIds.includes(item.id);
              const isExpanded = openAccordion === item.id;
              return (
                <div
                  key={item.id}
                  className={`kpf-accordion${isOpen ? " is-open" : ""}`}
                >
                  <button
                    type="button"
                    className="kpf-accordion__header"
                    aria-expanded={isExpanded}
                    onClick={() => selectAccordion(item.id)}
                  >
                    <span className="kpf-accordion__leading" aria-hidden="true">
                      <Check size={20} strokeWidth={2} absoluteStrokeWidth />
                    </span>
                    <span className="kpf-accordion__title">{item.title}</span>
                    <span className="kpf-accordion__icon" aria-hidden="true">
                      <Plus
                        size={20}
                        strokeWidth={1.75}
                        absoluteStrokeWidth
                        style={{ transformOrigin: "50% 50%" }}
                      />
                    </span>
                  </button>
                  <div className="kpf-accordion__body" aria-hidden={!isOpen}>
                    <div className="kpf-accordion__content">
                      <p>{item.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="kpf-grantees kpf-section kpf-section--page" aria-labelledby="kpf-about-grantees-title">
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
              </div>
            </div>
          </div>
          <GranteeCardsSlider items={copy.grantees.items} label={copy.grantees.title} />
        </div>
      </section>

      <section className="kpf-gallery kpf-section" aria-labelledby="kpf-about-gallery-title">
        <div className="kpf-u-container">
          <div className="kpf-content-block kpf-content-block--inverse">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">{copy.gallery.eyebrow}</p>
                <h2
                  id="kpf-about-gallery-title"
                  className="kpf-content-block__title kpf-content-block__title--h2"
                >
                  {copy.gallery.title}
                </h2>
              </div>
              <div className="kpf-content-block__body-group">
                <p className="kpf-content-block__body">{copy.gallery.body}</p>
              </div>
            </div>
          </div>

          <div className="kpf-gallery__layout">
            {featured.src ? (
              <figure className="kpf-gallery__featured">
                <img
                  src={featured.src}
                  alt={featured.alt}
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            ) : null}
            <div className="kpf-gallery__grid">
              {copy.gallery.items.map((item) => {
                const resolved = resolveMedia(media, item.key, item);
                if (!resolved.src) return null;
                return (
                  <figure key={item.key || item.src} className="kpf-gallery__item">
                    <img
                      src={resolved.src}
                      alt={resolved.alt}
                      loading="lazy"
                      decoding="async"
                    />
                  </figure>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="kpf-cta-closing kpf-section" aria-labelledby="kpf-about-cta-title">
        <div className="kpf-u-container">
          <div className="kpf-content-block kpf-content-block--inverse kpf-cta-closing__block">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <h2
                  id="kpf-about-cta-title"
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
