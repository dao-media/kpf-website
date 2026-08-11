const KPF_SCAFFOLD_MEDIA_QUERY = `
  kpfScaffoldMedia {
    key
    databaseId
    sourceUrl
    altText
    title
  }
`;

/**
 * @param {Array<{ key?: string, sourceUrl?: string, altText?: string, title?: string, databaseId?: number }>|null|undefined} items
 * @returns {Record<string, { sourceUrl: string, altText: string, title: string, databaseId: number }>}
 */
function scaffoldMediaMap(items) {
  const map = {};
  for (const item of items || []) {
    if (!item?.key || !item?.sourceUrl) continue;
    map[item.key] = {
      sourceUrl: item.sourceUrl,
      altText: item.altText || "",
      title: item.title || "",
      databaseId: item.databaseId || 0,
    };
  }
  return map;
}

/**
 * Prefer WP media URL/alt; fall back to local /media path from pageCopy.
 * @param {Record<string, { sourceUrl?: string, altText?: string }>} map
 * @param {string} key
 * @param {{ src?: string, alt?: string }} fallback
 */
function resolveMedia(map, key, fallback = {}) {
  const hit = map?.[key];
  if (hit?.sourceUrl) {
    return {
      src: hit.sourceUrl,
      alt: hit.altText || fallback.alt || "",
    };
  }
  return {
    src: fallback.src || "",
    alt: fallback.alt || "",
  };
}

module.exports = {
  KPF_SCAFFOLD_MEDIA_QUERY,
  resolveMedia,
  scaffoldMediaMap,
};
