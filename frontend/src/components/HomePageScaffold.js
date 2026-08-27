import Head from "next/head";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import DonateButton, { isDonateAction } from "@/components/DonateButton";
import KpfImage from "@/components/KpfImage";
import KpfButton from "@/components/KpfButton";
import PartnersSlider from "@/components/PartnersSlider";
import ProgramsCheckRuntime, {
  ProgramsCheckIcon,
} from "@/components/ProgramsCheckRuntime";
import HomeHeroCutoutsRuntime from "@/components/HomeHeroCutoutsRuntime";
import { HOME } from "@/lib/pageCopy";
const { normalizeLatestBlogPost } = require("@/lib/latestBlogPost");
const { resolveMedia } = require("@/lib/scaffoldMedia");
const { normalizePartnerGrantees } = require("@/lib/partnerGrantees");

/** Match --kpf-accordion-duration; hold the outgoing panel so section height doesn’t dip. */
const ACCORDION_DURATION_MS = 280;
const ACCORDION_SWAP_HOLD_MS = Math.round(ACCORDION_DURATION_MS * 0.65);

export default function HomePageScaffold({
  media = {},
  partnerGrantees = [],
  latestBlogPost = null,
}) {
  const copy = HOME;
  const kevin = resolveMedia(media, copy.story.media.key, copy.story.media);
  const dunes = resolveMedia(media, copy.programs.media.key, copy.programs.media);
  const blogFallbackMedia = resolveMedia(
    media,
    copy.blog.featured.media.key,
    copy.blog.featured.media,
  );
  const blog = normalizeLatestBlogPost(latestBlogPost, {
    ...copy.blog.featured,
    media: blogFallbackMedia,
  });
  const [openAccordion, setOpenAccordion] = useState(
    () => copy.donate.accordions.find((item) => item.open)?.id ?? null,
  );
  /** Outgoing panels kept open briefly while the next one expands (avoids height stutter). */
  const [heldAccordionIds, setHeldAccordionIds] = useState([]);
  const accordionHoldTimerRef = useRef(null);
  const heroStageRef = useRef(null);

  useEffect(
    () => () => {
      if (accordionHoldTimerRef.current) {
        clearTimeout(accordionHoldTimerRef.current);
      }
    },
    [],
  );

  function selectAccordion(nextId) {
    if (accordionHoldTimerRef.current) {
      clearTimeout(accordionHoldTimerRef.current);
      accordionHoldTimerRef.current = null;
    }

    if (openAccordion === nextId) {
      setOpenAccordion(null);
      setHeldAccordionIds([]);
      return;
    }

    if (openAccordion && openAccordion !== nextId) {
      const previousId = openAccordion;
      setHeldAccordionIds((held) => {
        const next = new Set(held);
        next.add(previousId);
        next.delete(nextId);
        return [...next];
      });
      setOpenAccordion(nextId);
      accordionHoldTimerRef.current = setTimeout(() => {
        setHeldAccordionIds([]);
        accordionHoldTimerRef.current = null;
      }, ACCORDION_SWAP_HOLD_MS);
      return;
    }

    setHeldAccordionIds([]);
    setOpenAccordion(nextId);
  }

  const partners = normalizePartnerGrantees(partnerGrantees);
  const alumniCutout = (copy.hero.cutouts || []).find(
    (cutout) => cutout.key === "home.kevinAlumni",
  );
  const alumniSrc = alumniCutout
    ? resolveMedia(media, alumniCutout.key, alumniCutout).src
    : "";

  return (
    <div className="kpf-page-home" data-kpf-scaffold="home">
      <Head>
        {alumniSrc ? (
          <link
            rel="preload"
            as="image"
            href={alumniSrc}
            media="(min-width: 48rem)"
            fetchPriority="high"
          />
        ) : null}
      </Head>
      <ProgramsCheckRuntime />
      <section className="kpf-hero kpf-hero--home" aria-labelledby="kpf-home-hero-title">
        <div className="kpf-hero__scrim" aria-hidden="true" />
        <div ref={heroStageRef} className="kpf-hero__stage" aria-hidden="true">
          {(copy.hero.cutouts || []).map((cutout) => {
            const resolved = resolveMedia(media, cutout.key, cutout);
            if (!resolved.src) return null;
            const isAlumni = cutout.key === "home.kevinAlumni";
            return (
              <div key={cutout.key} className={cutout.className}>
                <KpfImage
                  src={resolved.src}
                  alt={resolved.alt || ""}
                  fill
                  sizes={
                    isAlumni
                      ? "(max-width: 47.99rem) 16px, (max-width: 63.99rem) 110vw, 42vw"
                      : "(max-width: 63.99rem) 16px, 38vw"
                  }
                  loading="lazy"
                />
              </div>
            );
          })}
        </div>
        <div className="kpf-u-container kpf-hero__layout">
          <div className="kpf-hero__content">
            <div className="kpf-content-block kpf-u-invert">
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
                {isDonateAction(copy.hero.primaryCta) ? (
                  <DonateButton
                    label={copy.hero.primaryCta.label}
                    className="kpf-btn kpf-btn--primary"
                  />
                ) : (
                  <KpfButton href={copy.hero.primaryCta.href} className="kpf-btn kpf-btn--primary">
                    {copy.hero.primaryCta.label}
                  </KpfButton>
                )}
                <Link
                  href={copy.hero.secondaryCta.href}
                  scroll={false}
                  className="kpf-link kpf-hero__text-link"
                >
                  {copy.hero.secondaryCta.label}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      <HomeHeroCutoutsRuntime stageRef={heroStageRef} />

      <PartnersSlider
        items={partners}
        label={copy.partners.label}
        href={copy.partners.href}
      />

      <section className="kpf-story kpf-section" aria-labelledby="kpf-home-story-title">
        <div className="kpf-story__media">
          {kevin.src ? (
            <KpfImage
              src={kevin.src}
              alt={kevin.alt || ""}
              width={640}
              height={760}
              sizes="(min-width: 64rem) 640px, (min-width: 48rem) 55vw, 100vw"
              priority
            />
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
                      <Link
                        key={action.href + action.label}
                        href={action.href}
                        scroll={false}
                        className="kpf-link"
                      >
                        {action.label}
                      </Link>
                    );
                  }
                  const className =
                    action.variant === "ink"
                      ? "kpf-btn kpf-btn--secondary"
                      : "kpf-btn kpf-btn--primary";
                  if (isDonateAction(action)) {
                    return (
                      <DonateButton
                        key={`donate-${action.label}`}
                        label={action.label}
                        className={className}
                      />
                    );
                  }
                  return (
                    <KpfButton
                      key={action.href + action.label}
                      href={action.href}
                      className={className}
                    >
                      {action.label}
                    </KpfButton>
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
                      <KpfImage
                        src={cardMedia.src}
                        alt={cardMedia.alt || ""}
                        fill
                        sizes="(min-width: 64rem) 22vw, (min-width: 48rem) 45vw, 92vw"
                      />
                    </div>
                  ) : null}
                  <div className="kpf-card__body">
                    <p className="kpf-card__eyebrow">{card.eyebrow}</p>
                    <h3 className="kpf-card__title">{card.title}</h3>
                    <p className="kpf-card__description">{card.body}</p>
                    <div className="kpf-card__actions">
                      {isDonateAction(card.cta) ? (
                        <DonateButton
                          label={card.cta.label}
                          className="kpf-btn kpf-btn--primary kpf-btn--sm"
                        />
                      ) : (
                        <KpfButton href={card.cta.href} className="kpf-btn kpf-btn--primary kpf-btn--sm">
                          {card.cta.label}
                        </KpfButton>
                      )}
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
                    <ProgramsCheckIcon size={28} />
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
              <KpfImage
                className="kpf-programs__dunes"
                src={dunes.src}
                alt={dunes.alt || ""}
                width={1200}
                height={800}
                sizes="(min-width: 64rem) 42vw, 100vw"
              />
            ) : null}
            <div className="kpf-programs__collage">
              {(copy.programs.collage || []).map((shot) => {
                const resolved = resolveMedia(media, shot.key, shot);
                if (!resolved.src) return null;
                return (
                  <KpfImage
                    key={shot.key}
                    src={resolved.src}
                    alt={resolved.alt || shot.alt || ""}
                    width={800}
                    height={600}
                    sizes="(min-width: 64rem) 20vw, 100vw"
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
          {blog ? (
            <Link
              href={blog.href}
              className={
                blog.media?.src
                  ? "kpf-archive__card kpf-archive__card--media"
                  : "kpf-archive__card"
              }
            >
              {blog.media?.src ? (
                <div className="kpf-archive__media">
                  <KpfImage
                    className="kpf-archive__thumb"
                    src={blog.media.src}
                    alt={blog.media.alt || ""}
                    width={1200}
                    height={800}
                    sizes="(min-width: 1201px) 36vw, 92vw"
                  />
                </div>
              ) : null}
              <div className="kpf-archive__meta">
                <p className="kpf-archive__category">{blog.category}</p>
                <p className="kpf-archive__date">
                  {blog.date}
                  {blog.date && blog.readTime ? (
                    <span aria-hidden="true"> — </span>
                  ) : null}
                  {blog.readTime}
                </p>
                <h3 className="kpf-content-block__title kpf-content-block__title--h3">
                  {blog.title}
                </h3>
                <span className="kpf-link">{blog.cta}</span>
              </div>
            </Link>
          ) : null}
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
                {isDonateAction(copy.donate.primaryCta) ? (
                  <DonateButton
                    label={copy.donate.primaryCta.label}
                    className="kpf-btn kpf-btn--primary"
                  />
                ) : (
                  <KpfButton href={copy.donate.primaryCta.href} className="kpf-btn kpf-btn--primary">
                    {copy.donate.primaryCta.label}
                  </KpfButton>
                )}
                <KpfButton href={copy.donate.secondaryCta.href} className="kpf-btn kpf-btn--secondary">
                  {copy.donate.secondaryCta.label}
                </KpfButton>
              </div>
            </div>
            <p className="kpf-donate__note">{copy.donate.note}</p>
          </div>
          <div className="kpf-donate__impact">
            <h3 className="kpf-h4">{copy.donate.impactTitle}</h3>
            <div className="kpf-donate__list">
              {copy.donate.accordions.map((item) => {
                const isOpen =
                  openAccordion === item.id ||
                  heldAccordionIds.includes(item.id);
                const isExpanded = openAccordion === item.id;
                const panelId = `kpf-donate-panel-${item.id}`;
                const headerId = `kpf-donate-header-${item.id}`;
                return (
                  <div
                    key={item.id}
                    className={`kpf-accordion${isOpen ? " is-open" : ""}`}
                  >
                    <button
                      type="button"
                      id={headerId}
                      className="kpf-accordion__header"
                      aria-expanded={isExpanded}
                      aria-controls={panelId}
                      onClick={() => selectAccordion(item.id)}
                    >
                      <h4 className="kpf-accordion__title">{item.title}</h4>
                      <span className="kpf-accordion__icon" aria-hidden="true">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.75"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          focusable="false"
                          style={{ transformOrigin: "50% 50%" }}
                        >
                          <path d="M5 12h14" />
                          <path d="M12 5v14" />
                        </svg>
                      </span>
                    </button>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={headerId}
                      className="kpf-accordion__body"
                      aria-hidden={!isOpen}
                    >
                      <div className="kpf-accordion__content">
                        <p>{item.body}</p>
                      </div>
                    </div>
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
