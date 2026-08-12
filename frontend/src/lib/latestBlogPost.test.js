const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  estimateReadTime,
  formatPostDate,
  normalizeLatestBlogPost,
} = require("./latestBlogPost");

describe("latestBlogPost", () => {
  it("formats dates and read time", () => {
    assert.equal(formatPostDate("2026-07-19T22:26:06"), "July 19, 2026");
    assert.equal(estimateReadTime("<p>" + "word ".repeat(400) + "</p>"), "2 min read");
    assert.equal(estimateReadTime(""), "1 min read");
  });

  it("normalizes a posts connection into card props", () => {
    const card = normalizeLatestBlogPost(
      {
        nodes: [
          {
            title: "Honoring a Legacy",
            uri: "/veteran-legacy/",
            date: "2026-07-19T22:26:06",
            content: "<p>" + "word ".repeat(200) + "</p>",
            featuredImage: {
              node: { sourceUrl: "https://example.test/a.jpg", altText: "Alt" },
            },
            categories: { nodes: [{ name: "Announcements" }] },
          },
        ],
      },
      { cta: "Read the story" },
    );

    assert.deepEqual(card, {
      href: "/veteran-legacy/",
      category: "Announcements",
      date: "July 19, 2026",
      readTime: "1 min read",
      title: "Honoring a Legacy",
      cta: "Read the story",
      media: { src: "https://example.test/a.jpg", alt: "Alt" },
    });
  });

  it("falls back when no post exists", () => {
    const fallback = {
      href: "/blog/",
      category: "Events",
      date: "July 18, 2026",
      readTime: "6 min read",
      title: "Placeholder",
      cta: "Read the story",
      media: { src: "/media/x.jpg", alt: "" },
    };
    assert.deepEqual(normalizeLatestBlogPost({ nodes: [] }, fallback), fallback);
    assert.equal(normalizeLatestBlogPost(null), null);
  });
});
