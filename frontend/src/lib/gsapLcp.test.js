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
  it("protects hero copy, the hero box, and dad/alumni; runner and later sections stay tweenable", () => {
    const hero = fakeNode({
      ".kpf-hero": {},
      ".kpf-hero__stage, .kpf-hero__cutout": null,
    });
    const body = fakeNode({
      ".kpf-hero": {},
      ".kpf-hero__stage, .kpf-hero__cutout": null,
    });
    const dad = fakeNode({
      ".kpf-hero": {},
      ".kpf-hero__cutout--dad, .kpf-hero__cutout--alumni": {},
      ".kpf-hero__stage, .kpf-hero__cutout": {},
    });
    const runner = fakeNode({
      ".kpf-hero": {},
      ".kpf-hero__cutout--dad, .kpf-hero__cutout--alumni": null,
      ".kpf-hero__stage, .kpf-hero__cutout": {},
    });
    const story = fakeNode({
      ".kpf-hero": null,
      ".kpf-hero__cutout--dad, .kpf-hero__cutout--alumni": null,
      ".kpf-hero__stage, .kpf-hero__cutout": null,
    });
    assert.equal(isHeroLcpNode(hero), true);
    assert.equal(isHeroLcpNode(body), true);
    assert.equal(isHeroLcpNode(dad), true);
    assert.equal(isHeroLcpNode(runner), false);
    assert.equal(isHeroLcpNode(story), false);
    assert.equal(isHeroLcpNode(null), false);
  });
});
