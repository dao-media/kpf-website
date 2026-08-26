const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { KPF_ISR_SECONDS, KPF_PRERENDER_SLUGS, wordpressNodeStaticPaths } = require("./isr");

describe("isr", () => {
  it("prerenders inner marketing slugs and keeps a long revalidate window", () => {
    assert.equal(KPF_ISR_SECONDS, 3600);
    const { paths, fallback } = wordpressNodeStaticPaths();
    assert.equal(fallback, "blocking");
    const slugs = paths.map((p) => p.params.wordpressNode.join("/"));
    for (const slug of KPF_PRERENDER_SLUGS) {
      assert.ok(slugs.includes(slug), `missing prerender path ${slug}`);
    }
  });
});
