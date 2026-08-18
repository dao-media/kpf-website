/**
 * About “The Work” mosaic — all photos from Scrapbook CPT posts (kpf_scrapbook).
 * Never includes Kevin slides (kpf_kevin). GraphQL: kpfScrapbookTiles.
 */

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

/** Photos shown on first paint / SSR. */
const SCRAPBOOK_TILES_INITIAL = 12;

/** Default GraphQL page size when fetching more for “See more”. */
const SCRAPBOOK_TILES_PAGE = 18;

const KPF_SCRAPBOOK_TILES_QUERY = `
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
      const src = String(tile?.sourceUrl || "").trim();
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

/**
 * Fetch another page of scrapbook mosaic tiles (client “See more”).
 * @param {{ first?: number, offset?: number }} [opts]
 * @returns {Promise<Array<{ id: string, src: string, alt: string, caption: string, title: string }>>}
 */
async function fetchScrapbookTiles({
  first = SCRAPBOOK_TILES_PAGE,
  offset = 0,
} = {}) {
  const base = String(process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(
    /\/$/,
    "",
  );
  if (!base) {
    return [];
  }

  const response = await fetch(`${base}/graphql`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `
        query KpfScrapbookTilesPage($first: Int, $offset: Int) {
          kpfScrapbookTiles(first: $first, offset: $offset) {
            ${SCRAPBOOK_TILE_FIELDS}
          }
        }
      `,
      variables: { first, offset },
    }),
  });

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  if (payload?.errors?.length) {
    return [];
  }

  return normalizeScrapbookTiles(payload?.data?.kpfScrapbookTiles);
}

module.exports = {
  KPF_SCRAPBOOK_TILES_QUERY,
  SCRAPBOOK_TILES_INITIAL,
  SCRAPBOOK_TILES_PAGE,
  normalizeScrapbookTiles,
  fetchScrapbookTiles,
  formatScrapbookTileDate,
  scrapbookTileTooltip,
};
