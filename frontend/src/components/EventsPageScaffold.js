import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarHeart,
  Check,
  ExternalLink,
  MapPin,
  Plus,
  Ticket,
} from "lucide-react";
import { EVENTS } from "@/lib/pageCopy";
import CtaClosingFlag from "@/components/CtaClosingFlag";
import KpfButton from "@/components/KpfButton";
const { resolveMedia } = require("@/lib/scaffoldMedia");

/** Match --kpf-accordion-duration; hold outgoing panel so section height doesn’t dip. */
const ACCORDION_HOLD_MS = 180;

function ActionLink({ action }) {
  const className = `kpf-btn kpf-btn--${action.variant || "primary"}`;
  return (
    <KpfButton
      href={action.href}
      external={Boolean(action.external)}
      className={className}
    >
      {action.label}
      {action.trailingIcon === "arrow" ? (
        <ArrowRight size={20} strokeWidth={2} absoluteStrokeWidth aria-hidden />
      ) : null}
      {action.trailingIcon === "external" ? (
        <ExternalLink size={20} strokeWidth={2} absoluteStrokeWidth aria-hidden />
      ) : null}
    </KpfButton>
  );
}

/** Same markup/classes as GranteeCard chips (Grant Amount / Date / Website). */
function GrantChip({ icon: Icon, label }) {
  return (
    <span className="kpf-grantee-card__chip">
      <span className="kpf-grantee-card__chip-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={1.75} absoluteStrokeWidth />
      </span>
      <span className="kpf-grantee-card__chip-label">{label}</span>
    </span>
  );
}

