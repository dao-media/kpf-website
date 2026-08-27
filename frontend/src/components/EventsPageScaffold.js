import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarHeart,
  Check,
  Clock,
  ExternalLink,
  MapPin,
  Plus,
  Ticket,
} from "lucide-react";
import { EVENTS } from "@/lib/pageCopy";
import ChipCursorTooltip, {
  tooltipForChipIcon,
  useChipTooltipTour,
} from "@/components/ChipCursorTooltip";
import CtaClosingBand from "@/components/CtaClosingBand";
import DonateButton, { isDonateAction } from "@/components/DonateButton";
import ExternalExitTooltip from "@/components/ExternalExitTooltip";
import EventCardPlaceholder, {
  eventLibraryPlaceholderCount,
} from "@/components/EventCardPlaceholder";
import KpfButton from "@/components/KpfButton";
const { resolveMedia } = require("@/lib/scaffoldMedia");
const {
  featuredSectionFromEvent,
  normalizeEventNodes,
  pickFeaturedEvent,
} = require("@/lib/eventsQuery");

/** Match --kpf-accordion-duration; hold outgoing panel so section height doesn’t dip. */
const ACCORDION_HOLD_MS = 180;

/** Library grid columns: desktop 3 · tablet/mob-land 2 · mob-portrait 1 (no pads). */
function useEventLibraryColumns() {
  // Desktop-first so Coming Soon pads exist in SSR HTML; CSS hides them
  // under 30rem, and this hook reconciles 2-col / 3-col after hydrate.
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const desktop = window.matchMedia("(min-width: 64rem)");
    const tabletUp = window.matchMedia("(min-width: 30rem)");

    const sync = () => {
      if (desktop.matches) setColumns(3);
      else if (tabletUp.matches) setColumns(2);
      else setColumns(1);
    };

    sync();
    desktop.addEventListener("change", sync);
    tabletUp.addEventListener("change", sync);
    return () => {
      desktop.removeEventListener("change", sync);
      tabletUp.removeEventListener("change", sync);
    };
  }, []);

  return columns;
}

function ActionLink({ action }) {
  const className = `kpf-btn kpf-btn--${action.variant || "primary"}`;
  const icons = (
    <>
      {action.trailingIcon === "arrow" ? (
        <span className="kpf-btn__icon kpf-btn__icon--trailing" aria-hidden="true">
          <ArrowRight size={20} strokeWidth={2} />
        </span>
      ) : null}
      {action.trailingIcon === "ticket" ? (
        <span className="kpf-btn__icon kpf-btn__icon--trailing" aria-hidden="true">
          <Ticket size={20} strokeWidth={2} />
        </span>
      ) : null}
      {action.trailingIcon === "external" ? (
        <span className="kpf-btn__icon kpf-btn__icon--trailing" aria-hidden="true">
          <ExternalLink size={20} strokeWidth={2} />
        </span>
      ) : null}
    </>
  );
  if (isDonateAction(action)) {
    return (
      <DonateButton label={action.label} className={className}>
        {action.label}
        {icons}
      </DonateButton>
    );
  }
  return (
    <KpfButton
      href={action.href}
      external={Boolean(action.external)}
      className={className}
    >
      {action.label}
      {icons}
    </KpfButton>
  );
}

/**
 * Same markup/classes as GranteeCard chips (Grant Amount / Date / Website).
 * Optional href keeps mute outline style; variant="link" is the ember ticket chip.
 */
