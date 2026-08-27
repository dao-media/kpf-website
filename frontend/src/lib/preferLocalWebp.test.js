const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { preferLocalWebp } = require("./preferLocalWebp");

describe("preferLocalWebp", () => {
  it("rewrites the SFHF PNG and hero JPEGs onto existing public WebP files", () => {
    assert.equal(
      preferLocalWebp("/media/content/388-SFHF.png"),
      "/media/content/388-SFHF.webp",
    );
    assert.equal(
      preferLocalWebp("https://kpf.dreamhosters.com/wp-content/uploads/2026/08/388-SFHF-300x300.png"),
      "/media/content/388-SFHF.webp",
    );
    assert.equal(
      preferLocalWebp("/media/content/541-hero.jpg"),
      "/media/content/541-hero.webp",
    );
    assert.equal(
      preferLocalWebp("/media/home/hero.jpg"),
      "/media/home/hero.webp",
    );
  });

  it("leaves unrelated URLs alone", () => {
    assert.equal(
      preferLocalWebp("/media/events/hero.jpg"),
      "/media/events/hero.jpg",
    );
    assert.equal(
      preferLocalWebp("https://example.test/a.png"),
      "https://example.test/a.png",
    );
  });
});
