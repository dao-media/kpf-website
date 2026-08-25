const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  isSameDocumentHash,
  normalizePathname,
  resolveScrollElement,
  sameDocumentHash,
} = require("./smoothScrollTo");

describe("smoothScrollTo helpers", () => {
  it("detects same-document hashes", () => {
    assert.equal(isSameDocumentHash("#comments"), true);
    assert.equal(isSameDocumentHash("#"), false);
    assert.equal(isSameDocumentHash("/blog"), false);
    assert.equal(isSameDocumentHash(""), false);
  });

  it("treats /#programs as in-page on the homepage", () => {
    assert.equal(sameDocumentHash("/#programs", "/"), "#programs");
    assert.equal(sameDocumentHash("/#programs", "/?utm=1"), "#programs");
    assert.equal(isSameDocumentHash("/#programs", "/"), true);
  });

  it("does not treat a different page hash as in-page", () => {
    assert.equal(sameDocumentHash("/about/#grantees", "/"), null);
    assert.equal(sameDocumentHash("/about/#grantees", "/about/"), "#grantees");
    assert.equal(isSameDocumentHash("/about/#grantees", "/"), false);
  });

  it("normalizes trailing slashes on pathnames", () => {
    assert.equal(normalizePathname("/about/"), "/about");
    assert.equal(normalizePathname("/"), "/");
  });

  it("returns null for empty targets without a DOM id lookup crash", () => {
    assert.equal(resolveScrollElement(null), null);
    assert.equal(resolveScrollElement("#"), null);
  });
});
