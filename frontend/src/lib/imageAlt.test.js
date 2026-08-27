const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  ensureDomImageAlts,
  ensureImgAltAttributes,
} = require("./imageAlt");

describe("imageAlt", () => {
  it("adds alt=\"\" to img tags that omit the attribute", () => {
    assert.equal(
      ensureImgAltAttributes('<p><img src="/a.jpg"></p>'),
      '<p><img src="/a.jpg" alt=""></p>',
    );
    assert.equal(
      ensureImgAltAttributes('<img class="hero" src="/a.jpg" />'),
      '<img class="hero" src="/a.jpg" alt="" />',
    );
  });

  it("leaves existing alt attributes alone", () => {
    assert.equal(
      ensureImgAltAttributes('<img src="/a.jpg" alt="Kevin">'),
      '<img src="/a.jpg" alt="Kevin">',
    );
    assert.equal(
      ensureImgAltAttributes("<img src='/a.jpg' alt=''>"),
      "<img src='/a.jpg' alt=''>",
    );
  });

  it("stamps missing alt on live DOM nodes", () => {
    const img = { hasAttribute: (name) => name !== "alt", setAttribute() {} };
    const calls = [];
    img.setAttribute = (name, value) => calls.push([name, value]);
    ensureDomImageAlts({
      querySelectorAll: () => [img],
    });
    assert.deepEqual(calls, [["alt", ""]]);
  });
});