function EventCard({ event, markSrc, markAlt }) {
  const ticketsHref = event.ticketsHref || "";
  const ticketsExternal = Boolean(event.ticketsExternal);
  const ticketsLabel = event.ticketsLabel || "Get tickets";

  return (
    <article className="kpf-event-card">
      <div className="kpf-event-card__body">
        <div className="kpf-event-card__header">
          <h3 className="kpf-event-card__title">{event.title}</h3>
          {markSrc ? (
            <img
              className="kpf-event-card__mark"
              src={markSrc}
              alt={markAlt || ""}
              width={42}
              height={42}
              loading="lazy"
              decoding="async"
            />
          ) : null}
        </div>
        <p className="kpf-event-card__body-text">{event.body}</p>
        <div className="kpf-event-card__meta kpf-grantee-card__meta">
          <GrantChip icon={CalendarHeart} label={event.dateLabel} />
          {ticketsHref ? (
            <a
              className="kpf-grantee-card__chip kpf-grantee-card__chip--link"
              href={ticketsHref}
              {...(ticketsExternal
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              <span className="kpf-grantee-card__chip-label">{ticketsLabel}</span>
              <span className="kpf-grantee-card__chip-icon" aria-hidden="true">
                <ArrowRight size={16} strokeWidth={1.75} absoluteStrokeWidth />
              </span>
            </a>
          ) : (
            <GrantChip icon={Ticket} label={ticketsLabel} />
          )}
        </div>
      </div>
    </article>
  );
}

export default function EventsPageScaffold({ media = {} }) {
  const copy = EVENTS;
  const hero = resolveMedia(media, copy.hero.media.key, copy.hero.media);
  const cardMark = resolveMedia(
    media,
    copy.library.cardMark.key,
    copy.library.cardMark,
  );
  const ctaFlag = resolveMedia(media, copy.cta.media.key, copy.cta.media);
  const collage = (copy.featured.collage || []).map((item) =>
    resolveMedia(media, item.key, item),
  );

  const [openAccordion, setOpenAccordion] = useState(
    () => copy.context.paths.find((item) => item.open)?.id ?? null,
  );
  const [heldAccordionIds, setHeldAccordionIds] = useState([]);
  const accordionHoldTimerRef = useRef(null);

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
      const next = current === id ? null : id;
      if (current && current !== next) {
        setHeldAccordionIds((held) =>
          held.includes(current) ? held : [...held, current],
        );
        accordionHoldTimerRef.current = setTimeout(() => {
          setHeldAccordionIds((held) => held.filter((item) => item !== current));
          accordionHoldTimerRef.current = null;
        }, ACCORDION_HOLD_MS);
      }
      return next;
    });
  }

  const events = Array.isArray(copy.library.items) ? copy.library.items : [];

  return (
    <div className="kpf-page-events" data-kpf-scaffold="events">
      <section className="kpf-hero kpf-hero--events" aria-labelledby="kpf-events-hero-title">
        {hero.src ? (
          <picture>
            {hero.src.endsWith(".jpg") || hero.src.endsWith(".jpeg") ? (
              <source
                type="image/webp"
                srcSet={hero.src.replace(/\.(jpe?g)$/i, ".webp")}
              />
            ) : null}
            <img
              className="kpf-hero__media"
              src={hero.src}
              alt={hero.alt || ""}
              decoding="async"
              fetchPriority="high"
            />
          </picture>
        ) : null}
        <div className="kpf-hero__scrim" aria-hidden="true" />
        <div className="kpf-hero__content">
          <div className="kpf-content-block kpf-u-invert">
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
              <ActionLink action={copy.hero.primaryCta} />
              <KpfButton
                href={copy.hero.secondaryCta.href}
                className="kpf-btn kpf-btn--outline"
              >
                {copy.hero.secondaryCta.label}
              </KpfButton>
            </div>
          </div>
        </div>
      </section>

      <section
        id="partner"
        className="kpf-events-partner kpf-section kpf-section--page"
        aria-labelledby="kpf-events-context-title"
      >
        <div className="kpf-u-container kpf-events-partner__inner">
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
              <KpfButton href={copy.context.cta.href} className="kpf-btn kpf-btn--primary">
                {copy.context.cta.label}
              </KpfButton>
            </div>
          </div>

          <div className="kpf-events-partner__paths kpf-donate__list">
            {copy.context.paths.map((item) => {
              const isOpen =
                openAccordion === item.id || heldAccordionIds.includes(item.id);
              const isExpanded = openAccordion === item.id;
              const panelId = `kpf-events-path-panel-${item.id}`;
              const headerId = `kpf-events-path-header-${item.id}`;
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
                    <span className="kpf-accordion__leading" aria-hidden="true">
                      <Check size={20} strokeWidth={2} absoluteStrokeWidth />
                    </span>
                    <h5 className="kpf-accordion__title">{item.title}</h5>
                    <span className="kpf-accordion__icon" aria-hidden="true">
                      <Plus
                        size={20}
                        strokeWidth={1.75}
                        absoluteStrokeWidth
                        style={{ transformOrigin: "50% 50%" }}
                      />
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
      </section>

      <section
        id={copy.featured.id}
        className="kpf-featured-event kpf-section"
        aria-labelledby="kpf-events-featured-title"
      >
        <div className="kpf-u-container kpf-featured-event__inner">
          <div className="kpf-featured-event__collage" aria-hidden={collage.every((m) => !m.src)}>
            <div className="kpf-featured-event__collage-row kpf-featured-event__collage-row--top">
              {collage.slice(0, 2).map((tile, index) =>
                tile.src ? (
                  <figure
                    key={tile.key || tile.src}
                    className={`kpf-featured-event__tile kpf-featured-event__tile--${index + 1}`}
                  >
                    <img src={tile.src} alt="" loading="lazy" decoding="async" />
                  </figure>
                ) : null,
              )}
            </div>
            <div className="kpf-featured-event__collage-row kpf-featured-event__collage-row--bottom">
              {collage.slice(2, 4).map((tile, index) =>
                tile.src ? (
                  <figure
                    key={tile.key || tile.src}
                    className={`kpf-featured-event__tile kpf-featured-event__tile--${index + 3}`}
                  >
                    <img src={tile.src} alt="" loading="lazy" decoding="async" />
                  </figure>
                ) : null,
              )}
            </div>
          </div>

          <div className="kpf-content-block kpf-u-invert kpf-featured-event__copy">
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

            <div
              className="kpf-featured-event__chips kpf-grantee-card__meta"
              aria-label="Event details"
            >
              {copy.featured.meta.map((chip) => {
                const Icon =
                  chip.icon === "map"
                    ? MapPin
                    : chip.icon === "ticket"
                      ? Ticket
                      : CalendarHeart;
                return <GrantChip key={chip.label} icon={Icon} label={chip.label} />;
              })}
            </div>

            <div className="kpf-content-block__actions">
              {copy.featured.actions.map((action) => (
                <ActionLink key={`${action.href}-${action.label}`} action={action} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        className="kpf-event-library kpf-section"
        aria-labelledby="kpf-events-library-title"
      >
        <div className="kpf-u-container">
          <div className="kpf-content-block kpf-event-library__intro">
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
              {copy.library.body ? (
                <div className="kpf-content-block__body-group">
                  <p className="kpf-content-block__body">{copy.library.body}</p>
                </div>
              ) : null}
            </div>
          </div>

          {events.length > 0 ? (
            <div className="kpf-event-library__grid">
              {events.map((event) => (
                <EventCard
                  key={event.id || event.title}
                  event={event}
                  markSrc={cardMark.src}
                  markAlt={cardMark.alt}
                />
              ))}
            </div>
          ) : (
            <div className="kpf-content-block kpf-event-library__empty">
              <div className="kpf-content-block__copy">
                <div className="kpf-content-block__title-group">
                  <h3 className="kpf-content-block__title kpf-content-block__title--h3">
                    {copy.library.emptyTitle}
                  </h3>
                </div>
                <div className="kpf-content-block__body-group">
                  <p className="kpf-content-block__body">{copy.library.emptyBody}</p>
                </div>
              </div>
              <div className="kpf-content-block__actions">
                <KpfButton href="/contact/" className="kpf-btn kpf-btn--secondary">
                  Get in touch
                </KpfButton>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="kpf-cta-closing kpf-section" aria-labelledby="kpf-events-cta-title">
        <CtaClosingFlag src={ctaFlag.src} />
        <div className="kpf-u-container">
          <div className="kpf-content-block kpf-u-invert kpf-cta-closing__block">
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
