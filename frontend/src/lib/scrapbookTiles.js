/**
 * About “The Work” tiles — GraphQL root field kpfScrapbookTiles.
 */

const KPF_SCRAPBOOK_TILES_QUERY = `
  kpfScrapbookTiles(first: 48) {
    id
    databaseId
    attachmentId
    sourceUrl
    altText
    caption
    eventDate
    datePrecision
    title
  }
`;

/**
 * @param {unknown} tiles
 * @returns {Array<{ id: string, src: string, alt: string, caption: string, title: string }>}
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
      };
    })
    .filter(Boolean);
}

module.exports = {
  KPF_SCRAPBOOK_TILES_QUERY,
  normalizeScrapbookTiles,
};
