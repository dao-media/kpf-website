/**
 * About “The Work” mosaic — all photos from Scrapbook CPT posts (kpf_scrapbook).
 * Never includes Kevin slides (kpf_kevin). GraphQL: kpfScrapbookTiles.
 */

const { preferLocalWebp } = require("./preferLocalWebp");

const SCRAPBOOK_TILE_FIELDS = `
  id
  databaseId
  attachmentId
  sourceUrl
  altText
  caption
  eventDate
  datePrecision
  title
`;

/** Photos fetched on first paint / SSR (12 shown + one +9 click). */
const SCRAPBOOK_TILES_INITIAL = 24;

/** GraphQL page size when fetching more photos. */
const SCRAPBOOK_TILES_PAGE = 12;

/** First paint on every breakpoint. */
const GALLERY_INITIAL = 12;
/** Each “See more”: desktop, tablet, mobile-landscape. */
const GALLERY_BATCH_WIDE = 9;
/** Each “See more”: mobile-portrait. */
const GALLERY_BATCH_NARROW = 6;

const KPF_SCRAPBOOK_TILES_QUERY = `
  kpfScrapbookTilesCount
  kpfScrapbookTiles(first: ${SCRAPBOOK_TILES_INITIAL}, offset: 0) {
    ${SCRAPBOOK_TILE_FIELDS}
  }
`;

/**
 * @param {unknown} tiles
 * @returns {Array<{ id: string, src: string, alt: string, caption: string, title: string, eventDate: string, datePrecision: string }>}
 */
