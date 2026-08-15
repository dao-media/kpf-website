/**
 * Motion model for the About history stacked image slider.
 *
 * Reference fan (right → left trail):
 * - Bottom-aligned (shared baseline; transform-origin bottom center)
 * - Front = largest + full opacity, on the right
 * - Each layer behind: ×(1 - scaleStep), shifted left, lower opacity
 * - Scroll: front fades + continues up/right, then recycles to the left back
 */

const DEFAULT_VISIBLE_COUNT = 4;
const DEFAULT_SCALE_STEP = 0.12;
const DEFAULT_EXIT_SCALE = 1.08;
/** Horizontal step (px) each deeper slot shifts LEFT of the front. */
const DEFAULT_STAGGER_X = 72;
/** Keep y at 0 — bottom edges share a baseline; scale alone creates the height fan. */
const DEFAULT_STAGGER_Y = 0;
/** Opacity of the deepest visible card (front is always 1). */
const DEFAULT_BACK_OPACITY = 0.28;
/** Extra travel while the front exits (px). */
const DEFAULT_EXIT_X = 40;
const DEFAULT_EXIT_Y = 64;
/**
 * When using percent fan: deepest visible slot left offset (of card width).
 * Front stays at 0%; middle slots are evenly spaced toward this rear.
 */
const DEFAULT_REAR_X_PERCENT = -20;

function clamp01(value) {
	if (Number.isNaN(value)) return 0;
	if (value < 0) return 0;
	if (value > 1) return 1;
	return value;
}

function lerp(a, b, t) {
	return a + (b - a) * clamp01(t);
}

function layerScale(slot, scaleStep = DEFAULT_SCALE_STEP) {
	const step = clamp01(Number(scaleStep) || 0);
	const factor = 1 - step;
	const index = Math.max(0, Number(slot) || 0);
	return factor ** index;
}

/**
 * Slot 0 (front) at origin. Deeper slots step LEFT (−x).
 * y stays 0 so bottoms share a baseline under bottom transform-origin.
 */
function layerOffset(
	slot,
	staggerX = DEFAULT_STAGGER_X,
	staggerY = DEFAULT_STAGGER_Y,
) {
	const index = Math.max(0, Number(slot) || 0);
	const xStep = Number(staggerX) || 0;
	const yStep = Number(staggerY) || 0;
	return {
		// Avoid -0 from multiplying by a zero stagger (breaks deepStrictEqual).
		x: index === 0 || xStep === 0 ? 0 : -index * xStep,
		y: index === 0 || yStep === 0 ? 0 : -index * yStep,
	};
}

/**
 * Percentage fan: front at 0%, rear at rearXPercent (e.g. -20),
 * intermediate slots evenly spaced between them.
 */
function layerOffsetPercent(slot, rearXPercent = DEFAULT_REAR_X_PERCENT, deepSlots = 3) {
	const index = Math.max(0, Number(slot) || 0);
	const deep = Math.max(1, Math.floor(Number(deepSlots) || 1));
	const rear = Number(rearXPercent) || 0;
	return {
		xPercent: index === 0 || rear === 0 ? 0 : (rear * index) / deep,
		y: 0,
	};
}

/** Opacity falloff from front (1) to deepest visible (backOpacity). */
function layerOpacity(
	slot,
	visibleCount = DEFAULT_VISIBLE_COUNT,
	backOpacity = DEFAULT_BACK_OPACITY,
) {
	const deep = Math.max(1, Math.floor(Number(visibleCount) || 1) - 1);
	const index = Math.max(0, Number(slot) || 0);
	if (index <= 0) return 1;
	if (index >= deep) return clamp01(Number(backOpacity) || 0);
	const t = index / deep;
	return lerp(1, clamp01(Number(backOpacity) || 0), t);
}

function visibleScales(
	visibleCount = DEFAULT_VISIBLE_COUNT,
	scaleStep = DEFAULT_SCALE_STEP,
) {
	const count = Math.max(1, Math.floor(Number(visibleCount) || 1));
	return Array.from({ length: count }, (_, slot) => layerScale(slot, scaleStep));
}

/**
 * Layout for one scroll/step.
 * @param {number} stepProgress 0 at rest → 1 when front has fully exited
 * @param {((slotIndex: number) => number) | null} slotLeftPercent
 *   When set, horizontal fan uses CSS `left` % (of the positioning container)
 *   instead of GSAP x / xPercent. Front exit still uses px `x` for the rightward drift.
 */
