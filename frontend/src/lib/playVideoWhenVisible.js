/**
 * Footer cigar smoke and the closing-flag band are huge mp4s. Do not
 * `preload=auto` / autoplay them on first paint — they steal the LCP
 * window (smoke.mp4 is ~787 KiB). Play once the element is near view.
 *
 * @param {HTMLVideoElement | null | undefined} video
 * @param {{ rootMargin?: string }} [opts]
 * @returns {() => void}
 */
function playVideoWhenVisible(video, { rootMargin = "240px" } = {}) {
  if (!video) return function noop() {};

  const win = typeof globalThis !== "undefined" ? globalThis : null;
  if (!win) return function noop() {};

  if (
    typeof win.matchMedia === "function" &&
    win.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    video.pause();
    return function noop() {};
  }

  function play() {
    video.preload = "metadata";
    const playing = video.play();
    if (playing && typeof playing.catch === "function") {
      playing.catch(() => {});
    }
  }

  if (typeof win.IntersectionObserver !== "function") {
    play();
    return function noop() {};
  }

  const io = new win.IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      play();
      io.disconnect();
    },
    { rootMargin },
  );
  io.observe(video);
  return () => io.disconnect();
}

module.exports = { playVideoWhenVisible };
