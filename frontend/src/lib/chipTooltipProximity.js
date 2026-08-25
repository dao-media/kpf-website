/**
 * Cursor-tip exit progress from an inner inset (0 = rest, 1 = at/over the edge).
 */

const EDGE_BUFFER_MAX = 22;
const EDGE_BUFFER_MIN = 8;
const EDGE_BUFFER_FRACTION = 0.42;
const SCALE_REST = 1;
const SCALE_EXIT = 0.92;
const ALPHA_REST = 1;
const ALPHA_EDGE = 0.55;

function clamp01(value) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function smoothstep(t) {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Cap the buffer so compact chips still have a rest core.
 * @param {{ width: number, height: number }} rect
 * @param {number} [max]
 * @param {number} [fraction]
 */
function edgeBufferForRect(
  rect,
  max = EDGE_BUFFER_MAX,
  fraction = EDGE_BUFFER_FRACTION,
) {
  const shortest = Math.min(Number(rect?.width) || 0, Number(rect?.height) || 0);
  if (!(shortest > 0)) return EDGE_BUFFER_MIN;
  return Math.max(EDGE_BUFFER_MIN, Math.min(max, shortest * fraction));
}

function poseFromProgress(progress) {
  const t = clamp01(progress);
  return {
    scale: lerp(SCALE_REST, SCALE_EXIT, t),
    autoAlpha: lerp(ALPHA_REST, ALPHA_EDGE, t),
  };
}

/**
 * @param {number} clientX
 * @param {number} clientY
 * @param {{ left: number, right: number, top: number, bottom: number }} rect
 * @param {number} buffer
 */
function edgeExitProgress(clientX, clientY, rect, buffer) {
  const minInset = Math.min(
    clientX - rect.left,
    rect.right - clientX,
    clientY - rect.top,
    rect.bottom - clientY,
  );
  if (!(buffer > 0)) return minInset <= 0 ? 1 : 0;
  return smoothstep(1 - minInset / buffer);
}

module.exports = {
  ALPHA_EDGE,
  SCALE_EXIT,
  clamp01,
  edgeBufferForRect,
  edgeExitProgress,
  lerp,
  poseFromProgress,
  smoothstep,
};
