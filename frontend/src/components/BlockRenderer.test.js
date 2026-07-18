const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildBlockTree,
  containerClassName,
  safeUrl,
} = require("./blockData");

test("buildBlockTree restores nested Gutenberg block order", () => {
  const tree = buildBlockTree([
    {
      clientId: "container",
      parentClientId: null,
      name: "kpf/container",
    },
    {
      clientId: "paragraph",
      parentClientId: "container",
      name: "core/paragraph",
    },
    {
      clientId: "button",
      parentClientId: "container",
      name: "kpf/button",
    },
    {
      clientId: "quote",
      parentClientId: null,
      name: "core/quote",
    },
  ]);

  assert.equal(tree.length, 2);
  assert.equal(tree[0].name, "kpf/container");
  assert.deepEqual(
    tree[0].innerBlocks.map((block) => block.name),
    ["core/paragraph", "kpf/button"],
  );
  assert.equal(tree[1].name, "core/quote");
});

test("safeUrl allows site links and rejects executable protocols", () => {
  assert.equal(safeUrl("/donate"), "/donate");
  assert.equal(safeUrl("https://example.com/story"), "https://example.com/story");
  assert.equal(safeUrl("mailto:hello@example.com"), "mailto:hello@example.com");
  assert.equal(safeUrl("javascript:alert(1)"), undefined);
  assert.equal(safeUrl("data:text/html,bad"), undefined);
});

test("containerClassName mirrors the Gutenberg save markup", () => {
  assert.equal(
    containerClassName({
      theme: "paper",
      padding: "large",
      contentWidth: "wide-inner",
    }),
    "kpf-container kpf-container--paper kpf-container--pad-large kpf-container--wide-inner",
  );
});
