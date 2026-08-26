/**
 * Hero copy is the LCP candidate. CMS `from { autoAlpha: 0 }` on those
 * nodes delays Largest Contentful Paint until GSAP runs. Cutouts still fade.
 */
function isHeroLcpNode(node) {
  if (!node || typeof node.closest !== "function") return false;
  if (!node.closest(".kpf-hero")) return false;
  if (node.closest(".kpf-hero__stage, .kpf-hero__cutout")) return false;
  return Boolean(node.closest(".kpf-hero__content, .kpf-hero__layout, .kpf-content-block"));
}

module.exports = { isHeroLcpNode };
