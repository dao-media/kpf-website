const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { isGalleryEnterNode, isHeroLcpNode } = require("./gsapLcp");

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
  it("protects hero copy, the hero box, and dad/alumni/runner; later sections stay tweenable", () => {
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
      ".kpf-hero__cutout--dad, .kpf-hero__cutout--alumni, .kpf-hero__cutout--runner": {},
      ".kpf-hero__stage, .kpf-hero__cutout": {},
    });
    const runner = fakeNode({
      ".kpf-hero": {},
      ".kpf-hero__cutout--dad, .kpf-hero__cutout--alumni, .kpf-hero__cutout--runner": {},
      ".kpf-hero__stage, .kpf-hero__cutout": {},
    });
    const story = fakeNode({
      ".kpf-hero": null,
      ".kpf-hero__cutout--dad, .kpf-hero__cutout--alumni, .kpf-hero__cutout--runner": null,
      ".kpf-hero__stage, .kpf-hero__cutout": null,
    });
    assert.equal(isHeroLcpNode(hero), true);
    assert.equal(isHeroLcpNode(body), true);
    assert.equal(isHeroLcpNode(dad), true);
    assert.equal(isHeroLcpNode(runner), true);
    assert.equal(isHeroLcpNode(story), false);
    assert.equal(isHeroLcpNode(null), false);
  });
});

describe("isGalleryEnterNode", () => {
  it("skips mosaic tiles while they play the more-photos enter", () => {
    const entering = fakeNode({
      ".kpf-gallery__item.is-enter, .kpf-gallery__item.is-enter-in": {},
    });
    const rest = fakeNode({
      ".kpf-gallery__item.is-enter, .kpf-gallery__item.is-enter-in": null,
    });
    assert.equal(isGalleryEnterNode(entering), true);
    assert.equal(isGalleryEnterNode(rest), false);
    assert.equal(isGalleryEnterNode(null), false);
  });
});

describe("homepage LCP wiring", () => {
  it("keeps donate-band copy opaque parchment on deep, not ember", () => {
    const css = fs.readFileSync(
      path.join(__dirname, "../styles/pages.css"),
      "utf8",
    );
    assert.match(
      css,
      /\.kpf-donate--band \.kpf-donate__note\s*\{[^}]*--kpf-parchment/,
    );
    assert.doesNotMatch(
      css,
      /\.kpf-donate__note\s*\{[^}]*color:\s*var\(--kpf-ember/,
    );
  });

  it("preloads the desktop runner and does not autoplay footer smoke", () => {
    const home = fs.readFileSync(
      path.join(__dirname, "../components/HomePageScaffold.js"),
      "utf8",
    );
    assert.match(home, /href=\{runnerSrc\}/);
    assert.match(home, /isRunner \|\| isAlumni \? "high"/);
    assert.match(home, /isDad \|\| isAlumni \|\| isRunner/);
    assert.doesNotMatch(home, /href=\{dadSrc\}/);

    const pages = fs.readFileSync(
      path.join(__dirname, "../styles/pages.css"),
      "utf8",
    );
    assert.doesNotMatch(pages, /@keyframes kpf-hero-cutout-runner/);

    const cigar = fs.readFileSync(
      path.join(__dirname, "../components/CigarSmoke.js"),
      "utf8",
    );
    assert.match(cigar, /preload="none"/);
    assert.doesNotMatch(cigar, /autoPlay/);
    assert.match(cigar, /playVideoWhenVisible/);
  });

  it("ships a display-sized anniversary badge, not the 1422px master", () => {
    const header = fs.readFileSync(
      path.join(__dirname, "../components/KpfHeader.js"),
      "utf8",
    );
    assert.match(header, /50-badge-258\.webp/);
    assert.doesNotMatch(header, /BRAND_BADGE_SRC = "\/media\/brand\/50-badge\.webp"/);
  });
});
