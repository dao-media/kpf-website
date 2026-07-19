const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeAccessibility,
  buildAccessibilityCss,
} = require("./accessibility");

describe("accessibility utilities", () => {
  it("normalizes missing config safely", () => {
    const config = normalizeAccessibility(null);
    assert.equal(config.navigation.skipTarget, "#main");
    assert.equal(config.navigation.skipLink, false);
    assert.equal(config.content.language, "en");
  });

  it("keeps valid skip targets and clamps ring width", () => {
    const config = normalizeAccessibility({
      navigation: {
        skipLink: true,
        skipTarget: "#main",
        focusRing: true,
        focusRingColor: "#112233",
        focusRingWidth: 12,
      },
    });
    assert.equal(config.navigation.focusRingWidth, 8);
    assert.equal(config.navigation.focusRingColor, "#112233");
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
        },
        content: { underlineLinks: true, language: "en", routeAnnouncer: true },
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
  });
});
