/**
 * Homepage “Latest on our blog” card — newest published post.
 */

const { stripHtml } = require("./searchDocuments");

const KPF_LATEST_BLOG_POST_QUERY = `
  kpfLatestBlogPost: posts(
    first: 1
    where: { status: PUBLISH, orderby: { field: DATE, order: DESC } }
  ) {
    nodes {
      databaseId
      title
      uri
      date
      content
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

const WORDS_PER_MINUTE = 200;

function formatPostDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function estimateReadTime(html) {
  const words = stripHtml(html || "")
    .split(/\s+/)
    .filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / WORDS_PER_MINUTE));
  return `${minutes} min read`;
}

/**
 * Normalize the GraphQL posts connection (or a bare node) into card props.
 * Returns null when nothing publishable is available.
 */
function normalizeLatestBlogPost(source, fallback = null) {
  const node = Array.isArray(source?.nodes)
    ? source.nodes[0]
    : Array.isArray(source)
      ? source[0]
      : source;

  if (!node || typeof node !== "object") {
    return fallback && typeof fallback === "object" ? { ...fallback } : null;
  }

  const title = stripHtml(node.title);
  const href = String(node.uri || node.link || "").trim();
  if (!title || !href) {
    return fallback && typeof fallback === "object" ? { ...fallback } : null;
  }

  const category =
    stripHtml(node.categories?.nodes?.[0]?.name) ||
    fallback?.category ||
    "Blog";

  const image = node.featuredImage?.node;
  const mediaSrc = String(image?.sourceUrl || "").trim();
  const mediaAlt = stripHtml(image?.altText) || title;

  return {
    href,
    category,
    date: formatPostDate(node.date) || fallback?.date || "",
    readTime: estimateReadTime(node.content) || fallback?.readTime || "",
    title,
    cta: fallback?.cta || "Read the story",
    media: mediaSrc
      ? { src: mediaSrc, alt: mediaAlt }
      : fallback?.media
        ? { ...fallback.media }
        : { src: "", alt: title },
  };
}

module.exports = {
  KPF_LATEST_BLOG_POST_QUERY,
  estimateReadTime,
  formatPostDate,
  normalizeLatestBlogPost,
};
