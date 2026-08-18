import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Plus } from "lucide-react";
import { ABOUT } from "@/lib/pageCopy";
import ChipCursorTooltip from "@/components/ChipCursorTooltip";
import CtaClosingBand from "@/components/CtaClosingBand";
import GranteeCardsGrid from "@/components/GranteeCardsGrid";
import KevinHistoryCarousel from "@/components/KevinHistoryCarousel";
import KpfButton from "@/components/KpfButton";
const { resolveMedia } = require("@/lib/scaffoldMedia");
const {
  resolveGrantsTotalLabel,
  formatGranteesTitle,
} = require("@/lib/grantsQuery");
const {
  SCRAPBOOK_TILES_INITIAL,
  SCRAPBOOK_TILES_PAGE,
  fetchScrapbookTiles,
  scrapbookTileTooltip,
} = require("@/lib/scrapbookTiles");

/** Match --kpf-accordion-duration; hold outgoing panel so section height doesn’t dip. */
const ACCORDION_HOLD_MS = 180;
/** Default visible photos before “See more”. */
const GALLERY_INITIAL = 12;
/** “See more” batch — desktop / tablet / mobile-L (≥30rem). */
const GALLERY_BATCH_WIDE = 9;
/** “See more” batch — mobile portrait (<30rem). */
const GALLERY_BATCH_NARROW = 6;

function shuffleTiles(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i];
    next[i] = next[j];
    next[j] = tmp;
  }
  return next;
}

function galleryBatchForViewport() {
  if (typeof window === "undefined") {
    return GALLERY_BATCH_WIDE;
  }
  return window.matchMedia("(max-width: 29.99rem)").matches
    ? GALLERY_BATCH_NARROW
    : GALLERY_BATCH_WIDE;
}

