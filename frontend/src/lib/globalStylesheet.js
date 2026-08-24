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

function withoutPagesLayer(css) {
  const text = String(css || "");
  const index = text.indexOf(PAGES_MARKER);
  return (index === -1 ? text : text.slice(0, index)).trim();
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
  stylesheetHref,
  stylesheetMetaFromPageProps,
  withoutPagesLayer,
};
