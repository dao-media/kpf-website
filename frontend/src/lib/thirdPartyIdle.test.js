const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  analyticsScriptsToLoad,
  canBindHoverGsap,
  gtmBootstrapScript,
  GSAP_FALLBACK_MS,
  GSAP_INTERACTIVE_IDLE_MS,
  GTM_IDLE_TIMEOUT_MS,
  GTM_LCP_SETTLE_MS,
  HOVER_GSAP_MQ,
  shouldSkipSnippetAnalyticsSrc,
} = require("./thirdPartyIdle");

describe("analyticsScriptsToLoad", () => {
  it("loads GTM only when both GTM and GA ids are set", () => {
    assert.deepEqual(analyticsScriptsToLoad("GTM-KV8778H5", "G-P4XMC78DPK"), {
      gtm: "GTM-KV8778H5",
      ga: "",
    });
  });

  it("loads gtag when GTM is absent", () => {
    assert.deepEqual(analyticsScriptsToLoad("", "G-P4XMC78DPK"), {
      gtm: "",
      ga: "G-P4XMC78DPK",
    });
  });

  it("loads nothing when both are empty", () => {
    assert.deepEqual(analyticsScriptsToLoad("", ""), { gtm: "", ga: "" });
  });
});

describe("shouldSkipSnippetAnalyticsSrc", () => {
  it("skips WP GTM when Faust already loads the container", () => {
    assert.equal(
      shouldSkipSnippetAnalyticsSrc(
        "https://www.googletagmanager.com/gtm.js?id=GTM-KV8778H5",
        "GTM-KV8778H5",
        "G-P4XMC78DPK",
      ),
      true,
    );
  });

  it("skips snippet gtag when GTM is the chosen loader", () => {
    assert.equal(
      shouldSkipSnippetAnalyticsSrc(
        "https://www.googletagmanager.com/gtag/js?id=G-P4XMC78DPK",
        "GTM-KV8778H5",
        "",
      ),
      true,
    );
  });

  it("does not skip unrelated allowlisted scripts", () => {
    assert.equal(
      shouldSkipSnippetAnalyticsSrc(
        "https://challenges.cloudflare.com/turnstile/v0/api.js",
        "GTM-KV8778H5",
        "",
      ),
      false,
    );
  });
});

describe("gtmBootstrapScript", () => {
  it("keeps the official gtm.start snippet and delays gtm.js until LCP settles", () => {
    const src = gtmBootstrapScript("GTM-KV8778H5");
    assert.match(src, /gtm\.start/);
    assert.match(src, /gtm\.js\?id='\+i/);
    assert.match(src, /GTM-KV8778H5/);
    assert.match(src, /PerformanceObserver/);
    assert.match(src, /largest-contentful-paint/);
    assert.match(src, /new PerformanceObserver\(later\)/);
    assert.doesNotMatch(src, /new PerformanceObserver\(function\(\)\{g\(\);\}\)/);
    assert.match(src, new RegExp(`setTimeout\\(idle,${GTM_LCP_SETTLE_MS}\\)`));
    assert.match(src, /requestIdleCallback/);
    assert.match(src, new RegExp(`timeout:${GTM_IDLE_TIMEOUT_MS}`));
    assert.match(src, /setTimeout\(g,8000\)/);
    assert.match(src, /pointerdown/);
  });

  it("keeps the GSAP LCP fallback well under the GTM 8s cap", () => {
    assert.equal(GSAP_FALLBACK_MS, 1200);
    assert.equal(GSAP_INTERACTIVE_IDLE_MS, 400);
    assert.equal(GTM_LCP_SETTLE_MS, 500);
    assert.equal(GTM_IDLE_TIMEOUT_MS, 2000);
  });

  it("rejects non-GTM ids", () => {
    assert.equal(gtmBootstrapScript("G-P4XMC78DPK"), "");
    assert.equal(gtmBootstrapScript(""), "");
  });
});

describe("canBindHoverGsap", () => {
  it("skips hover GSAP on coarse pointers", () => {
    assert.equal(HOVER_GSAP_MQ, "(hover: hover) and (pointer: fine)");
    assert.equal(canBindHoverGsap(() => ({ matches: false })), false);
    assert.equal(canBindHoverGsap(() => ({ matches: true })), true);
  });
});
