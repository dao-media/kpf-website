const {
  KPF_STYLESHEET_QUERY,
  stylesheetHref,
} = require("@/lib/globalStylesheet");

export { KPF_STYLESHEET_QUERY };

function promoteStylesheet(event) {
  const link = event?.currentTarget;
  if (!link || link.rel === "stylesheet") return;
  link.media = "all";
  link.rel = "stylesheet";
}

/**
 * CMS token overlay. Omit the tag when empty so first paint is not blocked
 * by a same-origin CSS request that waits on WordPress. When tokens exist,
 * load print→all so the overlay is never render-blocking.
 */
export default function GlobalStylesheet({ href, revision, hasOverlay = false }) {
  if (!hasOverlay) return null;
  const src = href || stylesheetHref(revision);
  if (!src) return null;

  return (
    <link
      rel="stylesheet"
      href={src}
      media="print"
      onLoad={promoteStylesheet}
      data-kpf-global-stylesheet=""
      data-kpf-stylesheet-revision={revision || undefined}
    />
  );
}
