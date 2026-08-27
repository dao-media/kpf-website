const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const {
  inViewEntranceExtra,
  isHiddenStart,
  normalizeEntranceTween,
  stripHideProps,
} = require("./gsapEntrance");

describe("isHiddenStart", () => {
  it("treats autoAlpha/opacity 0 as a fade start", () => {
    assert.equal(isHiddenStart({ y: -42, autoAlpha: 0 }), true);
    assert.equal(isHiddenStart({ opacity: 0 }), true);
    assert.equal(isHiddenStart({ y: -42 }), false);
    assert.equal(isHiddenStart(null), false);
  });
});

describe("normalizeEntranceTween", () => {
  it("upgrades CMS from() fade+slide to fromTo 0→1 alpha with lazy:false", () => {
    const out = normalizeEntranceTween({
      method: "from",
      from: { y: -42, autoAlpha: 0 },
      extra: { scrollTrigger: { start: "top 80%" } },
    });
    assert.equal(out.method, "fromTo");
    assert.equal(out.fromVars.autoAlpha, 0);
    assert.equal(out.fromVars.y, -42);
    assert.equal(out.toVars.autoAlpha, 1);
    assert.equal(out.toVars.y, 0);
    assert.equal(out.extra.lazy, false);
    assert.equal(out.extra.immediateRender, true);
    assert.deepEqual(out.extra.scrollTrigger, { start: "top 80%" });
  });

  it("sends media fade-in/up back to y:0 at full opacity", () => {
    const out = normalizeEntranceTween({
      method: "from",
      from: { y: 42, autoAlpha: 0 },
    });
    assert.equal(out.fromVars.y, 42);
    assert.equal(out.toVars.y, 0);
    assert.equal(out.toVars.autoAlpha, 1);
  });

  it("does not hide header-badge tweens", () => {
    const out = normalizeEntranceTween({
      method: "from",
      from: { y: -28, autoAlpha: 0 },
      hideProtected: true,
    });
    assert.equal(out.method, "from");
    assert.equal(out.fromVars.autoAlpha, undefined);
    assert.equal(out.fromVars.y, -28);
    assert.equal(out.extra.lazy, undefined);
  });

  it("leaves a motion-only from() alone", () => {
    const out = normalizeEntranceTween({
      method: "from",
      from: { y: -20 },
    });
    assert.equal(out.method, "from");
    assert.deepEqual(out.fromVars, { y: -20 });
  });
});

describe("stripHideProps / inViewEntranceExtra", () => {
  it("drops alpha keys and forces a non-lazy first paint", () => {
    assert.deepEqual(stripHideProps({ y: 8, autoAlpha: 0, opacity: 0 }), {
      y: 8,
    });
    const extra = inViewEntranceExtra({ delay: 0.05 });
    assert.equal(extra.lazy, false);
    assert.equal(extra.immediateRender, true);
    assert.equal(extra.delay, 0.05);
  });
});

describe("GsapRuntime wiring", () => {
  it("routes in-view tweens through the entrance hardener", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../components/GsapRuntime.js"),
      "utf8",
    );
    assert.match(src, /normalizeEntranceTween/);
    assert.match(src, /inViewEntranceExtra/);
    assert.match(src, /isHeroLcpNode\(target\)/);
  });
});

describe("GsapRuntimeGate wiring", () => {
  it("binds hover animations before the LCP gate", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../components/GsapRuntimeGate.js"),
      "utf8",
    );
    assert.match(src, /partitionGsapAnimations/);
    assert.match(src, /interactive\.length/);
    assert.match(src, /GSAP_FALLBACK_MS/);
  });
});
