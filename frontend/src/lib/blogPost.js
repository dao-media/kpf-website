/**
 * Single blog post helpers — TOC from headings, comments, author label.
 */

const { stripHtml } = require("./searchDocuments");
const { formatPostDate, estimateReadTime } = require("./latestBlogPost");

const STORY_LINKS = [
  {
    pattern: /Donald\s+[“"']Kevin[”"']\s+Popke/g,
    href: "/about/",
  },
  {
    pattern: /Kevin Popke(?! Foundation)/g,
    href: "/about/",
  },
  {
    pattern: /My Warrior['’]s Place/g,
    href: "https://mywarriorsplace.org",
  },
  {
    pattern: /Freedom Riding Academy/g,
    href: "https://freedomridingacademy.org",
  },
  {
    pattern: /Other Side of the Dunes/g,
    href: "https://othersideofthedunes.org",
  },
];

/**
 * Wrap known org names in descriptive links, skipping existing anchors.
 * @param {string} html
 * @returns {string}
 */
function linkKnownEntities(html) {
  let inAnchor = false;
  return String(html || "").replace(/(<[^>]+>)|([^<]+)/g, (full, tag, text) => {
    if (tag) {
      if (/^<a\b/i.test(tag)) inAnchor = true;
      if (/^<\/a>/i.test(tag)) inAnchor = false;
      return tag;
    }
    if (inAnchor || !text) return text;
    let next = text;
    for (const { pattern, href } of STORY_LINKS) {
      next = next.replace(pattern, (match) => `<a href="${href}">${match}</a>`);
    }
    return next;
  });
}

/**
 * @param {string} text
 * @returns {string}
 */
function slugifyHeading(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * @param {string} html
 * @returns {{ html: string, toc: Array<{ id: string, text: string, level: number }> }}
 */
function prepareArticleHtml(html) {
  const source = String(html || "");
  const toc = [];
  const used = new Map();

  // h2–h3 only (Figma Contents: parents + child links). Allow attrs in any order.
  const withIds = source.replace(
    /<h([23])(\s[^>]*)?>([\s\S]*?)<\/h\1>/gi,
    (full, level, attrs = "", inner) => {
      const text = stripHtml(inner);
      if (!text) return full;
      let id = "";
      const existing = /\sid=["']([^"']+)["']/i.exec(attrs || "");
      if (existing) {
        id = existing[1];
      } else {
        const base = slugifyHeading(text) || `section-${toc.length + 1}`;
        const count = (used.get(base) || 0) + 1;
        used.set(base, count);
        id = count > 1 ? `${base}-${count}` : base;
      }
      toc.push({ id, text, level: Number(level) });
      if (existing) return full;
      const attr = attrs || "";
      return `<h${level}${attr} id="${id}">${inner}</h${level}>`;
    },
  );

  return { html: linkKnownEntities(withIds), toc };
}

/**
 * Nest H3 (and deeper) items under the preceding H2 for Contents.
 * Orphan H3s before any H2 stay top-level so they remain reachable.
 *
 * @param {Array<{ id: string, text: string, level: number }>|null|undefined} toc
 * @returns {Array<{ id: string, text: string, level: number, children: Array }>}
 */
function buildTocTree(toc) {
  if (!Array.isArray(toc) || !toc.length) return [];
  const roots = [];
  let parent = null;

  for (const item of toc) {
    if (!item?.id) continue;
    const level = Number(item.level) || 2;
    const node = {
      id: item.id,
      text: item.text,
      level,
      children: [],
    };

    if (level <= 2) {
      parent = node;
      roots.push(node);
      continue;
    }

    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * @param {unknown} authorName
 * @returns {string}
 */
function blogAuthorLabel(authorName) {
  const name = stripHtml(authorName);
  if (!name || /^admin$/i.test(name)) return "the KPF team";
  return name;
}

/**
 * @param {unknown} nodes
 * @returns {Array<Record<string, string>>}
 */
function normalizeComments(nodes) {
  if (!Array.isArray(nodes)) return [];
  return nodes
    .map((node) => {
      if (!node || typeof node !== "object") return null;
      const name =
        stripHtml(node.author?.node?.name) ||
        stripHtml(node.author?.name) ||
        "Guest";
      const content = stripHtml(node.content);
      if (!content) return null;
      const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("");
      return {
        id: String(node.id || node.databaseId || `${name}-${node.date}`),
        name,
        initials: initials || "?",
        date: formatPostDate(node.date),
        content,
        excerpt: content.length > 110 ? `${content.slice(0, 110).trim()}…` : content,
      };
    })
    .filter(Boolean);
}

/**
 * @param {unknown} post
 * @returns {Record<string, unknown> | null}
 */
function normalizeBlogPostPage(post) {
  if (!post || typeof post !== "object") return null;
  const title = stripHtml(post.title);
  if (!title) return null;

  const { html, toc } = prepareArticleHtml(post.content || "");
  const category = stripHtml(post.categories?.nodes?.[0]?.name) || "Blog";
  const categorySlug = String(post.categories?.nodes?.[0]?.slug || "")
    .trim()
    .toLowerCase();
  const image = post.featuredImage?.node;

  return {
    id: Number(post.databaseId) || 0,
    title,
    uri: String(post.uri || "").trim(),
    date: formatPostDate(post.date),
    readTime: estimateReadTime(post.content),
    author: blogAuthorLabel(post.author?.node?.name),
    category,
    categorySlug,
    html,
    toc,
    commentStatus: String(post.commentStatus || "").toLowerCase(),
    comments: normalizeComments(post.comments?.nodes),
    media: image?.sourceUrl
      ? {
          src: String(image.sourceUrl).trim(),
          alt: stripHtml(image.altText) || title,
        }
      : null,
  };
}

module.exports = {
  blogAuthorLabel,
  buildTocTree,
  linkKnownEntities,
  normalizeBlogPostPage,
  normalizeComments,
  prepareArticleHtml,
  slugifyHeading,
};
