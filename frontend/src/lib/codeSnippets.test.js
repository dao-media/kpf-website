/**
 * Pure helpers for CMS code snippet path matching.
 * Run with: node --test src/lib/codeSnippets.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  filterSnippetsForPath,
  normalizePath,
  pathFromAsPath,
  pathMatches,
  snippetApplies,
} = require("./codeSnippets.js");

describe("normalizePath", () => {
  it("normalizes empty and absolute URLs", () => {
    assert.equal(normalizePath(""), "/");
    assert.equal(normalizePath("https://example.com/about/"), "/about");
    assert.equal(normalizePath("blog"), "/blog");
  });
});

describe("pathFromAsPath", () => {
  it("strips query and hash", () => {
    assert.equal(pathFromAsPath("/about?x=1#top"), "/about");
  });
});

describe("pathMatches", () => {
  it("matches exact and wildcard prefixes", () => {
    assert.equal(pathMatches("/about", ["/about"]), true);
    assert.equal(pathMatches("/blog/post", ["/blog/*"]), true);
    assert.equal(pathMatches("/events", ["/blog/*"]), false);
    assert.equal(pathMatches("/anything", ["/*"]), true);
  });
});

describe("snippetApplies", () => {
  it("applies global snippets and URL-scoped ones", () => {
    assert.equal(
      snippetApplies(
        { scope: "global", code: "alert(1)", urls: [] },
        "/about"
      ),
      true
    );
    assert.equal(
      snippetApplies(
        { scope: "urls", code: "x", urls: ["/donate"] },
        "/about"
      ),
      false
    );
    assert.equal(
      snippetApplies(
        { scope: "urls", code: "x", urls: ["/donate"] },
        "/donate"
      ),
      true
    );
    assert.equal(
      snippetApplies({ scope: "global", code: "   ", urls: [] }, "/"),
      false
    );
  });
});

describe("filterSnippetsForPath", () => {
  it("returns only applicable snippets", () => {
    const snippets = [
      { databaseId: 1, scope: "global", code: ".a{}" },
      { databaseId: 2, scope: "urls", code: ".b{}", urls: ["/team"] },
    ];
    assert.deepEqual(
      filterSnippetsForPath(snippets, "/team").map((s) => s.databaseId),
      [1, 2]
    );
    assert.deepEqual(
      filterSnippetsForPath(snippets, "/home").map((s) => s.databaseId),
      [1]
    );
  });
});
