const { preferLocalWebp } = require("./preferLocalWebp");

const KPF_SCAFFOLD_MEDIA_FIELDS = `
    key
    databaseId
    sourceUrl
    altText
    title
`;

const KPF_SCAFFOLD_MEDIA_QUERY = `
  kpfScaffoldMedia {
    ${KPF_SCAFFOLD_MEDIA_FIELDS}
  }
`;

/**
 * Limit named media to key prefixes (e.g. "about.", "cta.") so inner pages
 * do not download the full scaffold catalog.
 * @param {string[]} prefixes
 */
function scaffoldMediaQuery(prefixes) {
  const list = (prefixes || []).map((p) => String(p || "").trim()).filter(Boolean);
  if (!list.length) return KPF_SCAFFOLD_MEDIA_QUERY;
  const args = list.map((p) => JSON.stringify(p)).join(", ");
  return `
  kpfScaffoldMedia(prefixes: [${args}]) {
    ${KPF_SCAFFOLD_MEDIA_FIELDS}
  }
`;
}

/**
 * @param {Array<{ key?: string, sourceUrl?: string, altText?: string, title?: string, databaseId?: number }>|null|undefined} items
 * @returns {Record<string, { sourceUrl: string, altText: string, title: string, databaseId: number }>}
 */
function scaffoldMediaMap(items) {
  const map = {};
  for (const item of items || []) {
    if (!item?.key || !item?.sourceUrl) continue;
    map[item.key] = {
      sourceUrl: preferLocalWebp(item.sourceUrl),
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
      src: preferLocalWebp(hit.sourceUrl),
      alt: hit.altText || fallback.alt || "",
    };
  }
  return {
    src: preferLocalWebp(fallback.src || ""),
    alt: fallback.alt || "",
  };
}

module.exports = {
  KPF_SCAFFOLD_MEDIA_QUERY,
  resolveMedia,
  scaffoldMediaMap,
  scaffoldMediaQuery,
};
