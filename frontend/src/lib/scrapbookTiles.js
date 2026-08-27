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

/** Two mosaic columns below 30rem; three from mobile-L up (WP CSS-column fallback). */
const GALLERY_COLUMNS_WIDE_QUERY = "(min-width: 30rem)";

/** Mobile portrait uses one stack; landscape uses two. */
const GALLERY_ORIENTATION_PORTRAIT_QUERY = "(orientation: portrait)";

/** New photos land 200ms apart, each pinned in its chosen column. */
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
 * @param {(query: string) => { matches: boolean }} [media]
 * @returns {((query: string) => { matches: boolean }) | null}
 */
function resolveMatchMedia(media) {
  if (typeof media === "function") return media;
  if (typeof globalThis.matchMedia === "function") {
    return globalThis.matchMedia.bind(globalThis);
  }
  return null;
}

/**
 * Mosaic columns: 3 tablet+, 2 mobile landscape, 1 mobile portrait.
 * Portrait is a single stack so new cards cannot land in a hidden extra column.
 * @param {(query: string) => { matches: boolean }} [media]
 */
function galleryColumnCount(media) {
  const matchMedia = resolveMatchMedia(media);
  if (!matchMedia) return 3;
  try {
    if (!matchMedia(GALLERY_MOBILE_QUERY).matches) return 3;
    return matchMedia(GALLERY_ORIENTATION_PORTRAIT_QUERY).matches ? 1 : 2;
  } catch {
    return 3;
  }
}

/**
 * Mobile portrait appends to the longest (visible) stack.
 * @param {(query: string) => { matches: boolean }} [media]
 */
function mosaicPrefersLongestColumn(media) {
  const matchMedia = resolveMatchMedia(media);
  if (!matchMedia) return false;
  try {
    return (
      matchMedia(GALLERY_MOBILE_QUERY).matches &&
      matchMedia(GALLERY_ORIENTATION_PORTRAIT_QUERY).matches
    );
  } catch {
    return false;
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

function cloneMosaicColumns(columns) {
  return Array.isArray(columns) && columns.length
    ? columns.map((col) => (Array.isArray(col) ? [...col] : []))
    : emptyMosaicColumns(1);
}

function columnAspectHeights(columns) {
  return cloneMosaicColumns(columns).map((col) =>
    col.reduce((sum, item) => sum + tileAspectHeight(item), 0),
  );
}

/**
 * Left-most on a tie. Longest keeps portrait cards in the visible stack.
 * @param {number[]} heights
 * @param {boolean} [preferLongest]
 */
function pickColumnIndex(heights, preferLongest = false) {
  const list = Array.isArray(heights) ? heights.map((h) => Number(h) || 0) : [];
  if (!list.length) return 0;
  let index = 0;
  for (let i = 1; i < list.length; i += 1) {
    if (preferLongest ? list[i] > list[index] : list[i] < list[index]) {
      index = i;
    }
  }
  return index;
}

/**
 * @param {unknown[][]} columns
 * @param {number} index
 * @param {unknown} tile
 */
function appendToColumn(columns, index, tile) {
  const next = cloneMosaicColumns(columns);
  if (!tile) return next;
  const i = Math.max(0, Math.min(next.length - 1, Math.floor(Number(index) || 0)));
  next[i].push(tile);
  return next;
}

function appendToPickedColumn(columns, tile, preferLongest) {
  const next = cloneMosaicColumns(columns);
  if (!tile) return next;
  const index = pickColumnIndex(columnAspectHeights(next), preferLongest);
  next[index].push(tile);
  return next;
}

/**
 * Place one tile into the current shortest column (left-most on a tie).
 * @param {unknown[][]} columns
 * @param {unknown} tile
 */
function appendToShortestColumn(columns, tile) {
  return appendToPickedColumn(columns, tile, false);
}

/**
 * Place one tile into the current longest column (left-most on a tie).
 * @param {unknown[][]} columns
 * @param {unknown} tile
 */
function appendToLongestColumn(columns, tile) {
  return appendToPickedColumn(columns, tile, true);
}

/**
 * @param {ParentNode | null | undefined} root
 * @returns {number[]}
 */
function measureMosaicColumnHeights(root) {
  if (!root || !root.children) return [];
  return Array.from(root.children)
    .filter((node) => node.classList && node.classList.contains("kpf-gallery__column"))
    .map((node) => {
      if (typeof node.getBoundingClientRect === "function") {
        return node.getBoundingClientRect().height;
      }
      return Number(node.offsetHeight) || 0;
    });
}

/**
 * @param {unknown[][]} columns
 * @param {ParentNode | null | undefined} root
 * @returns {number[]}
 */
function mosaicColumnHeights(columns, root) {
  const measured = measureMosaicColumnHeights(root);
  const count = Array.isArray(columns) ? columns.length : 0;
  if (count > 0 && measured.length === count) return measured;
  return columnAspectHeights(columns);
}

function waitForPaint() {
  if (typeof requestAnimationFrame !== "function") {
    return waitMs(0);
  }
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(resolve);
    });
  });
}

/**
 * @param {ParentNode | null | undefined} root
 * @param {{ src?: string }} tile
 */
function waitForTileImage(root, tile) {
  if (!root || typeof root.querySelectorAll !== "function") {
    return Promise.resolve();
  }
  const src = String(tile?.src || "").trim();
  if (!src) return Promise.resolve();
  const img = Array.from(root.querySelectorAll("img")).find(
    (node) => node.getAttribute("src") === src,
  );
  if (!img || img.complete) return Promise.resolve();
  return Promise.race([
    new Promise((resolve) => {
      img.addEventListener("load", resolve, { once: true });
      img.addEventListener("error", resolve, { once: true });
    }),
    waitMs(8000),
  ]);
}

/**
 * @param {{ width?: number, height?: number }} tile
 * @returns {{ aspectRatio: string } | undefined}
 */
function tileAspectRatioStyle(tile) {
  const width = Number(tile?.width) || 0;
  const height = Number(tile?.height) || 0;
  if (width > 0 && height > 0) return { aspectRatio: `${width} / ${height}` };
  return undefined;
}

/**
 * First paint / breakpoint change only. More-click must pin, not re-pack.
 * @param {unknown[]} items
 * @param {number} columnCount
 * @param {boolean} [preferLongest]
 */
function packMosaicColumns(items, columnCount, preferLongest = false) {
  let columns = emptyMosaicColumns(columnCount);
  for (const item of items || []) {
    columns = appendToPickedColumn(columns, item, preferLongest);
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
  GALLERY_ORIENTATION_PORTRAIT_QUERY,
  KPF_SCRAPBOOK_TILES_QUERY,
  SCRAPBOOK_TILE_FIELDS,
  SCRAPBOOK_TILES_INITIAL,
  SCRAPBOOK_TILES_PAGE,
  appendToColumn,
  appendToLongestColumn,
  appendToShortestColumn,
  decodeTileSizes,
  fetchScrapbookTiles,
  formatScrapbookTileDate,
  galleryColumnCount,
  galleryPagingForViewport,
  isGalleryMobile,
  measureMosaicColumnHeights,
  morePhotosLabel,
  mosaicColumnHeights,
  mosaicPrefersLongestColumn,
  mosaicTilesInPoolOrder,
  mosaicVisibleCount,
  nextGalleryBatch,
  normalizeScrapbookTiles,
  packMosaicColumns,
  pickColumnIndex,
  remainingPhotoCount,
  scrapbookTileTooltip,
  tileAspectHeight,
  tileAspectRatioStyle,
  tileKey,
  waitForMosaicImages,
  waitForPaint,
  waitForTileImage,
  waitMs,
};
