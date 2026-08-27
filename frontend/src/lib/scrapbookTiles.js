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
  width
  height
`;

/** Photos fetched on first paint / SSR (9 shown + one +6 click, with headroom). */
const SCRAPBOOK_TILES_INITIAL = 24;

/** GraphQL page size when fetching more photos. */
const SCRAPBOOK_TILES_PAGE = 12;

/** First paint: desktop / tablet. */
const GALLERY_INITIAL_WIDE = 9;
/** First paint: mobile landscape and portrait. */
const GALLERY_INITIAL_NARROW = 6;
/** Each click: desktop / tablet. */
const GALLERY_BATCH_WIDE = 6;
/** Each click: mobile landscape and portrait. */
const GALLERY_BATCH_NARROW = 3;

/** Phone portrait, or short landscape phones (not tablet). */
const GALLERY_MOBILE_QUERY =
  "(max-width: 47.99rem), (max-height: 47.99rem) and (orientation: landscape) and (max-width: 63.99rem)";

/** Two mosaic columns below 30rem; three from mobile-L up. */
const GALLERY_COLUMNS_WIDE_QUERY = "(min-width: 30rem)";

/** New photos land 200ms apart, each in the then-shortest column. */
const GALLERY_ENTER_STAGGER_MS = 200;

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
        width: Math.max(0, Number(tile?.width) || 0),
        height: Math.max(0, Number(tile?.height) || 0),
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

function isGalleryMobile() {
  if (typeof window === "undefined") {
    return false;
  }
  if (typeof window.matchMedia === "function") {
    return window.matchMedia(GALLERY_MOBILE_QUERY).matches;
  }
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return false;
  }
  return width < 768 || (height < 768 && width > height && width < 1024);
}

/**
 * @returns {{ initial: number, batch: number }}
 */
function galleryPagingForViewport() {
  if (isGalleryMobile()) {
    return { initial: GALLERY_INITIAL_NARROW, batch: GALLERY_BATCH_NARROW };
  }
  return { initial: GALLERY_INITIAL_WIDE, batch: GALLERY_BATCH_WIDE };
}

/**
 * Mosaic columns: 2 on small portrait, 3 from 30rem up (matches CSS).
 * @param {(query: string) => { matches: boolean }} [media]
 */
function galleryColumnCount(media) {
  const matchMedia =
    typeof media === "function"
      ? media
      : typeof globalThis.matchMedia === "function"
        ? globalThis.matchMedia.bind(globalThis)
        : null;
  if (!matchMedia) return 3;
  try {
    return matchMedia(GALLERY_COLUMNS_WIDE_QUERY).matches ? 3 : 2;
  } catch {
    return 3;
  }
}

function tileKey(tile) {
  return String(tile?.id || tile?.src || "");
}

/**
 * Relative column height from intrinsic ratio. Missing sizes count as square.
 * @param {{ width?: number, height?: number }} tile
 */
function tileAspectHeight(tile) {
  const width = Number(tile?.width) || 0;
  const height = Number(tile?.height) || 0;
  if (width > 0 && height > 0) return height / width;
  return 1;
}

function emptyMosaicColumns(columnCount) {
  const count = Math.max(1, Math.floor(Number(columnCount) || 1));
  return Array.from({ length: count }, () => []);
}

/**
 * Place one tile into the current shortest column (left-most on a tie).
 * @param {unknown[][]} columns
 * @param {unknown} tile
 */
function appendToShortestColumn(columns, tile) {
  const next = Array.isArray(columns) && columns.length
    ? columns.map((col) => (Array.isArray(col) ? [...col] : []))
    : emptyMosaicColumns(1);
  if (!tile) return next;
  let shortest = 0;
  let shortestHeight = Infinity;
  for (let i = 0; i < next.length; i += 1) {
    const height = next[i].reduce(
      (sum, item) => sum + tileAspectHeight(item),
      0,
    );
    if (height < shortestHeight) {
      shortest = i;
      shortestHeight = height;
    }
  }
  next[shortest].push(tile);
  return next;
}

/**
 * Left-to-right shortest-column pack. Used for the first paint and resize.
 * @param {unknown[]} items
 * @param {number} columnCount
 */
function packMosaicColumns(items, columnCount) {
  let columns = emptyMosaicColumns(columnCount);
  for (const item of items || []) {
    columns = appendToShortestColumn(columns, item);
  }
  return columns;
}

function mosaicVisibleCount(columns) {
  if (!Array.isArray(columns)) return 0;
  return columns.reduce(
    (sum, col) => sum + (Array.isArray(col) ? col.length : 0),
    0,
  );
}

function mosaicTilesInPoolOrder(pool, columns) {
  const have = new Set();
  for (const col of columns || []) {
    for (const tile of col || []) {
      const key = tileKey(tile);
      if (key) have.add(key);
    }
  }
  return (pool || []).filter((tile) => have.has(tileKey(tile)));
}

function waitMs(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, Number(ms) || 0));
  });
}

/**
 * Fill missing width/height from a decoded image so packing uses real ratios.
 * @param {Array<{ src?: string, width?: number, height?: number }>} tiles
 */
async function decodeTileSizes(tiles) {
  const list = Array.isArray(tiles) ? tiles : [];
  if (typeof Image !== "function") return list;
  return Promise.all(
    list.map(
      (tile) =>
        new Promise((resolve) => {
          if ((Number(tile?.width) || 0) > 0 && (Number(tile?.height) || 0) > 0) {
            resolve(tile);
            return;
          }
          const src = String(tile?.src || "").trim();
          if (!src) {
            resolve(tile);
            return;
          }
          const img = new Image();
          img.onload = () =>
            resolve({
              ...tile,
              width: img.naturalWidth || 0,
              height: img.naturalHeight || 0,
            });
          img.onerror = () => resolve(tile);
          img.src = src;
        }),
    ),
  );
}

/**
 * @param {number} count
 */
function morePhotosLabel(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (n === 1) return "1 more photo";
  return `${n} more photos`;
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
    (img) => !img.complete && img.getAttribute("loading") !== "lazy",
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
    signal: AbortSignal.timeout(12000),
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
  GALLERY_COLUMNS_WIDE_QUERY,
  GALLERY_ENTER_STAGGER_MS,
  GALLERY_INITIAL_NARROW,
  GALLERY_INITIAL_WIDE,
  GALLERY_MOBILE_QUERY,
  KPF_SCRAPBOOK_TILES_QUERY,
  SCRAPBOOK_TILE_FIELDS,
  SCRAPBOOK_TILES_INITIAL,
  SCRAPBOOK_TILES_PAGE,
  appendToShortestColumn,
  decodeTileSizes,
  fetchScrapbookTiles,
  formatScrapbookTileDate,
  galleryColumnCount,
  galleryPagingForViewport,
  isGalleryMobile,
  morePhotosLabel,
  mosaicTilesInPoolOrder,
  mosaicVisibleCount,
  nextGalleryBatch,
  normalizeScrapbookTiles,
  packMosaicColumns,
  remainingPhotoCount,
  scrapbookTileTooltip,
  tileAspectHeight,
  tileKey,
  waitForMosaicImages,
  waitMs,
};
