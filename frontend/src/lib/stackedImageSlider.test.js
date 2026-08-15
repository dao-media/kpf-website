const test = require("node:test");
const assert = require("node:assert/strict");
const {
	layerScale,
	layerOffset,
	layerOpacity,
	visibleScales,
	stackLayout,
	advanceQueue,
	rotateQueue,
	DEFAULT_SCALE_STEP,
	DEFAULT_STAGGER_X,
	DEFAULT_BACK_OPACITY,
	DEFAULT_VISIBLE_COUNT,
} = require("./stackedImageSlider");

test("layerScale applies 12% reduction per slot", () => {
	assert.equal(layerScale(0), 1);
	assert.equal(layerScale(1), 0.88);
	assert.ok(Math.abs(layerScale(2) - 0.88 ** 2) < 1e-9);
	assert.ok(Math.abs(layerScale(3) - 0.88 ** 3) < 1e-9);
});

test("visibleScales returns four ladder values by default", () => {
	const scales = visibleScales();
	assert.equal(scales.length, DEFAULT_VISIBLE_COUNT);
	assert.deepEqual(
		scales.map((n) => Number(n.toFixed(6))),
		[1, 0.88, Number((0.88 ** 2).toFixed(6)), Number((0.88 ** 3).toFixed(6))],
	);
	assert.equal(DEFAULT_SCALE_STEP, 0.12);
});

test("layerOffset fans deeper slots to the LEFT on a shared baseline", () => {
	assert.deepEqual(layerOffset(0), { x: 0, y: 0 });
	assert.deepEqual(layerOffset(1), { x: -DEFAULT_STAGGER_X, y: 0 });
	assert.deepEqual(layerOffset(2), { x: -DEFAULT_STAGGER_X * 2, y: 0 });
});

test("layerOffsetPercent spaces slots evenly from 0% to rear -20%", () => {
	const {
		layerOffsetPercent,
		DEFAULT_REAR_X_PERCENT,
	} = require("./stackedImageSlider");
	assert.equal(DEFAULT_REAR_X_PERCENT, -20);
	assert.deepEqual(layerOffsetPercent(0, -20, 3), { xPercent: 0, y: 0 });
	assert.ok(Math.abs(layerOffsetPercent(1, -20, 3).xPercent - -20 / 3) < 1e-9);
	assert.ok(Math.abs(layerOffsetPercent(2, -20, 3).xPercent - (-40 / 3)) < 1e-9);
	assert.deepEqual(layerOffsetPercent(3, -20, 3), { xPercent: -20, y: 0 });
});

test("stackLayout percent mode keeps front at 0% and rear at -20%", () => {
	const slots = stackLayout({
		queueLength: 4,
		stepProgress: 0,
		visibleCount: 4,
		rearXPercent: -20,
	});
	assert.equal(slots[0].xPercent, 0);
	assert.equal(slots[0].x, 0);
	assert.ok(Math.abs(slots[1].xPercent - -20 / 3) < 1e-9);
	assert.ok(Math.abs(slots[2].xPercent - (-40 / 3)) < 1e-9);
	assert.equal(slots[3].xPercent, -20);
});

test("stackLayout slotLeftPercent fans left while keeping depth scale", () => {
	const leftFor = (slot) => [24, 10, -5, -20][slot];
	const rest = stackLayout({
		queueLength: 5,
		stepProgress: 0,
		visibleCount: 4,
		slotLeftPercent: leftFor,
	});
	assert.equal(rest[0].left, 24);
	assert.equal(rest[0].scale, 1);
	assert.equal(rest[3].left, -20);
	assert.ok(rest[3].scale < rest[2].scale);

	const mid = stackLayout({
		queueLength: 5,
		stepProgress: 0.5,
		visibleCount: 4,
		slotLeftPercent: leftFor,
	});
	assert.ok(mid[0].scale > 1);
	assert.ok(mid[0].x > 0);
	assert.ok(mid[0].opacity < 1);
	assert.ok(Math.abs(mid[1].left - (10 + 24) / 2) < 1e-9);
});

test("layerOpacity falls off toward the back of the fan", () => {
	assert.equal(layerOpacity(0), 1);
	assert.equal(layerOpacity(3), DEFAULT_BACK_OPACITY);
	assert.ok(layerOpacity(1) > layerOpacity(2));
	assert.ok(layerOpacity(2) > layerOpacity(3));
});

test("stackLayout rests with front full and trail fading left", () => {
	const slots = stackLayout({ queueLength: 6, stepProgress: 0 });
	assert.equal(slots[0].scale, 1);
	assert.equal(slots[0].opacity, 1);
	assert.equal(slots[0].x, 0);
	assert.equal(slots[0].y, 0);
	assert.equal(slots[1].scale, 0.88);
	assert.equal(slots[1].x, -DEFAULT_STAGGER_X);
	assert.ok(slots[1].opacity < 1);
	assert.equal(slots[3].opacity, DEFAULT_BACK_OPACITY);
	assert.equal(slots[4].opacity, 0);
});

test("stackLayout mid-step fades front upward/right and promotes layers", () => {
	const slots = stackLayout({ queueLength: 6, stepProgress: 0.5 });
	assert.ok(slots[0].scale > 1);
	assert.ok(slots[0].opacity < 1);
	assert.ok(slots[0].x > 0);
	assert.ok(slots[0].y < 0);
	assert.ok(slots[1].scale > 0.88);
	assert.ok(slots[1].scale < 1);
	assert.ok(slots[4].opacity > 0);
});

test("stackLayout completes exit then advanceQueue recycles front", () => {
	const done = stackLayout({ queueLength: 5, stepProgress: 1 });
	assert.equal(done[0].opacity, 0);
	assert.ok(done[0].scale >= 1.08);

	assert.deepEqual(advanceQueue(["a", "b", "c", "d", "e"]), [
		"b",
		"c",
		"d",
		"e",
		"a",
	]);
	assert.deepEqual(rotateQueue(["a", "b", "c"], 2), ["c", "a", "b"]);
});
