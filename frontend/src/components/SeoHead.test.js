/**
 * Lightweight behavioral checks for SeoHead helpers.
 * Run with: node --test src/components/SeoHead.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

function robotsContent(robots = {}) {
  const parts = [
    robots.index === false ? "noindex" : "index",
    robots.follow === false ? "nofollow" : "follow",
  ];
  if (robots.noarchive) parts.push("noarchive");
  if (robots.nosnippet) parts.push("nosnippet");
  return parts.join(", ");
}

describe("robotsContent", () => {
  it("defaults to index, follow", () => {
    assert.equal(robotsContent({}), "index, follow");
  });

  it("supports noindex/nofollow and extras", () => {
    assert.equal(
      robotsContent({
        index: false,
        follow: false,
        noarchive: true,
        nosnippet: true,
      }),
      "noindex, nofollow, noarchive, nosnippet"
    );
  });
});
