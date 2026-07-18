const assert = require("node:assert/strict");
const test = require("node:test");
const {
  documentFromNode,
  isIndexable,
  stripHtml,
} = require("./searchDocuments");

function publicNode(overrides = {}) {
  return {
    databaseId: 42,
    title: "Foundation &amp; Community",
    content: "<p>A story about <strong>Kevin</strong>.</p>",
    excerpt: "",
    uri: "/foundation/",
    date: "2026-07-18T00:00:00",
    modified: "2026-07-18T01:00:00",
    kpfSeo: {
      robots: { index: true },
      showInSitemap: true,
    },
    ...overrides,
  };
}

test("stripHtml removes executable markup and decodes entities", () => {
  assert.equal(
    stripHtml(
      '<style>.hidden{display:none}</style><p>One&nbsp;&amp; two</p><script>alert("x")</script>'
    ),
    "One & two"
  );
  assert.equal(stripHtml(null), "");
});

test("isIndexable requires SEO approval and a local public URI", () => {
  assert.equal(isIndexable(publicNode()), true);
  assert.equal(
    isIndexable(publicNode({ kpfSeo: { robots: { index: false }, showInSitemap: false } })),
    false
  );
  assert.equal(isIndexable(publicNode({ uri: null })), false);
  assert.equal(isIndexable(publicNode({ uri: "https://example.com/page" })), false);
});

test("documentFromNode creates safe searchable page metadata", () => {
  const document = documentFromNode(publicNode(), "page");

  assert.deepEqual(
    {
      id: document.id,
      title: document.title,
      excerpt: document.excerpt,
      url: document.url,
      typeLabel: document.typeLabel,
    },
    {
      id: "page:42",
      title: "Foundation & Community",
      excerpt: "A story about Kevin.",
      url: "/foundation/",
      typeLabel: "Page",
    }
  );
});

test("documentFromNode includes blog topics in search terms", () => {
  const document = documentFromNode(
    publicNode({
      categories: { nodes: [{ name: "Community" }] },
      tags: { nodes: [{ name: "Scholarships" }] },
    }),
    "post"
  );

  assert.equal(document.terms, "Community Scholarships");
  assert.equal(document.typeLabel, "Blog");
});
