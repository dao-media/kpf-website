const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

describe("wp-templates index", () => {
  it("static-imports primary pages; only generic page/single stay dynamic", () => {
    const src = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
    assert.match(src, /next\/dynamic/);
    assert.match(src, /function bindTemplate/);
    assert.match(src, /Template\.query/);
    assert.match(src, /GET_POST/);
    assert.match(src, /pageVariables/);
    assert.match(src, /import FrontPageTemplate from/);
    assert.match(src, /import AboutPageTemplate from/);
    assert.match(src, /import EventsPageTemplate from/);
    assert.match(src, /import BlogPageTemplate from/);
    assert.match(src, /import PrivacyPageTemplate from/);
    assert.match(src, /kpf-page-loading/);
    assert.doesNotMatch(src, /import\("\.\/front-page"\)/);
    assert.doesNotMatch(src, /import\("\.\/page-about"\)/);
    assert.doesNotMatch(src, /import\("\.\/page-events"\)/);
    assert.doesNotMatch(src, /import\("\.\/page-blog"\)/);
    assert.doesNotMatch(src, /import\("\.\/page-privacy"\)/);
    assert.doesNotMatch(src, /import\("\.\/page-contact"\)/);
    assert.match(src, /import\("\.\/single"\)/);
    assert.match(src, /import\("\.\/page"\)/);
    assert.match(
      src,
      /hydrates as empty <main>/,
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
    assert.match(src, /import PartnersSlider from "@\/components\/PartnersSlider"/);
  });
});

describe("chrome first paint", () => {
  it("reserves a viewport floor on main so the footer cannot flash", () => {
    const css = fs.readFileSync(
      path.join(__dirname, "../styles/pages.css"),
      "utf8",
    );
    assert.match(css, /\.kpf-site-chrome__main,\s*\n\.kpf-page-loading \{/);
    assert.match(css, /min-height: 100svh;/);
  });
});