function stackLayout({
	queueLength,
	stepProgress = 0,
	visibleCount = DEFAULT_VISIBLE_COUNT,
	scaleStep = DEFAULT_SCALE_STEP,
	exitScale = DEFAULT_EXIT_SCALE,
	staggerX = DEFAULT_STAGGER_X,
	staggerY = DEFAULT_STAGGER_Y,
	backOpacity = DEFAULT_BACK_OPACITY,
	exitX = DEFAULT_EXIT_X,
	exitY = DEFAULT_EXIT_Y,
	/** When set (including 0), horizontal fan uses % of card width instead of px. */
	rearXPercent = null,
	/** Custom left-% fan (e.g. stack-relative rear -20% / front right-aligned). */
	slotLeftPercent = null,
} = {}) {
	const total = Math.max(0, Math.floor(Number(queueLength) || 0));
	const visible = Math.max(1, Math.floor(Number(visibleCount) || 1));
	const p = clamp01(Number(stepProgress) || 0);
	const exit = Math.max(1, Number(exitScale) || DEFAULT_EXIT_SCALE);
	const leaveX = Number(exitX) || 0;
	const leaveY = Number(exitY) || 0;
	const useLeft = typeof slotLeftPercent === "function";
	const usePercent =
		!useLeft && rearXPercent != null && Number.isFinite(Number(rearXPercent));
	const rearPercent = usePercent ? Number(rearXPercent) : DEFAULT_REAR_X_PERCENT;
	const deepSlots = Math.max(1, visible - 1);

	if (total < 1) {
		return [];
	}

	function leftFor(slotIndex) {
		if (!useLeft) return null;
		const value = Number(slotLeftPercent(slotIndex));
		return Number.isFinite(value) ? value : 0;
	}

	function offsetFor(slotIndex) {
		if (useLeft) {
			return { x: 0, y: 0, xPercent: 0, left: leftFor(slotIndex) };
		}
		if (usePercent) {
			const at = layerOffsetPercent(slotIndex, rearPercent, deepSlots);
			return { x: 0, y: at.y, xPercent: at.xPercent, left: null };
		}
		const at = layerOffset(slotIndex, staggerX, staggerY);
		return { x: at.x, y: at.y, xPercent: 0, left: null };
	}

	const slots = [];

	for (let queueIndex = 0; queueIndex < total; queueIndex += 1) {
		if (queueIndex === 0) {
			const rest = offsetFor(0);
			slots.push({
				queueIndex,
				slot: 0,
				scale: lerp(1, exit, p),
				x: lerp(rest.x, rest.x + leaveX, p),
				y: lerp(rest.y, rest.y - leaveY, p),
				xPercent: rest.xPercent,
				left: rest.left,
				opacity: 1 - p,
				zIndex: visible + 2,
				visible: true,
				exiting: true,
			});
			continue;
		}

		if (queueIndex < visible) {
			const fromSlot = queueIndex;
			const toSlot = queueIndex - 1;
			const from = offsetFor(fromSlot);
			const to = offsetFor(toSlot);
			const slot = lerp(fromSlot, toSlot, p);
			slots.push({
				queueIndex,
				slot,
				scale: lerp(
					layerScale(fromSlot, scaleStep),
					layerScale(toSlot, scaleStep),
					p,
				),
				x: lerp(from.x, to.x, p),
				y: lerp(from.y, to.y, p),
				xPercent: lerp(from.xPercent, to.xPercent, p),
				left:
					from.left == null || to.left == null
						? null
						: lerp(from.left, to.left, p),
				opacity: lerp(
					layerOpacity(fromSlot, visible, backOpacity),
					layerOpacity(toSlot, visible, backOpacity),
					p,
				),
				zIndex: visible - toSlot,
				visible: true,
				exiting: false,
			});
			continue;
		}

		if (queueIndex === visible) {
			const deep = visible - 1;
			const at = offsetFor(deep);
			slots.push({
				queueIndex,
				slot: deep,
				scale: layerScale(deep, scaleStep),
				x: at.x,
				y: at.y,
				xPercent: at.xPercent,
				left: at.left,
				opacity: p * layerOpacity(deep, visible, backOpacity),
				zIndex: 1,
				visible: p > 0.001,
				exiting: false,
			});
			continue;
		}

		const waiting = offsetFor(visible);
		slots.push({
			queueIndex,
			slot: visible,
			scale: layerScale(visible, scaleStep),
			x: waiting.x,
			y: waiting.y,
			xPercent: waiting.xPercent,
			left: waiting.left,
			opacity: 0,
			zIndex: 0,
			visible: false,
			exiting: false,
		});
	}

	return slots;
}

function advanceQueue(queue) {
	if (!Array.isArray(queue) || queue.length < 2) {
		return Array.isArray(queue) ? [...queue] : [];
	}
	const [front, ...rest] = queue;
	return [...rest, front];
}

function rotateQueue(baseQueue, steps) {
	const base = Array.isArray(baseQueue) ? [...baseQueue] : [];
	if (base.length < 2) return base;
	const n = ((Math.floor(steps) % base.length) + base.length) % base.length;
	if (n === 0) return base;
	return [...base.slice(n), ...base.slice(0, n)];
}

module.exports = {
	DEFAULT_VISIBLE_COUNT,
	DEFAULT_SCALE_STEP,
	DEFAULT_EXIT_SCALE,
	DEFAULT_STAGGER_X,
	DEFAULT_STAGGER_Y,
	DEFAULT_BACK_OPACITY,
	DEFAULT_EXIT_X,
	DEFAULT_EXIT_Y,
	DEFAULT_REAR_X_PERCENT,
	clamp01,
	lerp,
	layerScale,
	layerOffset,
	layerOffsetPercent,
	layerOpacity,
	visibleScales,
	stackLayout,
	advanceQueue,
	rotateQueue,
};
