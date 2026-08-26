import { useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import CtaClosingBand from "@/components/CtaClosingBand";
import FormRenderer from "@/components/FormRenderer";
import PartnersSlider from "@/components/PartnersSlider";
import StackedImageSlider from "@/components/StackedImageSlider";
import WordPressContent from "@/components/WordPressContent";
import {
  BlogFiltersIsland,
  CommentsIsland,
  PostSidebarIsland,
} from "@/components/blogDesignIslands";

const {
  renderDesignTemplate,
  embedDesignIslands,
  promoteBlogArchiveCtaIsland,
} = require("./pageDesignTemplate");
const { normalizePartnerGrantees } = require("@/lib/partnerGrantees");
const {
  resolveGrantsTotalLabel,
  sumGrantAmounts,
  formatGrantTotal,
} = require("@/lib/grantsQuery");
const { HOME } = require("@/lib/pageCopy");
const {
  normalizeBlogPosts,
  toDesignQueryItem,
} = require("@/lib/blogPosts");
const { normalizeBlogPostPage } = require("@/lib/blogPost");

function textOnly(value) {
  return String(value || "").replace(/<[^>]*>/g, "").trim();
}

function queriesFromDesign(design) {
  const map = {};
  for (const query of design?.queries || []) {
    if (!query?.slug) continue;
    map[query.slug] = {
      ...query,
      items: query.items || [],
      pagination: query.pagination || {},
    };
  }
  return map;
}

function formsFromDesign(design) {
  const map = {};
  for (const form of design?.forms || []) {
    if (!form?.slug) continue;
    map[form.slug] = form;
  }
  return map;
}

function imagesFromQuery(query) {
  const items = query?.items || [];
  return items
    .map((item) => ({
      id: item?.databaseId || item?.slug || item?.uri,
      src: item?.featuredImage?.url || "",
      alt: item?.featuredImage?.alt || textOnly(item?.title) || "",
      caption: textOnly(item?.title) || textOnly(item?.excerpt) || "",
    }))
    .filter((item) => item.src);
}

function grantsTotalFromQueries(queries) {
  const items = queries?.grants?.items || [];
  return formatGrantTotal(sumGrantAmounts(items));
}

function designCardsFromPosts(source, options = {}) {
  return normalizeBlogPosts(source, options).map(toDesignQueryItem);
}

function withInjectedQueries(queries, { posts, relatedPosts }) {
  const next = { ...queries };
  if (Array.isArray(posts) && posts.length) {
    next["blog-posts"] = { slug: "blog-posts", items: posts };
  }
  if (Array.isArray(relatedPosts) && relatedPosts.length) {
    next["related-posts"] = { slug: "related-posts", items: relatedPosts };
  }
  return next;
}

export function buildDesignModel(
  page,
  { grantsTotal = "", posts = [], relatedPosts = [], postRuntime = null } = {},
) {
  const fields = Object.fromEntries(
    (page?.kpfDesignFields || [])
      .filter((field) => field?.key)
      .map((field) => [field.key, field.value || ""]),
  );
  const image = page?.featuredImage?.node;
  const author = page?.author?.node;
  const design = page?.kpfPageDesign;
  const queries = withInjectedQueries(queriesFromDesign(design), {
    posts,
    relatedPosts,
  });
  const totalLabel = resolveGrantsTotalLabel(
    { label: grantsTotal },
    queries?.grants?.items || [],
  ) || grantsTotalFromQueries(queries);

  const featured = postRuntime?.media || null;

  return {
    page: {
      title: textOnly(postRuntime?.title || page?.title),
      content: postRuntime?.html || page?.content || "",
      excerpt: textOnly(page?.excerpt),
      slug: page?.slug || "",
      uri: postRuntime?.uri || page?.uri || "",
      link: page?.link || "",
      date: postRuntime?.date || page?.date || "",
      modified: page?.modified || "",
      author: {
        name: postRuntime?.author || author?.name || "",
        uri: author?.uri || "",
      },
      featuredImage: {
        url: featured?.src || image?.sourceUrl || "",
        alt: featured?.alt || image?.altText || "",
        caption: textOnly(image?.caption),
        width: image?.mediaDetails?.width || "",
        height: image?.mediaDetails?.height || "",
        srcSet: image?.srcSet || "",
      },
      seo: {
        title: page?.kpfSeo?.title || "",
        description: page?.kpfSeo?.description || "",
        canonical: page?.kpfSeo?.canonical || "",
      },
    },
    fields: {
      ...fields,
      ...(postRuntime?.category ? { category: postRuntime.category } : {}),
      ...(postRuntime?.readTime ? { readTime: postRuntime.readTime } : {}),
    },
    queries,
    grants: {
      total: totalLabel,
    },
  };
}

function DesignIslandPortal({ islandId, html, children }) {
  const [target, setTarget] = useState(null);

  useLayoutEffect(() => {
    setTarget(document.getElementById(islandId));
    return () => setTarget(null);
  }, [islandId, html]);

  if (!target || children == null) return null;
  return createPortal(children, target);
}

function renderDesignIsland(
  island,
  { forms, queries, partnerGrantees, posts, postRuntime },
) {
  if (island.type === "form") {
    const form = forms[island.slug];
    if (!form) return null;
    return (
      <FormRenderer
        slug={form.slug}
        formId={form.databaseId}
        title={form.title}
        definition={form.definitionJson || form.definition}
      />
    );
  }

  if (island.type === "stacked-slider") {
    const query = queries[island.slug];
    const images = imagesFromQuery(query);
    if (!images.length) return null;
    return (
      <StackedImageSlider
        images={images}
        ariaLabel={query?.title || "Photo stack"}
      />
    );
  }

  if (island.type === "partners-slider") {
    const items = normalizePartnerGrantees(partnerGrantees);
    if (!items.length) return null;
    return (
      <PartnersSlider
        items={items}
        label={HOME?.partners?.label || "Kevin Popke Foundation Grantees"}
        href={HOME?.partners?.href || "/about/#grantees"}
      />
    );
  }

  if (island.type === "blog-filters") {
    return <BlogFiltersIsland posts={posts} />;
  }

  if (island.type === "post-sidebar") {
    return <PostSidebarIsland post={postRuntime} />;
  }

  if (island.type === "comments") {
    return <CommentsIsland post={postRuntime} />;
  }

  if (island.type === "cta-closing") {
    return (
      <CtaClosingBand
        titleId={
          postRuntime ? "kpf-post-cta-title" : "kpf-blog-cta-title"
        }
      />
    );
  }

  return null;
}

export default function PageDesignRenderer({
  page,
  partnerGrantees = [],
  grantsTotal = "",
  posts = null,
  relatedPosts = null,
  postSource = null,
}) {
  const design = page?.kpfPageDesign;

  if (!design || !design.html) {
    return (
      <WordPressContent
        title={page?.title}
        content={page?.content}
        blocks={page?.editorBlocks}
      />
    );
  }

  return (
    <PageDesignWithIslands
      page={page}
      design={design}
      partnerGrantees={partnerGrantees}
      grantsTotal={grantsTotal}
      archiveSource={posts}
      relatedSource={relatedPosts}
      postSource={postSource}
    />
  );
}

function PageDesignWithIslands({
  page,
  design,
  partnerGrantees,
  grantsTotal,
  archiveSource,
  relatedSource,
  postSource,
}) {
  const postRuntime = postSource ? normalizeBlogPostPage(postSource) : null;
  const posts = designCardsFromPosts(archiveSource, {
    featuredCta: "Read the story",
    rowCta: "Read story",
  });
  const relatedPosts = designCardsFromPosts(relatedSource || postSource, {
    rowCta: "Read story",
  }).filter((item) => item.href !== (postRuntime?.uri || page?.uri));

  const model = buildDesignModel(page, {
    grantsTotal,
    posts,
    relatedPosts: postRuntime ? relatedPosts.slice(0, 2) : relatedPosts,
    postRuntime,
  });
  const html = promoteBlogArchiveCtaIsland(
    renderDesignTemplate(design.html, model),
  );
  const forms = formsFromDesign(design);
  const islandPrefix = `kpf-island-${design.databaseId || "page"}`;
  const { html: embeddedHtml, islands } = useMemo(
    () => embedDesignIslands(html, islandPrefix),
    [html, islandPrefix],
  );
  const islandContext = {
    forms,
    queries: model.queries,
    partnerGrantees,
    posts,
    postRuntime,
  };

  return (
    <>
      {design.css ? (
        <style
          data-kpf-design-styles={design.databaseId}
          dangerouslySetInnerHTML={{ __html: design.css }}
        />
      ) : null}
      <div
        data-kpf-design={design.databaseId}
        dangerouslySetInnerHTML={{ __html: embeddedHtml }}
      />
      {islands.map((island) => (
        <DesignIslandPortal
          key={island.id}
          islandId={island.id}
          html={embeddedHtml}
        >
          {renderDesignIsland(island, islandContext)}
        </DesignIslandPortal>
      ))}
    </>
  );
}
