import Link from "next/link";
import { useState } from "react";
import PartnersSlider from "@/components/PartnersSlider";
import { HOME } from "@/lib/pageCopy";
const { resolveMedia } = require("@/lib/scaffoldMedia");
const { normalizePartnerGrantees } = require("@/lib/partnerGrantees");

function CheckIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <path
        d="M7.5 14.5 11.5 18.5 20.5 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Home scaffold — Figma Homepage Desktop hero `616:1060` (+ page `414:532`).
 */
export default function HomePageScaffold({ media = {}, partnerGrantees = [] }) {
  const copy = HOME;
  const kevin = resolveMedia(media, copy.story.media.key, copy.story.media);
  const dunes = resolveMedia(media, copy.programs.media.key, copy.programs.media);
  const blogMedia = resolveMedia(
    media,
    copy.blog.featured.media.key,
    copy.blog.featured.media,
  );
  const [openAccordion, setOpenAccordion] = useState(
    () => copy.donate.accordions.find((item) => item.open)?.id ?? null,
  );

  const partners = normalizePartnerGrantees(partnerGrantees);

  return (
    <div className="kpf-page-home" data-kpf-scaffold="home">
      <section className="kpf-hero kpf-hero--home" aria-labelledby="kpf-home-hero-title">
        <div className="kpf-hero__scrim" aria-hidden="true" />
        <div className="kpf-hero__stage" aria-hidden="true">
          {(copy.hero.cutouts || []).map((cutout) => {
            const resolved = resolveMedia(media, cutout.key, cutout);
            if (!resolved.src) return null;
            return (
              <img
                key={cutout.key}
                className={cutout.className}
                src={resolved.src}
                alt=""
                decoding="async"
              />
            );
          })}
        </div>
        <div className="kpf-u-container kpf-hero__layout">
          <div className="kpf-hero__content">
            <div className="kpf-content-block kpf-content-block--inverse">
              <div className="kpf-content-block__copy">
                <div className="kpf-content-block__title-group">
                  <p className="kpf-content-block__eyebrow">{copy.hero.eyebrow}</p>
                  <h1
                    id="kpf-home-hero-title"
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
                <Link href={copy.hero.secondaryCta.href} className="kpf-link kpf-hero__text-link">
                  {copy.hero.secondaryCta.label}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PartnersSlider items={partners} label={copy.partners.label} />

      <section className="kpf-story kpf-section" aria-labelledby="kpf-home-story-title">
        <div className="kpf-story__media">
          {kevin.src ? (
            <img src={kevin.src} alt={kevin.alt} loading="lazy" decoding="async" />
          ) : null}
        </div>
        <div className="kpf-u-container kpf-story__inner">
          <div className="kpf-story__copy">
            <div className="kpf-content-block">
              <div className="kpf-content-block__copy">
                <div className="kpf-content-block__title-group">
                  <p className="kpf-content-block__eyebrow">{copy.story.eyebrow}</p>
                  <h2
                    id="kpf-home-story-title"
                    className="kpf-content-block__title kpf-content-block__title--h2"
                  >
                    {copy.story.title}
                  </h2>
                </div>
                <div className="kpf-content-block__body-group">
                  {copy.story.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 40)} className="kpf-content-block__body">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
              <div className="kpf-content-block__actions kpf-story__actions">
                {copy.story.actions.map((action) => {
                  if (action.variant === "link") {
                    return (
                      <Link key={action.href + action.label} href={action.href} className="kpf-link">
                        {action.label}
                      </Link>
                    );
                  }
                  const className =
                    action.variant === "ink"
                      ? "kpf-btn kpf-btn--secondary"
                      : "kpf-btn kpf-btn--primary";
                  return (
                    <Link key={action.href + action.label} href={action.href} className={className}>
                      {action.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="kpf-values kpf-section kpf-values--cards" aria-labelledby="kpf-home-values-title">
        <div className="kpf-u-container">
          <div className="kpf-values__intro">
            <h2 id="kpf-home-values-title" className="kpf-h2">
              {copy.values.title}
            </h2>
            <p className="kpf-content-block__body">{copy.values.body}</p>
          </div>
          <div className="kpf-values__cards">
            {copy.values.cards.map((card) => {
              const cardMedia = resolveMedia(media, card.media.key, card.media);
              return (
                <article key={card.title} className="kpf-card kpf-values__card">
                  {cardMedia.src ? (
                    <div className="kpf-card__media">
                      <img src={cardMedia.src} alt={cardMedia.alt || ""} loading="lazy" decoding="async" />
                    </div>
                  ) : null}
                  <div className="kpf-card__body">
                    <p className="kpf-card__eyebrow">{card.eyebrow}</p>
                    <h3 className="kpf-card__title">{card.title}</h3>
                    <p className="kpf-card__description">{card.body}</p>
                    <div className="kpf-card__actions">
                      <Link href={card.cta.href} className="kpf-btn kpf-btn--primary kpf-btn--sm">
                        {card.cta.label}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id={copy.programs.id}
        className="kpf-programs kpf-section"
        aria-labelledby="kpf-home-programs-title"
      >
        <div className="kpf-u-container kpf-programs__inner">
          <div className="kpf-programs__copy">
            <div className="kpf-content-block">
              <div className="kpf-content-block__copy">
                <div className="kpf-content-block__title-group">
                  <p className="kpf-content-block__eyebrow">{copy.programs.eyebrow}</p>
                  <h2
                    id="kpf-home-programs-title"
                    className="kpf-content-block__title kpf-content-block__title--h2"
                  >
                    {copy.programs.title}
                  </h2>
                </div>
                <div className="kpf-content-block__body-group">
                  <p className="kpf-content-block__body">{copy.programs.body}</p>
                </div>
              </div>
            </div>
            <ul className="kpf-programs__list">
              {copy.programs.items.map((item) => (
                <li key={item.title} className="kpf-programs__item">
                  <span className="kpf-programs__check" aria-hidden="true">
                    <CheckIcon />
                  </span>
                  <div>
                    <h3 className="kpf-programs__item-title">{item.title}</h3>
                    <p className="kpf-programs__item-body">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="kpf-programs__media">
            {dunes.src ? (
              <img
                className="kpf-programs__dunes"
                src={dunes.src}
                alt={dunes.alt}
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <div className="kpf-programs__collage">
              {(copy.programs.collage || []).map((shot) => {
                const resolved = resolveMedia(media, shot.key, shot);
                if (!resolved.src) return null;
                return (
                  <img
                    key={shot.key}
                    src={resolved.src}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="kpf-archive kpf-section" aria-labelledby="kpf-home-blog-title">
        <div className="kpf-u-container kpf-archive__inner">
          <div className="kpf-archive__intro kpf-content-block">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">{copy.blog.eyebrow}</p>
                <h2 id="kpf-home-blog-title" className="kpf-content-block__title kpf-content-block__title--h2">
                  {copy.blog.title}
                </h2>
              </div>
              <div className="kpf-content-block__body-group">
                <p className="kpf-content-block__body">{copy.blog.body}</p>
              </div>
            </div>
          </div>
          <Link href={copy.blog.featured.href} className="kpf-archive__card">
            {blogMedia.src ? (
              <img
                className="kpf-archive__thumb"
                src={blogMedia.src}
                alt={blogMedia.alt || ""}
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <div className="kpf-archive__meta">
              <p className="kpf-archive__category">{copy.blog.featured.category}</p>
              <p className="kpf-archive__date">
                {copy.blog.featured.date}
                <span aria-hidden="true"> · </span>
                {copy.blog.featured.readTime}
              </p>
              <h3 className="kpf-archive__title">{copy.blog.featured.title}</h3>
              <span className="kpf-link">{copy.blog.featured.cta}</span>
            </div>
          </Link>
        </div>
      </section>

      <section
        id={copy.donate.id}
        className="kpf-donate kpf-section kpf-donate--band"
        aria-labelledby="kpf-home-donate-title"
      >
        <div className="kpf-u-container kpf-donate__inner">
          <div className="kpf-donate__copy">
            <div className="kpf-content-block kpf-u-invert">
              <div className="kpf-content-block__copy">
                <div className="kpf-content-block__title-group">
                  <p className="kpf-content-block__eyebrow">{copy.donate.eyebrow}</p>
                  <h2
                    id="kpf-home-donate-title"
                    className="kpf-content-block__title kpf-content-block__title--h2"
                  >
                    {copy.donate.titleBefore}
                    <span className="kpf-donate__emphasis">{copy.donate.titleEmphasized}</span>
                    {copy.donate.titleAfter}
                  </h2>
                </div>
                <div className="kpf-content-block__body-group">
                  <p className="kpf-content-block__body">{copy.donate.body}</p>
                </div>
              </div>
              <div className="kpf-content-block__actions">
                <Link href={copy.donate.primaryCta.href} className="kpf-btn kpf-btn--primary">
                  {copy.donate.primaryCta.label}
                </Link>
                <Link href={copy.donate.secondaryCta.href} className="kpf-btn kpf-btn--secondary">
                  {copy.donate.secondaryCta.label}
                </Link>
              </div>
            </div>
            <p className="kpf-donate__note">{copy.donate.note}</p>
          </div>
          <div className="kpf-donate__impact">
            <h3 className="kpf-h4">{copy.donate.impactTitle}</h3>
            <div className="kpf-donate__list">
              {copy.donate.accordions.map((item) => {
                const isOpen = openAccordion === item.id;
                return (
                  <div
                    key={item.id}
                    className={`kpf-accordion${isOpen ? " is-open" : ""}`}
                  >
                    <button
                      type="button"
                      className="kpf-accordion__header"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenAccordion((current) =>
                          current === item.id ? null : item.id,
                        )
                      }
                    >
                      <span className="kpf-accordion__title">{item.title}</span>
                      <span className="kpf-accordion__icon" aria-hidden="true">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen ? (
                      <div className="kpf-accordion__body">
                        <p>{item.body}</p>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
