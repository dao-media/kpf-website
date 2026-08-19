const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  isSameDocumentHash,
  resolveScrollElement,
} = require("./smoothScrollTo");

describe("smoothScrollTo helpers", () => {
  it("detects same-document hashes", () => {
    assert.equal(isSameDocumentHash("#comments"), true);
    assert.equal(isSameDocumentHash("#"), false);
    assert.equal(isSameDocumentHash("/blog"), false);
    assert.equal(isSameDocumentHash(""), false);
  });

  it("returns null for empty targets without a DOM id lookup crash", () => {
    assert.equal(resolveScrollElement(null), null);
    assert.equal(resolveScrollElement("#"), null);
  });
});
