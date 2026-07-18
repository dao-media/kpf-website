function buildBlockTree(blocks) {
  if (!Array.isArray(blocks) || blocks.length === 0) {
    return [];
  }

  const nodes = blocks
    .filter((block) => block && typeof block === "object")
    .map((block) => ({ ...block, innerBlocks: [] }));
  const byClientId = new Map(
    nodes
      .filter((block) => block.clientId)
      .map((block) => [block.clientId, block]),
  );
  const roots = [];

  nodes.forEach((block) => {
    const parent = block.parentClientId
      ? byClientId.get(block.parentClientId)
      : null;

    if (parent) {
      parent.innerBlocks.push(block);
    } else {
      roots.push(block);
    }
  });

  return roots;
}

function safeUrl(value, { allowHash = true } = {}) {
  const url = String(value || "").trim();
  if (!url) {
    return undefined;
  }

  if (
    url.startsWith("/") ||
    url.startsWith("./") ||
    url.startsWith("../") ||
    (allowHash && url.startsWith("#"))
  ) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)) {
      return url;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function containerClassName(attributes = {}) {
  const {
    theme = "none",
    padding = "medium",
    contentWidth = "default",
  } = attributes;

  return [
    "kpf-container",
    theme !== "none" ? `kpf-container--${theme}` : "",
    `kpf-container--pad-${padding}`,
    contentWidth !== "default" ? `kpf-container--${contentWidth}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

module.exports = {
  buildBlockTree,
  containerClassName,
  safeUrl,
};
