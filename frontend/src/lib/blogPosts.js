/**
 * Blog archive — WPGraphQL posts listing + card normalization.
 */

const { stripHtml } = require("./searchDocuments");
const {
  estimateReadTime,
  formatPostDate,
  isDefaultWordPressPost,
} = require("./latestBlogPost");

const BLOG_CARD_MAX_WORDS = 40;

const KPF_BLOG_POSTS_QUERY = `
  kpfBlogPosts: posts(
    first: 50
    where: { status: PUBLISH, orderby: { field: DATE, order: DESC } }
  ) {
    nodes {
      databaseId
      title
      slug
      uri
      date
      excerpt
      content
      kpfSeo {
        description
      }
      featuredImage {
        node {
          sourceUrl
          altText
        }
      }
      categories {
        nodes {
          name
          slug
        }
      }
    }
  }
`;

/**
 * @param {string} text
 * @param {number} [maxWords]
 * @returns {string}
 */
function truncateWords(text, maxWords = BLOG_CARD_MAX_WORDS) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}…`;
}

/**
 * Prefer SEO description; fall back to excerpt (capped), then first content sentence.
 * @param {unknown} node
 * @returns {string}
 */
function blogCardDescription(node) {
  if (!node || typeof node !== "object") return "";

  const seoDescription = stripHtml(node.kpfSeo?.description);
  if (seoDescription) return seoDescription;

  const excerpt = stripHtml(node.excerpt);
  if (excerpt) return truncateWords(excerpt, BLOG_CARD_MAX_WORDS);

  const firstSentence =
    stripHtml(node.content).split(/(?<=[.!?])\s+/).filter(Boolean)[0] || "";
  return firstSentence ? truncateWords(firstSentence, BLOG_CARD_MAX_WORDS) : "";
}

/**
 * @param {unknown} node
 * @param {{ featuredCta?: string, rowCta?: string }} [options]
 * @returns {Record<string, unknown> | null}
 */
function normalizeBlogPost(node, options = {}) {
  if (!node || typeof node !== "object") return null;

  const title = stripHtml(node.title);
  const href = String(node.uri || node.link || "").trim();
  if (!title || !href) return null;

  const categoryNode = Array.isArray(node.categories?.nodes)
    ? node.categories.nodes[0]
    : null;
  const category = stripHtml(categoryNode?.name) || "Blog";
  const categorySlug = String(categoryNode?.slug || "")
    .trim()
    .toLowerCase();

  const image = node.featuredImage?.node;
  const mediaSrc = String(image?.sourceUrl || "").trim();
  const mediaAlt = stripHtml(image?.altText) || title;

  return {
    id: Number(node.databaseId) || href,
    href,
    category,
    categorySlug,
    date: formatPostDate(node.date),
    readTime: estimateReadTime(node.content || node.excerpt),
    title,
    description: blogCardDescription(node),
    cta: options.featuredCta || options.rowCta || "Read story",
    media: mediaSrc
      ? { src: mediaSrc, alt: mediaAlt }
      : { src: "", alt: title },
  };
}

/**
 * @param {unknown} source
 * @param {{ featuredCta?: string, rowCta?: string }} [options]
 * @returns {Array<Record<string, unknown>>}
 */
function normalizeBlogPosts(source, options = {}) {
  const nodes = Array.isArray(source?.nodes)
    ? source.nodes
    : Array.isArray(source)
      ? source
      : [];

  return nodes
    .filter((node) => !isDefaultWordPressPost(node))
    .map((node) => normalizeBlogPost(node, options))
    .filter(Boolean);
}

/**
 * Unique category chips from posts, always leading with All.
 * @param {Array<{ category?: string, categorySlug?: string }>} posts
 * @returns {Array<{ slug: string, label: string }>}
 */
function blogTopicFilters(posts) {
  const seen = new Map();
  for (const post of Array.isArray(posts) ? posts : []) {
    const slug = String(post?.categorySlug || "").trim().toLowerCase();
    const label = String(post?.category || "").trim();
    if (!slug || !label || seen.has(slug)) continue;
    seen.set(slug, label);
  }
  return [
    { slug: "all", label: "All" },
    ...[...seen.entries()].map(([slug, label]) => ({ slug, label })),
  ];
}

module.exports = {
  BLOG_CARD_MAX_WORDS,
  KPF_BLOG_POSTS_QUERY,
  blogCardDescription,
  blogTopicFilters,
  normalizeBlogPost,
  normalizeBlogPosts,
  truncateWords,
};
