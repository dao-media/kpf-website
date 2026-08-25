const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  blogAuthorLabel,
  buildTocTree,
  normalizeBlogPostPage,
  prepareArticleHtml,
} = require("./blogPost");

describe("blogPost", () => {
  it("injects heading ids and builds a toc", () => {
    const { html, toc } = prepareArticleHtml(
      "<h2>What We Do</h2><p>Body</p><h3>Details</h3>",
    );
    assert.match(html, /id="what-we-do"/);
    assert.match(html, /id="details"/);
    assert.equal(toc.length, 2);
    assert.equal(toc[0].text, "What We Do");
    assert.equal(toc[1].level, 3);
  });

  it("nests h3 items under the preceding h2", () => {
    const { toc } = prepareArticleHtml(
      "<h2>Where the money goes</h2><h3>What you can do</h3><h3>How to help</h3><h2>Our upcoming events</h2>",
    );
    const tree = buildTocTree(toc);
    assert.equal(tree.length, 2);
    assert.equal(tree[0].text, "Where the money goes");
    assert.equal(tree[0].children.length, 2);
    assert.equal(tree[0].children[0].text, "What you can do");
    assert.equal(tree[0].children[1].text, "How to help");
    assert.equal(tree[1].text, "Our upcoming events");
    assert.equal(tree[1].children.length, 0);
  });

  it("keeps orphan h3s reachable at the root", () => {
    const tree = buildTocTree([
      { id: "alone", text: "Alone", level: 3 },
      { id: "parent", text: "Parent", level: 2 },
      { id: "child", text: "Child", level: 3 },
    ]);
    assert.equal(tree.length, 2);
    assert.equal(tree[0].id, "alone");
    assert.equal(tree[1].children[0].id, "child");
  });

  it("wraps known grantee names in links", () => {
    const { html } = prepareArticleHtml(
      "<h2>Grants</h2><p>A grant to My Warrior's Place funded the retreat.</p>",
    );
    assert.match(html, /href="https:\/\/mywarriorsplace.org"/);
    assert.match(html, />My Warrior's Place</);
  });

  it("does not nest links inside existing anchors", () => {
    const { html } = prepareArticleHtml(
      '<p><a href="https://example.test">My Warrior\'s Place</a></p>',
    );
    assert.equal(
      (html.match(/<a /g) || []).length,
      1,
    );
  });

  it("maps admin author to the KPF team", () => {
    assert.equal(blogAuthorLabel("admin"), "the KPF team");
    assert.equal(blogAuthorLabel("Maria R."), "Maria R.");
  });

  it("normalizes a GraphQL post", () => {
    const page = normalizeBlogPostPage({
      databaseId: 12,
      title: "A Story",
      uri: "/a-story/",
      date: "2026-07-19T22:26:06",
      content: "<h2>One</h2><p>word ".repeat(200) + "</p>",
      author: { node: { name: "admin" } },
      categories: { nodes: [{ name: "Events", slug: "events" }] },
      commentStatus: "open",
      comments: { nodes: [] },
      featuredImage: {
        node: { sourceUrl: "https://example.test/x.jpg", altText: "Alt" },
      },
    });
    assert.equal(page.title, "A Story");
    assert.equal(page.author, "the KPF team");
    assert.equal(page.toc[0].id, "one");
    assert.equal(page.media.src, "https://example.test/x.jpg");
  });
});