export default function AboutPageScaffold({
  media = {},
  kevinSlides = [],
  grants = [],
  grantsTotal = "",
  scrapbookTiles = [],
}) {
  const copy = ABOUT;
  const background = resolveMedia(media, copy.hero.background.key, copy.hero.background);
  const featured = resolveMedia(media, copy.gallery.featured.key, copy.gallery.featured);
  const ctaFlag = resolveMedia(media, copy.cta.media.key, copy.cta.media);
  const granteeItems =
    Array.isArray(grants) && grants.length > 0 ? grants : copy.grantees.items;
  const granteesTitle = formatGranteesTitle(
    copy.grantees.title,
    resolveGrantsTotalLabel({ label: grantsTotal }, granteeItems),
  );

  const galleryTiles = useMemo(() => {
    if (Array.isArray(scrapbookTiles) && scrapbookTiles.length > 0) {
      return scrapbookTiles;
    }
    const fallback = [
      featured.src
        ? {
            id: copy.gallery.featured.key || featured.src,
            src: featured.src,
            alt: featured.alt || "",
          }
        : null,
      ...copy.gallery.items.map((item) => {
        const resolved = resolveMedia(media, item.key, item);
        if (!resolved.src) return null;
        return {
          id: item.key || resolved.src,
          src: resolved.src,
          alt: resolved.alt || item.alt || "",
        };
      }),
    ].filter(Boolean);
    return fallback;
  }, [scrapbookTiles, featured.src, featured.alt, media, copy.gallery]);

  const usingScrapbookQuery = Array.isArray(scrapbookTiles) && scrapbookTiles.length > 0;
  const gallerySignature = useMemo(
    () => galleryTiles.map((tile) => tile.id || tile.src).join("|"),
    [galleryTiles],
  );

  const [seeMoreBatch, setSeeMoreBatch] = useState(GALLERY_BATCH_WIDE);
  const [shuffledTiles, setShuffledTiles] = useState(galleryTiles);
  const [visibleTileCount, setVisibleTileCount] = useState(
    Math.min(GALLERY_INITIAL, galleryTiles.length),
  );
  const [fetchOffset, setFetchOffset] = useState(galleryTiles.length);
  const [remoteExhausted, setRemoteExhausted] = useState(
    !usingScrapbookQuery || galleryTiles.length < SCRAPBOOK_TILES_INITIAL,
  );
  const [isFetchingTiles, setIsFetchingTiles] = useState(false);
  const fetchLockRef = useRef(false);

  useEffect(() => {
    const syncBatch = () => setSeeMoreBatch(galleryBatchForViewport());
    syncBatch();
    const mq = window.matchMedia("(max-width: 29.99rem)");
    mq.addEventListener("change", syncBatch);
    return () => mq.removeEventListener("change", syncBatch);
  }, []);

  useEffect(() => {
    setShuffledTiles(shuffleTiles(galleryTiles));
    setVisibleTileCount(Math.min(GALLERY_INITIAL, galleryTiles.length));
    setFetchOffset(galleryTiles.length);
    setRemoteExhausted(
      !usingScrapbookQuery || galleryTiles.length < SCRAPBOOK_TILES_INITIAL,
    );
  }, [gallerySignature, galleryTiles, usingScrapbookQuery]);

  const visibleTiles = shuffledTiles.slice(0, visibleTileCount);
  const hasUnrevealed = visibleTileCount < shuffledTiles.length;
  const hasMoreTiles = hasUnrevealed || (usingScrapbookQuery && !remoteExhausted);

  const revealOrFetchMore = useCallback(async () => {
    const batch = seeMoreBatch;

    if (visibleTileCount < shuffledTiles.length) {
      setVisibleTileCount((count) =>
        Math.min(count + batch, shuffledTiles.length),
      );
      return;
    }

    if (!usingScrapbookQuery || remoteExhausted || fetchLockRef.current) {
      return;
    }

    fetchLockRef.current = true;
    setIsFetchingTiles(true);
    try {
      const page = await fetchScrapbookTiles({
        first: SCRAPBOOK_TILES_PAGE,
        offset: fetchOffset,
      });
      if (!page.length) {
        setRemoteExhausted(true);
        return;
      }

      setShuffledTiles((prev) => {
        const seen = new Set(prev.map((tile) => tile.id));
        const additions = shuffleTiles(
          page.filter((tile) => !seen.has(tile.id)),
        );
        return additions.length ? [...prev, ...additions] : prev;
      });
      setFetchOffset((offset) => offset + page.length);
      setVisibleTileCount((count) => count + batch);
      if (page.length < SCRAPBOOK_TILES_PAGE) {
        setRemoteExhausted(true);
      }
    } catch {
      setRemoteExhausted(true);
    } finally {
      setIsFetchingTiles(false);
      fetchLockRef.current = false;
    }
  }, [
    seeMoreBatch,
    visibleTileCount,
    shuffledTiles.length,
    usingScrapbookQuery,
    remoteExhausted,
    fetchOffset,
  ]);

  const [openAccordion, setOpenAccordion] = useState(
    () => copy.mission.criteria.find((item) => item.open)?.id ?? null,
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

  const carouselSlides =
    Array.isArray(kevinSlides) && kevinSlides.length > 0
      ? kevinSlides
      : copy.history.layers.map((layer, index) => {
          const resolved = resolveMedia(media, layer.key, layer);
          return {
            id: layer.key || `history-fallback-${index}`,
            imageUrl: resolved.src,
            imageAlt: resolved.alt,
            header: copy.history.card.title,
            body: copy.history.card.body.join("\n\n"),
          };
        });

  return (
    <div className="kpf-page-about" data-kpf-scaffold="about">
      <section className="kpf-hero kpf-hero--about" aria-labelledby="kpf-about-hero-title">
        {background.src ? (
          <div className="kpf-hero__media-bleed" aria-hidden={background.alt ? undefined : true}>
            <div className="kpf-hero__media-wrap">
              <img
                className="kpf-hero__media"
                src={background.src}
                alt={background.alt || ""}
                decoding="async"
              />
            </div>
          </div>
        ) : null}
        {/* Pinned: framed photo (.kpf-hero__frame-motion) — restore with tampa-bay cutout later */}
        <div className="kpf-u-container kpf-hero__layout">
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
                <KpfButton href={copy.hero.primaryCta.href} className="kpf-btn kpf-btn--primary">
                  {copy.hero.primaryCta.label}
                </KpfButton>
                <KpfButton href={copy.hero.secondaryCta.href} className="kpf-btn kpf-btn--secondary">
                  {copy.hero.secondaryCta.label}
                </KpfButton>
              </div>
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

          <KevinHistoryCarousel
            slides={carouselSlides}
            cardEyebrow="Kevin's Story"
            ariaLabel={copy.history.title}
          />
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
              const panelId = `kpf-mission-panel-${item.id}`;
              const headerId = `kpf-mission-header-${item.id}`;
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
                  {granteesTitle}
                </h2>
              </div>
              <div className="kpf-content-block__body-group">
                <p className="kpf-content-block__body">{copy.grantees.body}</p>
              </div>
            </div>
          </div>
          <GranteeCardsGrid items={granteeItems} label={granteesTitle} />
        </div>
      </section>

      <section className="kpf-gallery kpf-section" aria-labelledby="kpf-about-gallery-title">
        <div className="kpf-u-container">
          <div className="kpf-content-block kpf-u-invert kpf-gallery__intro">
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

          {visibleTiles.length > 0 ? (
            <div className="kpf-gallery__mosaic" aria-live="polite">
              {visibleTiles.map((item) => {
                const tip = scrapbookTileTooltip(item);
                const image = (
                  <img
                    src={item.src}
                    alt={item.alt || ""}
                    loading="lazy"
                    decoding="async"
                  />
                );
                return (
                  <figure key={item.id || item.src} className="kpf-gallery__item">
                    {tip ? (
                      <ChipCursorTooltip
                        label={tip.label}
                        labelSoft={tip.labelSoft}
                        className="kpf-gallery__item-tip"
                        desktopOnly
                      >
                        {image}
                      </ChipCursorTooltip>
                    ) : (
                      image
                    )}
                  </figure>
                );
              })}
            </div>
          ) : null}

          {hasMoreTiles ? (
            <div className="kpf-gallery__more">
              <button
                type="button"
                className="kpf-link kpf-body--m"
                disabled={isFetchingTiles}
                onClick={() => {
                  void revealOrFetchMore();
                }}
              >
                {isFetchingTiles ? "Loading…" : copy.gallery.seeMore}
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <CtaClosingBand
        title={copy.cta.title}
        body={copy.cta.body}
        actions={copy.cta.actions}
        flagSrc={ctaFlag.src}
        titleId="kpf-about-cta-title"
      />
    </div>
  );
}
