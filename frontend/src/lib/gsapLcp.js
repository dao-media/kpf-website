/**
 * Home hero copy (and the hero box itself) is the mobile LCP. CMS in-view
 * fades that boot after LCP re-hide already-painted text and push LCP to ~4–5s.
 * Dad and alumni cutouts stay painted (desktop/tablet LCP). The runner
 * can still tween.
 */
function isHeroLcpNode(node) {
  if (!node || typeof node.closest !== "function") return false;
  if (!node.closest(".kpf-hero")) return false;
  if (node.closest(".kpf-hero__cutout--dad, .kpf-hero__cutout--alumni")) {
    return true;
  }
  if (node.closest(".kpf-hero__stage, .kpf-hero__cutout")) return false;
  return true;
}

module.exports = { isHeroLcpNode };
