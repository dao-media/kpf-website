/**
 * Hero copy is the LCP candidate. GsapRuntimeGate waits for LCP before
 * booting Club GSAP, so entrance tweens must still fade (autoAlpha 0→1).
 * Do not strip hide props here — that left a y-shift with no opacity.
 */
function isHeroLcpNode(node) {
  if (!node || typeof node.closest !== "function") return false;
  if (!node.closest(".kpf-hero")) return false;
  if (node.closest(".kpf-hero__stage, .kpf-hero__cutout")) return false;
  return Boolean(node.closest(".kpf-hero__content, .kpf-hero__layout, .kpf-content-block"));
}

module.exports = { isHeroLcpNode };
