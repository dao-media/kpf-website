const {
  KPF_STYLESHEET_QUERY,
  stylesheetHref,
} = require("@/lib/globalStylesheet");

export { KPF_STYLESHEET_QUERY };

export default function GlobalStylesheet({ href, revision }) {
  const src = href || stylesheetHref(revision);
  if (!src) return null;

  return (
    <link
      rel="stylesheet"
      href={src}
      data-kpf-global-stylesheet=""
      data-kpf-stylesheet-revision={revision || undefined}
    />
  );
}
