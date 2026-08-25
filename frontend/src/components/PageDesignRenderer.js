import FormRenderer from "@/components/FormRenderer";
import PartnersSlider from "@/components/PartnersSlider";
import StackedImageSlider from "@/components/StackedImageSlider";
import WordPressContent from "@/components/WordPressContent";

const {
  renderDesignTemplate,
  splitDesignHtml,
} = require("./pageDesignTemplate");
const { normalizePartnerGrantees } = require("@/lib/partnerGrantees");
const {
  resolveGrantsTotalLabel,
  sumGrantAmounts,
  formatGrantTotal,
} = require("@/lib/grantsQuery");
const { HOME } = require("@/lib/pageCopy");

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

export function buildDesignModel(page, { grantsTotal = "" } = {}) {
  const fields = Object.fromEntries(
    (page?.kpfDesignFields || [])
      .filter((field) => field?.key)
      .map((field) => [field.key, field.value || ""]),
  );
  const image = page?.featuredImage?.node;
  const author = page?.author?.node;
  const design = page?.kpfPageDesign;
  const queries = queriesFromDesign(design);
  const totalLabel = resolveGrantsTotalLabel(
    { label: grantsTotal },
    queries?.grants?.items || [],
  ) || grantsTotalFromQueries(queries);

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
    queries,
    grants: {
      total: totalLabel,
    },
  };
}

function renderDesignPart(part, index, { forms, queries, partnerGrantees }) {
  if (part.type === "html") {
    return (
      <div
        key={`html-${index}`}
        dangerouslySetInnerHTML={{ __html: part.html }}
      />
    );
  }

  if (part.type === "form") {
    const form = forms[part.slug];
    if (!form) return null;
    return (
      <FormRenderer
        key={`form-${part.slug}-${index}`}
        slug={form.slug}
        formId={form.databaseId}
        title={form.title}
        definition={form.definitionJson || form.definition}
      />
    );
  }

  if (part.type === "stacked-slider") {
    const query = queries[part.slug];
    const images = imagesFromQuery(query);
    if (!images.length) return null;
    return (
      <StackedImageSlider
        key={`stacked-slider-${part.slug}-${index}`}
        images={images}
        ariaLabel={query?.title || "Photo stack"}
      />
    );
  }

  if (part.type === "partners-slider") {
    const items = normalizePartnerGrantees(partnerGrantees);
    if (!items.length) return null;
    return (
      <PartnersSlider
        key={`partners-slider-${index}`}
        items={items}
        label={HOME?.partners?.label || "Kevin Popke Foundation Grantees"}
        href={HOME?.partners?.href || "/about/#grantees"}
      />
    );
  }

  return null;
}

export default function PageDesignRenderer({
  page,
  partnerGrantees = [],
  grantsTotal = "",
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

  const model = buildDesignModel(page, { grantsTotal });
  const html = renderDesignTemplate(design.html, model);
  const forms = formsFromDesign(design);
  const parts = splitDesignHtml(html);
  const hasIslands = parts.some(
    (part) =>
      part.type === "form" ||
      part.type === "stacked-slider" ||
      part.type === "partners-slider",
  );

  return (
    <>
      {design.css ? (
        <style
          data-kpf-design-styles={design.databaseId}
          dangerouslySetInnerHTML={{ __html: design.css }}
        />
      ) : null}
      {hasIslands ? (
        <div data-kpf-design={design.databaseId}>
          {parts.map((part, index) =>
            renderDesignPart(part, index, {
              forms,
              queries: model.queries,
              partnerGrantees,
            }),
          )}
        </div>
      ) : (
        <div
          data-kpf-design={design.databaseId}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </>
  );
}
