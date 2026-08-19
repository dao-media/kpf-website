const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  blogCardDescription,
  blogTopicFilters,
  normalizeBlogPost,
  normalizeBlogPosts,
  truncateWords,
} = require("./blogPosts");

describe("blogPosts", () => {
  it("prefers kpfSeo description over excerpt", () => {
    const posts = normalizeBlogPosts(
      {
        nodes: [
          {
            databaseId: 9,
            title: "Honoring a Legacy",
            uri: "/veteran-legacy/",
            date: "2026-07-19T22:26:06",
            excerpt: "<p>A long excerpt that should not win.</p>",
            content: "<p>" + "word ".repeat(200) + "</p>",
            kpfSeo: {
              description: "SEO description for the card.",
            },
            featuredImage: {
              node: { sourceUrl: "https://example.test/a.jpg", altText: "Alt" },
            },
            categories: { nodes: [{ name: "Announcements", slug: "announce" }] },
          },
        ],
      },
      { rowCta: "Read story" },
    );

    assert.equal(posts.length, 1);
    assert.equal(posts[0].description, "SEO description for the card.");
    assert.equal(posts[0].categorySlug, "announce");
  });

  it("falls back to excerpt capped at 40 words", () => {
    const words = Array.from({ length: 50 }, (_, i) => `w${i + 1}`).join(" ");
    const description = blogCardDescription({
      excerpt: `<p>${words}</p>`,
      kpfSeo: { description: "" },
    });
    assert.equal(description.split(/\s+/).length, 40);
    assert.match(description, /…$/);
    assert.equal(truncateWords("one two three", 10), "one two three");
  });

  it("builds All + unique topic filters", () => {
    const filters = blogTopicFilters([
      { category: "Grants", categorySlug: "grants" },
      { category: "Events", categorySlug: "events" },
      { category: "Grants", categorySlug: "grants" },
    ]);
    assert.deepEqual(filters, [
      { slug: "all", label: "All" },
      { slug: "grants", label: "Grants" },
      { slug: "events", label: "Events" },
    ]);
  });

  it("returns null for incomplete nodes", () => {
    assert.equal(normalizeBlogPost({ title: "No uri" }), null);
  });
});
