/**
 * Pure helpers for CMS-driven site chrome behavior.
 * Run with: node --test src/lib/siteChrome.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  clampInt,
  footerClassNames,
  headerClassNames,
  normalizeFooterBehavior,
  normalizeHeaderBehavior,
  shouldRevealSmartHeader,
} = require("./siteChrome.js");

describe("normalizeHeaderBehavior", () => {
  it("applies defaults and clamps timing", () => {
    const behavior = normalizeHeaderBehavior({
      mode: "unknown",
      retractDelayMs: 99999,
      overlayHero: 1,
    });
    assert.equal(behavior.mode, "sticky");
    assert.equal(behavior.retractDelayMs, 2000);
    assert.equal(behavior.overlayHero, true);
    assert.equal(behavior.revealAtTop, true);
  });

  it("keeps sticky-hide-reveal mode", () => {
    assert.equal(
      normalizeHeaderBehavior({ mode: "sticky-hide-reveal" }).mode,
      "sticky-hide-reveal"
    );
  });
});

describe("normalizeFooterBehavior", () => {
  it("defaults to inline full-width", () => {
    const behavior = normalizeFooterBehavior({});
    assert.equal(behavior.mode, "inline");
    assert.equal(behavior.fullWidth, true);
  });
});

describe("clampInt", () => {
  it("falls back for non-finite values", () => {
    assert.equal(clampInt("nope", 0, 10, 4), 4);
  });
});

describe("shouldRevealSmartHeader", () => {
  it("stays visible with focus or reduced motion", () => {
    assert.equal(
      shouldRevealSmartHeader({
        direction: "down",
        scrollY: 400,
        thresholdPx: 12,
        revealAtTop: true,
        hasFocusWithin: true,
        reducedMotion: false,
      }),
      true
    );
    assert.equal(
      shouldRevealSmartHeader({
        direction: "down",
        scrollY: 400,
        thresholdPx: 12,
        revealAtTop: true,
        hasFocusWithin: false,
        reducedMotion: true,
      }),
      true
    );
  });

  it("hides on downward scroll and reveals upward", () => {
    assert.equal(
      shouldRevealSmartHeader({
        direction: "down",
        scrollY: 400,
        thresholdPx: 12,
        revealAtTop: true,
        hasFocusWithin: false,
        reducedMotion: false,
      }),
      false
    );
    assert.equal(
      shouldRevealSmartHeader({
        direction: "up",
        scrollY: 400,
        thresholdPx: 12,
        revealAtTop: true,
        hasFocusWithin: false,
        reducedMotion: false,
      }),
      true
    );
  });

  it("reveals at top when configured", () => {
    assert.equal(
      shouldRevealSmartHeader({
        direction: "down",
        scrollY: 4,
        thresholdPx: 12,
        revealAtTop: true,
        hasFocusWithin: false,
        reducedMotion: false,
      }),
      true
    );
  });
});

describe("class helpers", () => {
  it("marks overlay and retracted header states", () => {
    const classes = headerClassNames(
      normalizeHeaderBehavior({
        mode: "sticky-hide-reveal",
        overlayHero: true,
        transparentAtTop: true,
      }),
      { visible: false, atTop: true }
    );
    assert.match(classes, /overlay/);
    assert.match(classes, /retracted/);
    assert.match(classes, /transparent-top/);
  });

  it("marks footer layout classes", () => {
    const classes = footerClassNames(
      normalizeFooterBehavior({ mode: "sticky-bottom", fullWidth: false })
    );
    assert.match(classes, /sticky-bottom/);
    assert.match(classes, /contained/);
  });
});