function normalizeScrapbookTiles(tiles) {
  if (!Array.isArray(tiles)) {
    return [];
  }

  return tiles
    .map((tile, index) => {
      const src = preferLocalWebp(String(tile?.sourceUrl || "").trim());
      if (!src) {
        return null;
      }
      const title = String(tile?.title || "").trim();
      const alt =
        String(tile?.altText || "").trim() ||
        title ||
        "Scrapbook photo";
      return {
        id: String(tile?.id || `${tile?.databaseId || "tile"}-${index}`),
        src,
        alt,
        caption: String(tile?.caption || "").trim(),
        title,
        eventDate: String(tile?.eventDate || "").trim(),
        datePrecision: String(tile?.datePrecision || "unknown")
          .trim()
          .toLowerCase(),
      };
    })
    .filter(Boolean);
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Human-readable scrapbook date for mosaic tooltips.
 * @param {{ eventDate?: string, datePrecision?: string }} tile
 * @returns {string}
 */
function formatScrapbookTileDate(tile) {
  const date = String(tile?.eventDate || "").trim();
  const precision = String(tile?.datePrecision || "unknown")
    .trim()
    .toLowerCase();
  if (!date || precision === "unknown") {
    return "";
  }
  if (precision === "decade") {
    const year = parseInt(date.slice(0, 4), 10);
    return year > 0 ? String(year) : `${date.slice(0, 3)}0s`;
  }
  if (precision === "year") {
    return date;
  }
  const monthMatch = date.match(/^(\d{4})-(\d{2})$/);
  if (precision === "month" && monthMatch) {
    const monthIndex = parseInt(monthMatch[2], 10) - 1;
    const month = MONTH_NAMES[monthIndex] || monthMatch[2];
    return `${month} ${monthMatch[1]}`;
  }
  const exactMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (precision === "exact" && exactMatch) {
    const monthIndex = parseInt(exactMatch[2], 10) - 1;
    const month = MONTH_NAMES[monthIndex] || exactMatch[2];
    return `${month} ${parseInt(exactMatch[3], 10)}, ${exactMatch[1]}`;
  }
  return date;
}

/**
 * Desktop mosaic tip parts: title + optional date (rendered at weight 400).
 * @param {{ title?: string, eventDate?: string, datePrecision?: string }} tile
 * @returns {{ label: string, labelSoft: string } | null}
 */
function scrapbookTileTooltip(tile) {
  const title = String(tile?.title || "").trim();
  if (!title) {
    return null;
  }
  const when = formatScrapbookTileDate(tile);
  return {
    label: title,
    labelSoft: when,
  };
}

function isGalleryPhonePortrait() {
  if (typeof window === "undefined") {
    return false;
  }
  if (typeof window.matchMedia === "function") {
    return window.matchMedia(
      "(max-width: 47.99rem) and (orientation: portrait)",
    ).matches;
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  return (
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    width < 768 &&
    height >= width
  );
}

/**
 * @returns {{ initial: number, batch: number }}
 */
function galleryPagingForViewport() {
  if (isGalleryPhonePortrait()) {
    return { initial: GALLERY_INITIAL, batch: GALLERY_BATCH_NARROW };
  }
  return { initial: GALLERY_INITIAL, batch: GALLERY_BATCH_WIDE };
}

/**
 * @param {{ visible: number, loaded: number, total?: number, remoteExhausted?: boolean, batch?: number }} opts
 */
function remainingPhotoCount({
  visible,
  loaded,
  total,
  remoteExhausted,
  batch,
} = {}) {
  const shown = Math.max(0, Number(visible) || 0);
  const have = Math.max(0, Number(loaded) || 0);
  const knownTotal = Number(total);
  if (Number.isFinite(knownTotal) && knownTotal > 0) {
    return Math.max(0, knownTotal - shown);
  }
  const local = Math.max(0, have - shown);
  if (local > 0) return local;
  if (remoteExhausted) return 0;
  return Math.max(1, Number(batch) || GALLERY_BATCH_WIDE);
}

/**
 * @param {number} remaining
 * @param {number} batch
 */
function nextGalleryBatch(remaining, batch) {
  return Math.max(0, Math.min(Number(batch) || 0, Number(remaining) || 0));
}

/**
 * Wait until mosaic <img> nodes have loaded (or failed), or until timeout.
 * @param {ParentNode | null | undefined} root
 * @param {{ timeoutMs?: number }} [opts]
 */
function waitForMosaicImages(root, { timeoutMs = 8000 } = {}) {
  if (!root || typeof root.querySelectorAll !== "function") {
    return Promise.resolve();
  }
  const pending = Array.from(root.querySelectorAll("img")).filter(
    (img) => !img.complete,
  );
  if (!pending.length) {
    return Promise.resolve();
  }

  return Promise.race([
    Promise.all(
      pending.map(
        (img) =>
          new Promise((resolve) => {
            let settled = false;
            const done = () => {
              if (settled) return;
              settled = true;
              resolve();
            };
            img.addEventListener("load", done, { once: true });
            img.addEventListener("error", done, { once: true });
            if (img.complete) done();
          }),
      ),
    ),
    new Promise((resolve) => {
      setTimeout(resolve, Math.max(0, Number(timeoutMs) || 8000));
    }),
  ]);
}

/**
 * Fetch another page of scrapbook mosaic tiles via the same-origin API
 * (browser → WordPress GraphQL is blocked by CORS on production).
 * @param {{ first?: number, offset?: number }} [opts]
 * @returns {Promise<{ tiles: Array, total: number }>}
 */
async function fetchScrapbookTiles({
  first = SCRAPBOOK_TILES_PAGE,
  offset = 0,
} = {}) {
  const params = new URLSearchParams({
    first: String(first),
    offset: String(offset),
  });
  const response = await fetch(`/api/scrapbook-tiles?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    return { tiles: [], total: 0 };
  }
  const payload = await response.json();
  return {
    tiles: normalizeScrapbookTiles(payload?.tiles),
    total: Math.max(0, Number(payload?.total) || 0),
  };
}

module.exports = {
  GALLERY_BATCH_NARROW,
  GALLERY_BATCH_WIDE,
  GALLERY_INITIAL,
  KPF_SCRAPBOOK_TILES_QUERY,
  SCRAPBOOK_TILE_FIELDS,
  SCRAPBOOK_TILES_INITIAL,
  SCRAPBOOK_TILES_PAGE,
  fetchScrapbookTiles,
  formatScrapbookTileDate,
  galleryPagingForViewport,
  isGalleryPhonePortrait,
  nextGalleryBatch,
  normalizeScrapbookTiles,
  remainingPhotoCount,
  scrapbookTileTooltip,
  waitForMosaicImages,
};
