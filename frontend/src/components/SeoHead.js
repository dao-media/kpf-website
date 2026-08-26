import Head from "next/head";

const { rewriteSeoPublicUrls } = require("@/lib/publicSiteUrl");
const { applySeoDefaults } = require("@/lib/seoPageDefaults");
const { KPF_SEO_FRAGMENT } = require("@/lib/seoFragment");

export { KPF_SEO_FRAGMENT };

function robotsContent(robots = {}) {
  const parts = [
    robots.index === false ? "noindex" : "index",
    robots.follow === false ? "nofollow" : "follow",
  ];
  if (robots.noarchive) parts.push("noarchive");
  if (robots.nosnippet) parts.push("nosnippet");
  return parts.join(", ");
}

export default function SeoHead({ seo }) {
  if (!seo) {
    return null;
  }

  const {
    title,
    description,
    canonical,
    robots,
    openGraph,
    twitter,
    customMeta = [],
    schemaJson,
  } = applySeoDefaults(rewriteSeoPublicUrls(seo), seo?.canonical);

  return (
    <Head>
      {title ? <title>{title}</title> : null}
      {description ? (
        <meta name="description" content={description} key="description" />
      ) : null}
      {canonical ? <link rel="canonical" href={canonical} key="canonical" /> : null}
      <meta name="robots" content={robotsContent(robots)} key="robots" />
      <meta property="og:locale" content="en_US" key="og:locale" />
      <meta
        property="og:site_name"
        content="The Kevin Popke Foundation"
        key="og:site_name"
      />

      {openGraph?.title ? (
        <meta property="og:title" content={openGraph.title} key="og:title" />
      ) : null}
      {openGraph?.description ? (
        <meta
          property="og:description"
          content={openGraph.description}
          key="og:description"
        />
      ) : null}
      {openGraph?.type ? (
        <meta property="og:type" content={openGraph.type} key="og:type" />
      ) : null}
      {openGraph?.url ? (
        <meta property="og:url" content={openGraph.url} key="og:url" />
      ) : null}
      {openGraph?.imageUrl ? (
        <>
          <meta property="og:image" content={openGraph.imageUrl} key="og:image" />
          <meta
            property="og:image:alt"
            content={title || "The Kevin Popke Foundation"}
            key="og:image:alt"
          />
        </>
      ) : null}
      {openGraph?.section ? (
        <meta
          property="article:section"
          content={openGraph.section}
          key="article:section"
        />
      ) : null}
      {(openGraph?.tags || []).map((tag, index) =>
        tag ? (
          <meta
            property="article:tag"
            content={tag}
            key={`article:tag-${index}`}
          />
        ) : null
      )}

      {twitter?.card ? (
        <meta name="twitter:card" content={twitter.card} key="twitter:card" />
      ) : null}
      {twitter?.site ? (
        <meta name="twitter:site" content={twitter.site} key="twitter:site" />
      ) : null}
      {twitter?.title ? (
        <meta name="twitter:title" content={twitter.title} key="twitter:title" />
      ) : null}
      {twitter?.description ? (
        <meta
          name="twitter:description"
          content={twitter.description}
          key="twitter:description"
        />
      ) : null}
      {twitter?.imageUrl ? (
        <meta
          name="twitter:image"
          content={twitter.imageUrl}
          key="twitter:image"
        />
      ) : null}

      {customMeta.map((tag, index) => {
        if (tag?.rel && tag?.href) {
          return (
            <link
              key={`custom-link-${index}`}
              rel={tag.rel}
              href={tag.href}
              media={tag.media || undefined}
            />
          );
        }
        return (
          <meta
            key={`custom-meta-${index}`}
            name={tag?.name || undefined}
            property={tag?.property || undefined}
            content={tag?.content || undefined}
          />
        );
      })}

      {schemaJson ? (
        <script
          type="application/ld+json"
          key="kpf-schema"
          dangerouslySetInnerHTML={{ __html: schemaJson }}
        />
      ) : null}
    </Head>
  );
}
