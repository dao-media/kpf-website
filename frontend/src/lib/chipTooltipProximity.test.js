const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  edgeBufferForRect,
  edgeExitProgress,
  lerp,
  poseFromProgress,
  SCALE_EXIT,
} = require("./chipTooltipProximity");

describe("chipTooltipProximity", () => {
  const rect = { left: 0, right: 200, top: 0, bottom: 40 };

  it("is at rest in the inner core", () => {
    assert.equal(edgeExitProgress(100, 20, rect, 16), 0);
  });

  it("reaches 1 on the edge and outside", () => {
    assert.equal(edgeExitProgress(0, 20, rect, 16), 1);
    assert.equal(edgeExitProgress(-4, 20, rect, 16), 1);
  });

  it("ramps through the buffer instead of clipping at the edge", () => {
    const mid = edgeExitProgress(8, 20, rect, 16);
    assert.ok(mid > 0.2 && mid < 0.9);
    assert.ok(mid > edgeExitProgress(12, 20, rect, 16));
  });

  it("keeps a rest core on short chips", () => {
    assert.equal(edgeBufferForRect({ width: 44, height: 44 }), 18.48);
    assert.equal(edgeBufferForRect({ width: 16, height: 16 }), 8);
  });

  it("lerps scale toward the exit pose", () => {
    assert.equal(lerp(1, SCALE_EXIT, 0), 1);
    assert.equal(lerp(1, SCALE_EXIT, 1), SCALE_EXIT);
    assert.equal(poseFromProgress(0).scale, 1);
    assert.equal(poseFromProgress(1).scale, SCALE_EXIT);
  });

  it("starts scaling inside a donate-sized button before the edge", () => {
    const donate = { left: 0, right: 160, top: 0, bottom: 40, width: 160, height: 40 };
    const buffer = edgeBufferForRect(donate);
    const rest = poseFromProgress(edgeExitProgress(80, 20, donate, buffer));
    const inner = poseFromProgress(edgeExitProgress(160 - buffer * 0.35, 20, donate, buffer));
    const rim = poseFromProgress(edgeExitProgress(159, 20, donate, buffer));
    assert.equal(rest.scale, 1);
    assert.ok(inner.scale < 0.99 && inner.scale > rim.scale);
    assert.ok(rim.scale < 0.95);
    assert.ok(rim.autoAlpha < rest.autoAlpha);
  });
});
