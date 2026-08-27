import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
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
  GALLERY_BATCH_WIDE,
  GALLERY_ENTER_STAGGER_MS,
  GALLERY_INITIAL_WIDE,
  GALLERY_MOBILE_QUERY,
  GALLERY_ORIENTATION_PORTRAIT_QUERY,
  SCRAPBOOK_TILES_INITIAL,
  SCRAPBOOK_TILES_PAGE,
  appendToColumn,
  decodeTileSizes,
  fetchScrapbookTiles,
  galleryColumnCount,
  galleryPagingForViewport,
  morePhotosLabel,
  mosaicColumnHeights,
  mosaicPrefersLongestColumn,
  mosaicTilesInPoolOrder,
  mosaicVisibleCount,
  nextGalleryBatch,
  packMosaicColumns,
  pickColumnIndex,
  remainingPhotoCount,
  scrapbookTileTooltip,
  tileAspectRatioStyle,
  tileKey,
  waitForPaint,
  waitForTileImage,
  waitMs,
} = require("@/lib/scrapbookTiles");

/** Match --kpf-accordion-duration; hold outgoing panel so section height doesn’t dip. */
const ACCORDION_HOLD_MS = 180;

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

export default function AboutPageScaffold({
  media = {},
  kevinSlides = [],
  grants = [],
  grantsTotal = "",
  scrapbookTiles = [],
  scrapbookTilesCount = 0,
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

  const [paging, setPaging] = useState({
    initial: GALLERY_INITIAL_WIDE,
    batch: GALLERY_BATCH_WIDE,
  });
  const [columnCount, setColumnCount] = useState(3);
  const [preferLongest, setPreferLongest] = useState(false);
  const [shuffledTiles, setShuffledTiles] = useState(galleryTiles);
  const [columns, setColumns] = useState(() =>
    packMosaicColumns(
      galleryTiles.slice(0, GALLERY_INITIAL_WIDE),
      3,
    ),
  );
  const [fetchOffset, setFetchOffset] = useState(galleryTiles.length);
  const [tileTotal, setTileTotal] = useState(
    Math.max(Number(scrapbookTilesCount) || 0, galleryTiles.length),
  );
  const [remoteExhausted, setRemoteExhausted] = useState(
    !usingScrapbookQuery || galleryTiles.length < SCRAPBOOK_TILES_INITIAL,
  );
  const [isFetchingTiles, setIsFetchingTiles] = useState(false);
  const [isInsertingTiles, setIsInsertingTiles] = useState(false);
  const fetchLockRef = useRef(false);
  const userExpandedRef = useRef(false);
  const mosaicRef = useRef(null);
  const packGenRef = useRef(0);
  const shuffledRef = useRef(shuffledTiles);
  const columnsRef = useRef(columns);
  const columnCountRef = useRef(columnCount);
  const preferLongestRef = useRef(preferLongest);
  shuffledRef.current = shuffledTiles;
  columnsRef.current = columns;
  columnCountRef.current = columnCount;
  preferLongestRef.current = preferLongest;
  const [enterKeys, setEnterKeys] = useState([]);

  useLayoutEffect(() => {
    packGenRef.current += 1;
    const cols = galleryColumnCount();
    const longest = mosaicPrefersLongestColumn();
    const next = galleryPagingForViewport();
    const shuffled = shuffleTiles(galleryTiles);
    setColumnCount(cols);
    setPreferLongest(longest);
    setPaging(next);
    setShuffledTiles(shuffled);
    setFetchOffset(galleryTiles.length);
    setRemoteExhausted(
      !usingScrapbookQuery || galleryTiles.length < SCRAPBOOK_TILES_INITIAL,
    );
    setTileTotal(Math.max(Number(scrapbookTilesCount) || 0, galleryTiles.length));
    userExpandedRef.current = false;
    setEnterKeys([]);
    setIsInsertingTiles(false);
    setColumns(
      packMosaicColumns(
        shuffled.slice(0, Math.min(next.initial, shuffled.length)),
        cols,
        longest,
      ),
    );
    // galleryTiles identity changes every Faust render; the signature is the content key.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [gallerySignature, usingScrapbookQuery, scrapbookTilesCount]);

  useLayoutEffect(() => {
    const apply = () => {
      const cols = galleryColumnCount();
      const longest = mosaicPrefersLongestColumn();
      setPaging(galleryPagingForViewport());
      if (
        cols === columnCountRef.current &&
        longest === preferLongestRef.current
      ) {
        return;
      }
      columnCountRef.current = cols;
      preferLongestRef.current = longest;
      setColumnCount(cols);
      setPreferLongest(longest);
      setColumns(
        packMosaicColumns(
          mosaicTilesInPoolOrder(shuffledRef.current, columnsRef.current),
          cols,
          longest,
        ),
      );
    };
    const pagingQuery = window.matchMedia(GALLERY_MOBILE_QUERY);
    const portraitQuery = window.matchMedia(GALLERY_ORIENTATION_PORTRAIT_QUERY);
    pagingQuery.addEventListener("change", apply);
    portraitQuery.addEventListener("change", apply);
    window.addEventListener("orientationchange", apply);
    apply();
    return () => {
      pagingQuery.removeEventListener("change", apply);
      portraitQuery.removeEventListener("change", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);

  const visibleTileCount = mosaicVisibleCount(columns);
  const remainingTiles = remainingPhotoCount({
    visible: visibleTileCount,
    loaded: shuffledTiles.length,
    total: tileTotal,
    remoteExhausted: remoteExhausted || !usingScrapbookQuery,
    batch: paging.batch,
  });
  const loadBatch = nextGalleryBatch(remainingTiles, paging.batch);
  const hasMoreTiles = remainingTiles > 0;

  const revealOrFetchMore = useCallback(async () => {
    if (fetchLockRef.current || loadBatch < 1) {
      return;
    }

    fetchLockRef.current = true;
    userExpandedRef.current = true;
    setIsFetchingTiles(true);

    let pool = shuffledTiles;
    let offset = fetchOffset;
    let exhausted = remoteExhausted;
    let total = tileTotal;
    const need = visibleTileCount + loadBatch;

    try {
      while (pool.length < need && usingScrapbookQuery && !exhausted) {
        const page = await fetchScrapbookTiles({
          first: SCRAPBOOK_TILES_PAGE,
          offset,
        });
        if (page.total > 0) {
          total = page.total;
        }
        if (!page.tiles.length) {
          exhausted = true;
          break;
        }
        const seen = new Set(pool.map((tile) => tile.id));
        const additions = shuffleTiles(
          page.tiles.filter((tile) => !seen.has(tile.id)),
        );
        if (!additions.length) {
          exhausted = true;
          offset += page.tiles.length;
          break;
        }
        pool = [...pool, ...additions];
        offset += page.tiles.length;
        if (page.tiles.length < SCRAPBOOK_TILES_PAGE) {
          exhausted = true;
        }
      }
    } catch {
      exhausted = true;
    }

    const revealTo = Math.min(
      need,
      pool.length,
      total > 0 ? total : pool.length,
    );
    const newcomers = pool.slice(visibleTileCount, revealTo);
    const gen = packGenRef.current;

    setShuffledTiles(pool);
    setFetchOffset(offset);
    setRemoteExhausted(exhausted);
    setTileTotal(Math.max(total, pool.length));
    setIsFetchingTiles(false);

    let sized = newcomers;
    try {
      sized = await decodeTileSizes(newcomers);
    } catch {
      sized = newcomers;
    }
    if (gen !== packGenRef.current) {
      fetchLockRef.current = false;
      return;
    }
    if (sized.length) {
      setIsInsertingTiles(true);
      for (let i = 0; i < sized.length; i += 1) {
        if (gen !== packGenRef.current) break;
        if (i > 0) await waitMs(GALLERY_ENTER_STAGGER_MS);
        if (gen !== packGenRef.current) break;
        const tile = sized[i];
        const key = tileKey(tile);
        setColumns((current) => {
          const index = pickColumnIndex(
            mosaicColumnHeights(current, mosaicRef.current),
            preferLongestRef.current,
          );
          return appendToColumn(current, index, tile);
        });
        if (key) setEnterKeys((current) => [...current, key]);
        await waitForPaint();
        await waitForTileImage(mosaicRef.current, tile);
      }
    }
    if (gen === packGenRef.current) {
      setIsInsertingTiles(false);
    }
    fetchLockRef.current = false;
  }, [
    loadBatch,
    shuffledTiles,
    fetchOffset,
    remoteExhausted,
    tileTotal,
    visibleTileCount,
    usingScrapbookQuery,
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

  const carouselSlides = useMemo(() => {
    if (Array.isArray(kevinSlides) && kevinSlides.length > 0) {
      return kevinSlides;
    }
    return copy.history.layers.map((layer, index) => {
      const resolved = resolveMedia(media, layer.key, layer);
      return {
        id: layer.key || `history-fallback-${index}`,
        imageUrl: resolved.src,
        imageAlt: resolved.alt,
        header: copy.history.card.title,
        body: copy.history.card.body.join("\n\n"),
      };
    });
  }, [kevinSlides, copy.history, media]);

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
        id={copy.grantees.id}
        className="kpf-grantees kpf-section kpf-section--page"
        aria-labelledby="kpf-about-grantees-title"
      >
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

          <div className="kpf-gallery__wall">
          {visibleTileCount > 0 ? (
            <div
              ref={mosaicRef}
              className="kpf-gallery__mosaic kpf-gallery__mosaic--masonry"
              data-columns={columnCount}
              data-pack={preferLongest ? "longest" : "shortest"}
              aria-live="polite"
              aria-busy={isFetchingTiles || isInsertingTiles || undefined}
            >
              {columns.map((col, colIndex) => (
                <div key={colIndex} className="kpf-gallery__column">
                  {col.map((item) => {
                    const tip = scrapbookTileTooltip(item);
                    const key = tileKey(item);
                    const isEnter = enterKeys.includes(key);
                    const image = (
                      <img
                        src={item.src}
                        alt={item.alt || ""}
                        loading={isEnter ? "eager" : "lazy"}
                        decoding="async"
                      />
                    );
                    return (
                      <figure
                        key={key}
                        className={
                          isEnter
                            ? "kpf-gallery__item is-enter-in"
                            : "kpf-gallery__item"
                        }
                        style={tileAspectRatioStyle(item)}
                      >
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
              ))}
            </div>
          ) : null}

          {hasMoreTiles || isFetchingTiles || isInsertingTiles ? (
            <div className="kpf-gallery__more">
              {isFetchingTiles ? (
                <span
                  className="kpf-gallery__more-status"
                  role="status"
                  aria-live="polite"
                >
                  <span className="kpf-gallery__more-spinner" aria-hidden="true" />
                  <span className="kpf-u-sr-only">Loading more photos</span>
                </span>
              ) : isInsertingTiles ? (
                <span className="kpf-gallery__more-status" aria-hidden="true" />
              ) : (
                <button
                  type="button"
                  className="kpf-btn kpf-btn--outline kpf-gallery__more-btn"
                  onClick={() => {
                    void revealOrFetchMore();
                  }}
                  aria-label={morePhotosLabel(remainingTiles)}
                >
                  <ChevronDown
                    size={20}
                    strokeWidth={2}
                    absoluteStrokeWidth
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>
          ) : null}
          </div>
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
