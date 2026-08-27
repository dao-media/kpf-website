const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

describe("accordion heading order", () => {
  it("Home donation accordions are h4 after the section h3", () => {
    const src = read("src/components/HomePageScaffold.js");
    assert.match(src, /<h3 className="kpf-h4">/);
    assert.match(src, /<h4 className="kpf-accordion__title">/);
    assert.doesNotMatch(src, /<h5 className="kpf-accordion__title">/);
  });

  it("About mission accordions are h3 after the section h2", () => {
    const src = read("src/components/AboutPageScaffold.js");
    assert.match(src, /id="kpf-about-mission-title"/);
    assert.match(src, /<h3 className="kpf-accordion__title">/);
    assert.doesNotMatch(src, /<h5 className="kpf-accordion__title">/);
  });

  it("Events partner accordions are h3 after the section h2", () => {
    const src = read("src/components/EventsPageScaffold.js");
    assert.match(src, /id="kpf-events-context-title"/);
    assert.match(src, /<h3 className="kpf-accordion__title">/);
    assert.doesNotMatch(src, /<h5 className="kpf-accordion__title">/);
  });
});
