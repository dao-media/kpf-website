/**
 * CMS stylesheet delivery — keep CSS out of Faust/Apollo page payloads.
 */

const KPF_STYLESHEET_QUERY = `
  kpfStylesheetInfo {
    revision
    updatedAt
  }
`;

const PAGES_MARKER = "/* === KPF_PAGES_LAYER === */";
const PAGES_HEADER_RE = /\/\*\*?[\s*]*KPF Pages stylesheet/;
const TOKENS_BLOCK_RE = /\/\* kpf-tokens:start \*\/[\s\S]*?\/\* kpf-tokens:end \*\//;

/**
 * Byte offset of the first pages layer (marker or the shipped file header).
 * Live CPT CSS duplicated pages.css without the marker, so matching only
 * `KPF_PAGES_LAYER` left ~1.5 MB of copies on the public stylesheet.
 */
function pagesLayerIndex(css) {
  const text = String(css || "");
  const marker = text.indexOf(PAGES_MARKER);
  const headerMatch = text.match(PAGES_HEADER_RE);
  const header = headerMatch && typeof headerMatch.index === "number" ? headerMatch.index : -1;
  const hits = [marker, header].filter((index) => index >= 0);
  return hits.length ? Math.min(...hits) : -1;
}

function withoutPagesLayer(css) {
  const text = String(css || "");
  const index = pagesLayerIndex(text);
  return (index === -1 ? text : text.slice(0, index)).trim();
}

/**
 * Public overlay is the CMS tokens block only. Webpack already ships
 * foundation (components.css) and pages.css.
 */
function publicOverlayCss(css) {
  const withoutPages = withoutPagesLayer(css);
  const match = withoutPages.match(TOKENS_BLOCK_RE);
  return match ? match[0].trim() : "";
}

function stylesheetHref(revision) {
  const token = String(revision || "").trim();
  const qs = token ? `?rev=${encodeURIComponent(token)}` : "";
  return `/kpf-stylesheet.css${qs}`;
}

function stylesheetMetaFromPageProps(pageProps) {
  const info =
    pageProps?.__TEMPLATE_QUERY_DATA__?.kpfStylesheetInfo ||
    pageProps?.kpfStylesheetInfo ||
    null;
  const revision = String(info?.revision || "").trim();
  return {
    revision,
    href: stylesheetHref(revision),
  };
}

module.exports = {
  KPF_STYLESHEET_QUERY,
  PAGES_MARKER,
  pagesLayerIndex,
  stylesheetHref,
  stylesheetMetaFromPageProps,
  withoutPagesLayer,
  publicOverlayCss,
};
