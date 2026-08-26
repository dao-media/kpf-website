const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { pluginsForAnimations } = require("./gsapPlugins");

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

  it("loads DrawSVG and CustomEase when the animation asks for them", () => {
    const names = pluginsForAnimations([
      {
        config: { ease: "custom", svg: { effect: "draw" } },
      },
    ]);
    assert.ok(names.includes("DrawSVGPlugin"));
    assert.ok(names.includes("CustomEase"));
    assert.ok(names.includes("ScrollTrigger"));
    assert.ok(!names.includes("MorphSVGPlugin"));
    assert.ok(!names.includes("Physics2DPlugin"));
    assert.ok(!names.includes("Flip"));
    assert.ok(!names.includes("ScrollSmoother"));
  });
});
