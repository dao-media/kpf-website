const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { pickTocActiveId } = require("./useTocActiveId");

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
