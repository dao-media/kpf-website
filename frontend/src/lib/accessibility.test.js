const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  KPF_ACCESSIBILITY_QUERY,
  normalizeAccessibility,
  buildAccessibilityCss,
} = require("./accessibility");

describe("accessibility utilities", () => {
  it("keeps the Faust SSG fragment on the live WordPress schema", () => {
    assert.match(KPF_ACCESSIBILITY_QUERY, /skipLink/);
    assert.doesNotMatch(KPF_ACCESSIBILITY_QUERY, /\bskipLabel\b/);
    assert.doesNotMatch(KPF_ACCESSIBILITY_QUERY, /\bdisplay\s*\{/);
  });

  it("normalizes missing config safely", () => {
    const config = normalizeAccessibility(null);
    assert.equal(config.navigation.skipTarget, "#main");
    assert.equal(config.navigation.skipLink, false);
    assert.equal(config.navigation.skipLabel, "Skip to content");
    assert.equal(config.content.language, "en");
    assert.equal(config.display.minTargetSize, "off");
    assert.equal(config.display.textScale, 100);
  });

  it("keeps valid skip targets and clamps ring width", () => {
    const config = normalizeAccessibility({
      navigation: {
        skipLink: true,
        skipTarget: "#main",
        focusRing: true,
        focusRingColor: "#112233",
        focusRingWidth: 12,
        focusScrollMargin: 400,
      },
    });
    assert.equal(config.navigation.focusRingWidth, 8);
    assert.equal(config.navigation.focusRingColor, "#112233");
    assert.equal(config.navigation.focusScrollMargin, 240);
  });

  it("builds focus, underline, and reduced-motion CSS", () => {
    const css = buildAccessibilityCss(
      normalizeAccessibility({
        navigation: {
          skipLink: true,
          skipTarget: "#main",
          focusRing: true,
          focusRingColor: "#abc123",
          focusRingWidth: 3,
          focusNotObscured: true,
        },
        content: { underlineLinks: true, language: "en", routeAnnouncer: true },
        display: { textScale: 125, minTargetSize: "aa", honorPrefersContrast: true },
        motion: {
          honorPrefersReducedMotion: true,
          forceReduceMotion: false,
        },
        forms: { enhancedFocus: true, statusLiveRegion: true },
        media: { blockAutoplayReducedMotion: true },
        advanced: { customCss: ".kpf-a11y-test{color:red}", debugOutlines: false },
      }),
    );

    assert.match(css, /:focus-visible/);
    assert.match(css, /#abc123/);
    assert.match(css, /text-decoration:\s*underline/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    assert.match(css, /\.kpf-a11y-test\{color:red\}/);
    assert.match(css, /html \{ font-size: 125%; \}/);
    assert.match(css, /min-height:\s*24px/);
    assert.match(css, /scroll-margin-top:\s*96px/);
    assert.match(css, /prefers-contrast:\s*more/);
  });

  it("emits comfortable target size and contrast boost", () => {
    const css = buildAccessibilityCss(
      normalizeAccessibility({
        display: { contrastBoost: true, minTargetSize: "comfortable" },
      }),
    );
    assert.match(css, /min-height:\s*44px/);
    assert.match(css, /--kpf-mute:\s*#3d2c2d/);
  });
});
