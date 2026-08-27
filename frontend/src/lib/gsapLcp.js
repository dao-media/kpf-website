/**
 * Home hero copy (and the hero box itself) is the mobile LCP. CMS in-view
 * fades that boot after LCP re-hide already-painted text and push LCP to ~4–5s.
 * Dad, alumni, and runner cutouts stay painted (desktop/tablet LCP).
 */
function isHeroLcpNode(node) {
  if (!node || typeof node.closest !== "function") return false;
  if (!node.closest(".kpf-hero")) return false;
  if (
    node.closest(
      ".kpf-hero__cutout--dad, .kpf-hero__cutout--alumni, .kpf-hero__cutout--runner",
    )
  ) {
    return true;
  }
  if (node.closest(".kpf-hero__stage, .kpf-hero__cutout")) return false;
  return true;
}

/** More-photos tiles own a CSS fade/rise; CMS in-view GSAP must not re-hide them. */
function isGalleryEnterNode(node) {
  if (!node || typeof node.closest !== "function") return false;
  return Boolean(
    node.closest(".kpf-gallery__item.is-enter, .kpf-gallery__item.is-enter-in"),
  );
}

module.exports = { isGalleryEnterNode, isHeroLcpNode };
