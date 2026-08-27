const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  animationsUsedOnPage,
  isDisplayedForTween,
  partitionGsapAnimations,
  pluginsForAnimations,
} = require("./gsapPlugins");

function fakeRoot(hits) {
  return {
    querySelectorAll(selector) {
      return hits.includes(selector) ? [{}] : [];
    },
  };
}

describe("pluginsForAnimations", () => {
  it("loads nothing when there are no animations", () => {
    assert.deepEqual(pluginsForAnimations([]), []);
    assert.deepEqual(pluginsForAnimations(null), []);
  });

  it("does not request Club plugins for a basic from tween", () => {
    const names = pluginsForAnimations([
      {
        trigger: "in-view",
        config: { from: { y: 20 }, duration: 0.4 },
      },
    ]);
    assert.deepEqual([...names].sort(), ["ScrollTrigger"]);
  });

  it("loads DrawSVG and CustomEase only when this animation asks for them", () => {
    const names = pluginsForAnimations([
      {
        trigger: "hover",
        config: { ease: "custom", svg: { effect: "draw" } },
      },
    ]);
    assert.ok(names.includes("DrawSVGPlugin"));
    assert.ok(names.includes("CustomEase"));
    assert.ok(!names.includes("ScrollTrigger"));
    assert.ok(!names.includes("MorphSVGPlugin"));
    assert.ok(!names.includes("Physics2DPlugin"));
    assert.ok(!names.includes("Flip"));
    assert.ok(!names.includes("ScrollSmoother"));
  });
});

describe("animationsUsedOnPage", () => {
  it("keeps only animations whose selector exists on the page", () => {
    const used = animationsUsedOnPage(
      [
        {
          databaseId: 1,
          selector: ".kpf-hero",
          trigger: "in-view",
          configJson: '{"svg":{"effect":"morph"}}',
        },
        {
          databaseId: 2,
          selector: ".kpf-about-only",
          trigger: "in-view",
          configJson: '{"svg":{"effect":"draw"}}',
        },
      ],
      fakeRoot([".kpf-hero"]),
    );
    assert.equal(used.length, 1);
    assert.equal(used[0].databaseId, 1);
    assert.deepEqual(pluginsForAnimations(used).sort(), [
      "MorphSVGPlugin",
      "ScrollTrigger",
    ]);
  });

  it("returns nothing when the page has no matching targets", () => {
    const used = animationsUsedOnPage(
      [
        {
          selector: ".kpf-about-only",
          configJson: "{}",
        },
      ],
      fakeRoot([]),
    );
    assert.deepEqual(used, []);
    assert.deepEqual(pluginsForAnimations(used), []);
  });
});

describe("isDisplayedForTween", () => {
  it("rejects non-elements", () => {
    assert.equal(isDisplayedForTween(null), false);
    assert.equal(isDisplayedForTween({ nodeType: 3 }), false);
  });

  it("skips display:none via checkVisibility without requiring getComputedStyle", () => {
    assert.equal(
      isDisplayedForTween({
        nodeType: 1,
        checkVisibility: (opts) => {
          assert.equal(opts.checkOpacity, false);
          return false;
        },
      }),
      false,
    );
    assert.equal(
      isDisplayedForTween({
        nodeType: 1,
        checkVisibility: () => true,
      }),
      true,
    );
  });

  it("treats elements without checkVisibility as displayed", () => {
    assert.equal(isDisplayedForTween({ nodeType: 1 }), true);
  });
});

describe("partitionGsapAnimations", () => {
  it("splits hover/click from in-view/load so the badge can bind before LCP", () => {
    const { interactive, deferred } = partitionGsapAnimations([
      { trigger: "hover", selector: ".kpf-header__brand" },
      { trigger: "click", selector: ".kpf-btn" },
      { trigger: "in-view", selector: ".kpf-hero" },
      { trigger: "load", selector: ".kpf-hero--about" },
      null,
    ]);
    assert.equal(interactive.length, 2);
    assert.equal(deferred.length, 2);
    assert.equal(interactive[0].trigger, "hover");
    assert.equal(deferred[0].trigger, "in-view");
  });
});
