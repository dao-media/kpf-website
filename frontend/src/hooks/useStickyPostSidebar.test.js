const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("useStickyPostSidebar", () => {
  it("pins blog and privacy sidebars at desktop only", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "useStickyPostSidebar.js"),
      "utf8",
    );
    assert.match(src, /\(min-width: 64rem\)/);
    assert.match(src, /pageKind = "post"/);
    assert.match(src, /\.kpf-page--\$\{pageKind\}/);
  });
});

describe("PrivacyPageScaffold", () => {
  it("uses the sticky sidebar hook like blog posts", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../components/PrivacyPageScaffold.js"),
      "utf8",
    );
    assert.match(src, /useStickyPostSidebar\(/);
    assert.match(src, /"privacy"/);
  });
});
