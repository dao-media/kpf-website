const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isHeroLcpNode } = require("./gsapLcp");

function fakeNode(chain) {
  return {
    closest(selector) {
      return Object.prototype.hasOwnProperty.call(chain, selector)
        ? chain[selector]
        : null;
    },
  };
}

describe("isHeroLcpNode", () => {
  it("protects hero copy identity for docs; Gate waits for LCP so tweens may still fade", () => {
    const body = fakeNode({
      ".kpf-hero": {},
      ".kpf-hero__stage, .kpf-hero__cutout": null,
      ".kpf-hero__content, .kpf-hero__layout, .kpf-content-block": {},
    });
    const cutout = fakeNode({
      ".kpf-hero": {},
      ".kpf-hero__stage, .kpf-hero__cutout": {},
      ".kpf-hero__content, .kpf-hero__layout, .kpf-content-block": null,
    });
    const story = fakeNode({
      ".kpf-hero": null,
      ".kpf-hero__stage, .kpf-hero__cutout": null,
      ".kpf-hero__content, .kpf-hero__layout, .kpf-content-block": {},
    });
    assert.equal(isHeroLcpNode(body), true);
    assert.equal(isHeroLcpNode(cutout), false);
    assert.equal(isHeroLcpNode(story), false);
    assert.equal(isHeroLcpNode(null), false);
  });
});
