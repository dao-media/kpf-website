const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("wp-templates index", () => {
  it("code-splits Faust templates without exposing next/dynamic to Faust SSR", () => {
    const src = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    assert.match(src, /next\/dynamic/);
    assert.match(src, /function bindTemplate/);
    assert.match(src, /Template\.query/);
    assert.match(src, /GET_HOME_PAGE/);
    assert.match(src, /GET_POST/);
    assert.match(src, /pageVariables/);
    assert.doesNotMatch(src, /import FrontPageTemplate from/);
    assert.doesNotMatch(src, /import SingleTemplate from/);
    assert.match(
      src,
      /Faust treats next\/dynamic templates as client-only/,
    );
  });
});

describe("homepage payload", () => {
  it("does not named-import lucide-react on the home scaffold", () => {
    const src = fs.readFileSync(
      path.join(__dirname, "../components/HomePageScaffold.js"),
      "utf8",
    );
    assert.doesNotMatch(src, /lucide-react/);
    assert.match(src, /dynamic\(\(\) => import\("@\/components\/PartnersSlider"\)\)/);
  });
});
