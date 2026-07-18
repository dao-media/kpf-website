const TYPE_LABELS = {
  page: "Page",
  post: "Blog",
};

function decodeEntities(value = "") {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lsquo: "‘",
    lt: "<",
    nbsp: " ",
    quot: '"',
    rdquo: "”",
    rsquo: "’",
  };

  return String(value ?? "").replace(
    /&(#(?:x[\da-f]+|\d+)|[a-z]+);/gi,
    (entity, token) => {
      if (token[0] !== "#") {
        return named[token.toLowerCase()] ?? entity;
      }

      const isHex = token[1]?.toLowerCase() === "x";
      const codePoint = Number.parseInt(token.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
  );
}

function stripHtml(value = "") {
  return decodeEntities(
    String(value ?? "")
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function truncate(value, maximum = 180) {
  if (value.length <= maximum) return value;
  const shortened = value.slice(0, maximum + 1).replace(/\s+\S*$/, "").trim();
  return `${shortened || value.slice(0, maximum).trim()}…`;
}

function isIndexable(node) {
  return (
    node?.kpfSeo?.robots?.index === true &&
    node?.kpfSeo?.showInSitemap === true &&
    typeof node?.uri === "string" &&
    node.uri.startsWith("/")
  );
}

function documentFromNode(node, type) {
  if (!isIndexable(node)) return null;

  const title = stripHtml(node.title) || "Untitled";
  const body = stripHtml(node.content);
  const suppliedExcerpt = stripHtml(node.excerpt);
  const taxonomyTerms = [
    ...(node.categories?.nodes || []),
    ...(node.tags?.nodes || []),
  ]
    .map((term) => stripHtml(term?.name))
    .filter(Boolean);

  return {
    id: `${type}:${node.databaseId}`,
    type,
    typeLabel: TYPE_LABELS[type] || "Content",
    title,
    excerpt: truncate(suppliedExcerpt || body),
    body,
    terms: taxonomyTerms.join(" "),
    url: node.uri,
    date: node.date || null,
    modified: node.modified || null,
    image: node.featuredImage?.node?.sourceUrl || null,
    imageAlt: stripHtml(node.featuredImage?.node?.altText),
  };
}

module.exports = {
  decodeEntities,
  documentFromNode,
  isIndexable,
  stripHtml,
  truncate,
};
