const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { honorClickedTocId, pickTocActiveId, tocIdFromHref } = require("./useTocActiveId");

describe("pickTocActiveId", () => {
  const headings = [
    { id: "a", top: -100 },
    { id: "b", top: 40 },
    { id: "c", top: 400 },
  ];

  it("picks the last heading at or above the spy line", () => {
    assert.equal(pickTocActiveId(headings, 80), "b");
  });

  it("keeps the first section before any heading reaches the line", () => {
    assert.equal(
      pickTocActiveId(
        [
          { id: "a", top: 200 },
          { id: "b", top: 500 },
        ],
        80,
      ),
      "a",
    );
  });

  it("returns empty for no headings", () => {
    assert.equal(pickTocActiveId([], 80), "");
  });
});

describe("honorClickedTocId", () => {
  it("keeps the clicked id until the spy catches up", () => {
    assert.equal(honorClickedTocId("c", "a"), "c");
  });

  it("falls back to the spy when nothing was clicked", () => {
    assert.equal(honorClickedTocId("", "b"), "b");
  });
});

describe("tocIdFromHref", () => {
  it("reads a hash href", () => {
    assert.equal(tocIdFromHref("#together-we-can"), "together-we-can");
  });
});