function GrantChip({
  icon: Icon,
  label,
  href = "",
  external = false,
  variant = "",
  trailingIcon = false,
  tooltip = "",
}) {
  const isLink = Boolean(href);
  const isEmberLink = isLink && variant === "link";
  const className = [
    "kpf-grantee-card__chip",
    isEmberLink ? "kpf-grantee-card__chip--link" : "",
    isLink && !isEmberLink ? "kpf-grantee-card__chip--action" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const icon = Icon ? (
    <span className="kpf-grantee-card__chip-icon" aria-hidden="true">
      <Icon size={20} strokeWidth={2} />
    </span>
  ) : null;

  const TrailingIcon =
    trailingIcon === "ticket"
      ? Ticket
      : trailingIcon === "arrow" || trailingIcon === true
        ? ArrowRight
        : null;
  const trailing = TrailingIcon ? (
    <span className="kpf-grantee-card__chip-icon" aria-hidden="true">
      <TrailingIcon
        size={trailingIcon === "ticket" ? 20 : 16}
        strokeWidth={2}
      />
    </span>
  ) : null;

  const body = (
    <>
      {isEmberLink ? null : icon}
      <span className="kpf-grantee-card__chip-label">{label}</span>
      {isEmberLink ? trailing : null}
    </>
  );

  let chip;
  if (!isLink) {
    chip = <span className={className}>{body}</span>;
  } else {
    chip = (
      <a
        className={className}
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {body}
      </a>
    );
  }

  if (variant === "link" && href && external) {
    return <ExternalExitTooltip href={href}>{chip}</ExternalExitTooltip>;
  }
  if (!tooltip) return chip;

  return <ChipCursorTooltip label={tooltip}>{chip}</ChipCursorTooltip>;
}

function chipIconFor(name) {
  if (name === "map") return MapPin;
  if (name === "ticket") return Ticket;
  if (name === "clock") return Clock;
  return CalendarHeart;
}

function EventCard({ event, fallbackMarkSrc = "", fallbackMarkAlt = "" }) {
  const metaRef = useRef(null);
  const ticketsHref = event.ticketsHref || "";
  const ticketsExternal = Boolean(event.ticketsExternal);
  const ticketsLabel = event.ticketsLabel || "Get tickets";
  const dateLabel = event.dateLabel || event.scheduleLabel || "";
  const timeLabel = event.timeLabel || "";
  const locationLabel = event.locationLabel || "";
  const locationHref = event.locationHref || "";
  const calendarHref = event.calendarHref || event.calendarUrl || "";
  const hosts = Array.isArray(event.hosts)
    ? event.hosts.filter((host) => host && String(host.logoUrl || "").trim())
    : [];
  const hostMarks =
    hosts.length > 0
      ? hosts.map((host, index) => ({
          key: String(host.termId || host.logoId || host.name || index),
          src: String(host.logoUrl).trim(),
          alt: String(host.name || "").trim(),
        }))
      : fallbackMarkSrc
        ? [{ key: "fallback-mark", src: fallbackMarkSrc, alt: fallbackMarkAlt || "" }]
        : [];

  useChipTooltipTour(metaRef, [
    dateLabel,
    timeLabel,
    locationLabel,
    ticketsHref,
    calendarHref,
    locationHref,
  ]);

  return (
    <article className="kpf-event-card">
      <div className="kpf-event-card__body">
        <div className="kpf-event-card__copy">
          {hostMarks.length > 0 ? (
            <div
              className="kpf-event-card__hosts"
              role="group"
              aria-label={
                hostMarks.length > 1 ? "Event hosts" : hostMarks[0].alt || "Event host"
              }
            >
              {hostMarks.map((host, index) => {
                const mark = (
                  <img
                    className="kpf-event-card__host"
                    src={host.src}
                    alt={host.alt}
                    width={48}
                    height={48}
                    loading="lazy"
                    decoding="async"
                  />
                );
                if (!host.alt) {
                  return (
                    <span
                      key={host.key}
                      className="kpf-event-card__host-wrap"
                      style={{ zIndex: index + 1 }}
                    >
                      {mark}
                    </span>
                  );
                }
                return (
                  <ChipCursorTooltip
                    key={host.key}
                    label={host.alt}
                    className="kpf-event-card__host-tip"
                    style={{ zIndex: index + 1 }}
                    desktopOnly
                  >
                    {mark}
                  </ChipCursorTooltip>
                );
              })}
            </div>
          ) : null}
          <h3 className="kpf-event-card__title">{event.title}</h3>
          {event.body ? (
            <p className="kpf-event-card__body-text">{event.body}</p>
          ) : null}
        </div>
        <div
          ref={metaRef}
          className="kpf-event-card__meta kpf-grantee-card__meta"
        >
          {dateLabel ? (
            <GrantChip
              icon={CalendarHeart}
              label={dateLabel}
              href={calendarHref}
              external={Boolean(calendarHref)}
              tooltip={
                calendarHref ? tooltipForChipIcon("calendar") : ""
              }
            />
          ) : null}
          {timeLabel ? (
            <GrantChip
              icon={Clock}
              label={timeLabel}
              href={calendarHref}
              external={Boolean(calendarHref)}
              tooltip={calendarHref ? tooltipForChipIcon("clock") : ""}
            />
          ) : null}
          {locationLabel ? (
            <GrantChip
              icon={MapPin}
              label={locationLabel}
              href={locationHref}
              external={Boolean(locationHref)}
              tooltip={locationHref ? tooltipForChipIcon("map") : ""}
            />
          ) : null}
          {ticketsHref ? (
            <GrantChip
              icon={Ticket}
              label={ticketsLabel}
              href={ticketsHref}
              external={ticketsExternal}
              variant="link"
              trailingIcon="ticket"
            />
          ) : (
            <GrantChip icon={Ticket} label={ticketsLabel} />
          )}
        </div>
      </div>
    </article>
  );
}

export default function EventsPageScaffold({ media = {}, events: eventNodes = [] }) {
  const copy = EVENTS;
  const heroAlt = copy.hero.media.alt || "";
  const cardMark = resolveMedia(
    media,
    copy.library.cardMark.key,
    copy.library.cardMark,
  );
  const ctaFlag = resolveMedia(media, copy.cta.media.key, copy.cta.media);
  const collage = (copy.featured.collage || []).map((item) =>
    resolveMedia(media, item.key, item),
  );
  const featuredEvent = pickFeaturedEvent(eventNodes);
  const featured = {
    ...copy.featured,
    ...featuredSectionFromEvent(featuredEvent, copy.featured),
  };

  const libraryColumns = useEventLibraryColumns();

  const [openAccordion, setOpenAccordion] = useState(
    () => copy.context.paths.find((item) => item.open)?.id ?? null,
  );
  const [heldAccordionIds, setHeldAccordionIds] = useState([]);
  const accordionHoldTimerRef = useRef(null);
  const featuredChipsRef = useRef(null);

  useChipTooltipTour(featuredChipsRef, [featured.meta]);

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

  const events = normalizeEventNodes(eventNodes);
  const libraryPlaceholders = eventLibraryPlaceholderCount(
    events.length,
    libraryColumns,
  );
  const showLibraryGrid = events.length > 0 || libraryPlaceholders > 0;

  return (
    <div className="kpf-page-events" data-kpf-scaffold="events">
      <section className="kpf-hero kpf-hero--events" aria-labelledby="kpf-events-hero-title">
        <div className="kpf-hero__media-frame">
          <picture className="kpf-hero__media-host">
            <source
              media="(min-width: 48rem)"
              type="image/webp"
              srcSet="/media/events/hero.webp"
            />
            <source
              media="(min-width: 48rem)"
              srcSet="/media/events/hero.jpg"
            />
            <img
              className="kpf-hero__media"
              src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
              alt={heroAlt}
              width={2400}
              height={1601}
              decoding="async"
            />
          </picture>
        </div>
        <div className="kpf-hero__scrim" aria-hidden="true" />
        <div className="kpf-u-container kpf-hero__layout">
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
              {isDonateAction(copy.context.cta) ? (
                <DonateButton
                  label={copy.context.cta.label}
                  className="kpf-btn kpf-btn--primary"
                />
              ) : (
                <KpfButton href={copy.context.cta.href} className="kpf-btn kpf-btn--primary">
                  {copy.context.cta.label}
                </KpfButton>
              )}
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
                    <h3 className="kpf-accordion__title">{item.title}</h3>
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
        id={featured.id}
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
                    <img src={tile.src} alt={tile.alt || ""} loading="lazy" decoding="async" />
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
                    <img src={tile.src} alt={tile.alt || ""} loading="lazy" decoding="async" />
                  </figure>
                ) : null,
              )}
            </div>
          </div>

          <div className="kpf-content-block kpf-u-invert kpf-featured-event__copy">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                <p className="kpf-content-block__eyebrow">{featured.eyebrow}</p>
                <h2
                  id="kpf-events-featured-title"
                  className="kpf-content-block__title kpf-content-block__title--h2"
                >
                  {featured.title}
                </h2>
              </div>
              <div className="kpf-content-block__body-group">
                {(featured.body || []).map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="kpf-content-block__body">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>

            <div className="kpf-content-block__actions">
              {(featured.actions || []).map((action) => (
                <ActionLink key={`${action.href}-${action.label}`} action={action} />
              ))}
            </div>

            <div
              ref={featuredChipsRef}
              className="kpf-featured-event__chips kpf-grantee-card__meta"
              aria-label="Event details"
            >
              {(featured.meta || []).map((chip) => {
                const Icon = chipIconFor(chip.icon);
                const tip =
                  chip.tooltip ||
                  (chip.href ? tooltipForChipIcon(chip.icon) : "");
                return (
                  <GrantChip
                    key={`${chip.icon}-${chip.label}`}
                    icon={Icon}
                    label={chip.label}
                    href={chip.href || ""}
                    external={Boolean(chip.external ?? chip.href)}
                    tooltip={tip}
                  />
                );
              })}
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

          {showLibraryGrid ? (
            <div className="kpf-event-library__grid">
              {events.map((event) => (
                <EventCard
                  key={event.id || event.title}
                  event={event}
                  fallbackMarkSrc={cardMark.src}
                  fallbackMarkAlt={cardMark.alt}
                />
              ))}
              {Array.from({ length: libraryPlaceholders }, (_, index) => {
                // Desktop + two pads: last (3rd column) is quiet. A lone 3rd-slot pad stays full.
                const quiet =
                  libraryColumns >= 3 &&
                  libraryPlaceholders === 2 &&
                  index === 1;
                return (
                  <EventCardPlaceholder
                    key={`event-placeholder-${index}`}
                    quiet={quiet}
                  />
                );
              })}
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

      <CtaClosingBand
        title={copy.cta.title}
        body={copy.cta.body}
        actions={copy.cta.actions}
        flagSrc={ctaFlag.src}
        titleId="kpf-events-cta-title"
      />
    </div>
  );
}
