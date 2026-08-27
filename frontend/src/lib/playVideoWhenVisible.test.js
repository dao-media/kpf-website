const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { playVideoWhenVisible } = require("./playVideoWhenVisible");

describe("playVideoWhenVisible", () => {
  it("noops without a video", () => {
    assert.equal(typeof playVideoWhenVisible(null), "function");
    playVideoWhenVisible(null)();
  });

  it("plays immediately when IntersectionObserver is missing", () => {
    const originalIO = globalThis.IntersectionObserver;
    const originalMatch = globalThis.matchMedia;
    delete globalThis.IntersectionObserver;
    globalThis.matchMedia = () => ({ matches: false });
    let played = 0;
    const video = {
      preload: "none",
      play: () => {
        played += 1;
        return Promise.resolve();
      },
      pause() {},
    };
    const stop = playVideoWhenVisible(video);
    assert.equal(played, 1);
    assert.equal(video.preload, "metadata");
    stop();
    if (originalIO) globalThis.IntersectionObserver = originalIO;
    else delete globalThis.IntersectionObserver;
    if (originalMatch) globalThis.matchMedia = originalMatch;
    else delete globalThis.matchMedia;
  });
});
