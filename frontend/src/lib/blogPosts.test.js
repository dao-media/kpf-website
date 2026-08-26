const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  blogCardDescription,
  blogFilterBar,
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

  it("hides the filter bar until there is more than one post", () => {
    const empty = blogFilterBar([]);
    assert.equal(empty.visible, false);
    assert.equal(empty.interactive, false);
    assert.deepEqual(empty.items, []);

    const one = blogFilterBar([
      { category: "Grants", categorySlug: "grants" },
    ]);
    assert.equal(one.visible, false);
    assert.deepEqual(one.items, []);
  });

  it("shows inert All when two posts share one category", () => {
    const single = blogFilterBar([
      { category: "Grants", categorySlug: "grants" },
      { category: "Grants", categorySlug: "grants" },
    ]);
    assert.equal(single.visible, true);
    assert.equal(single.interactive, false);
    assert.deepEqual(single.items, [{ slug: "all", label: "All" }]);
  });

  it("shows All plus categories once more than one topic is in use", () => {
    const multi = blogFilterBar([
      { category: "Grants", categorySlug: "grants" },
      { category: "Events", categorySlug: "events" },
    ]);
    assert.equal(multi.visible, true);
    assert.equal(multi.interactive, true);
    assert.deepEqual(multi.items, [
      { slug: "all", label: "All" },
      { slug: "grants", label: "Grants" },
      { slug: "events", label: "Events" },
    ]);
  });

  it("returns null for incomplete nodes", () => {
    assert.equal(normalizeBlogPost({ title: "No uri" }), null);
  });

  it("omits WordPress’s default Hello world post", () => {
    const posts = normalizeBlogPosts({
      nodes: [
        {
          title: "Hello world!",
          slug: "hello-world",
          uri: "/hello-world/",
          date: "2026-08-24T12:00:00",
          content: "<p>Welcome.</p>",
        },
        {
          title: "Honoring a Legacy",
          slug: "veteran-legacy",
          uri: "/veteran-legacy/",
          date: "2026-07-19T22:26:06",
          content: "<p>Story.</p>",
        },
      ],
    });
    assert.equal(posts.length, 1);
    assert.equal(posts[0].title, "Honoring a Legacy");
  });
});
