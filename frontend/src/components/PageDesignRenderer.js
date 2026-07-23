import WordPressContent from "@/components/WordPressContent";

const { renderDesignTemplate } = require("./pageDesignTemplate");

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

export function buildDesignModel(page) {
  const fields = Object.fromEntries(
    (page?.kpfDesignFields || [])
      .filter((field) => field?.key)
      .map((field) => [field.key, field.value || ""]),
  );
  const image = page?.featuredImage?.node;
  const author = page?.author?.node;
  const design = page?.kpfPageDesign;

  return {
    page: {
      title: textOnly(page?.title),
      content: page?.content || "",
      excerpt: textOnly(page?.excerpt),
      slug: page?.slug || "",
      uri: page?.uri || "",
      link: page?.link || "",
      date: page?.date || "",
      modified: page?.modified || "",
      author: {
        name: author?.name || "",
        uri: author?.uri || "",
      },
      featuredImage: {
        url: image?.sourceUrl || "",
        alt: image?.altText || "",
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
    fields,
    queries: queriesFromDesign(design),
  };
}

export default function PageDesignRenderer({ page }) {
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

  const html = renderDesignTemplate(design.html, buildDesignModel(page));

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
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
