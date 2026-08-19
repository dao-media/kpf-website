import { gql } from "@apollo/client";
import { KPF_EDITOR_BLOCKS_QUERY } from "@/components/BlockRenderer";
import { KPF_STYLESHEET_QUERY } from "@/components/GlobalStylesheet";
import GsapRuntime, { KPF_GSAP_QUERY } from "@/components/GsapRuntime";
import PageScaffold from "@/components/PageScaffold";
import SeoHead, { KPF_SEO_FRAGMENT } from "@/components/SeoHead";
const { KPF_ACCESSIBILITY_QUERY } = require("@/lib/accessibility");
const { KPF_CODE_SNIPPETS_QUERY } = require("@/lib/codeSnippets");
const { KPF_GRANTS_QUERY, KPF_GRANTS_TOTAL_QUERY, normalizeGrantQueryItems } = require("@/lib/grantsQuery");
const {
  KPF_SCRAPBOOK_TILES_QUERY,
  normalizeScrapbookTiles,
} = require("@/lib/scrapbookTiles");
const { KPF_SITE_CHROME_QUERY } = require("@/lib/siteChrome");
const {
  KPF_SCAFFOLD_MEDIA_QUERY,
  scaffoldMediaMap,
} = require("@/lib/scaffoldMedia");
const { KPF_EVENTS_QUERY } = require("@/lib/eventsQuery");
const { KPF_BLOG_POSTS_QUERY } = require("@/lib/blogPosts");

const KPF_CONTACT_FORM_QUERY = `
  kpfForm(slug: "contact") {
    databaseId
    title
    slug
    definitionJson
  }
`;

export default function PageTemplate(props) {
  const page = props?.data?.page;
  const media = scaffoldMediaMap(props?.data?.kpfScaffoldMedia);
  const contactForm = props?.data?.kpfForm || null;
  const kevinSlides = props?.data?.kpfKevinSlides || [];
  const grants = normalizeGrantQueryItems(props?.data?.kpfQuery);
  const grantsTotal = String(props?.data?.kpfGrantsTotal?.label || "").trim();
  const scrapbookTiles = normalizeScrapbookTiles(props?.data?.kpfScrapbookTiles);
  const events = props?.data?.foundationEvents?.nodes || [];
  const posts = props?.data?.kpfBlogPosts || null;

  return (
    <>
      <GsapRuntime animations={props?.data?.kpfGsapAnimations} />
      <SeoHead seo={page?.kpfSeo} />
      <PageScaffold
        key={page?.databaseId || page?.slug || page?.uri || "page"}
        page={page}
        media={media}
        contactForm={contactForm}
        kevinSlides={kevinSlides}
        grants={grants}
        grantsTotal={grantsTotal}
        scrapbookTiles={scrapbookTiles}
        events={events}
        posts={posts}
      />
    </>
  );
}

PageTemplate.query = gql`
  query GetPage($uri: ID!) {
    ${KPF_STYLESHEET_QUERY}
    ${KPF_SCAFFOLD_MEDIA_QUERY}
    ${KPF_CONTACT_FORM_QUERY}
    ${KPF_SITE_CHROME_QUERY}
    ${KPF_ACCESSIBILITY_QUERY}
    ${KPF_CODE_SNIPPETS_QUERY}
    ${KPF_GSAP_QUERY}
    ${KPF_GRANTS_QUERY}
    ${KPF_GRANTS_TOTAL_QUERY}
    ${KPF_SCRAPBOOK_TILES_QUERY}
    ${KPF_EVENTS_QUERY}
    ${KPF_BLOG_POSTS_QUERY}
    kpfKevinSlides(first: 12) {
      databaseId
      header
      body
      imageUrl
      imageAlt
      menuOrder
    }
    page(id: $uri, idType: URI) {
      id
      databaseId
      title
      content
      ${KPF_EDITOR_BLOCKS_QUERY}
      excerpt
      slug
      uri
      link
      date
      modified
      author {
        node {
          name
          uri
        }
      }
      featuredImage {
        node {
          sourceUrl
          srcSet
          altText
          caption
          mediaDetails {
            width
            height
          }
        }
      }
      kpfPageDesign {
        databaseId
        title
        html
        css
        source
        queries {
          slug
          title
          items {
            databaseId
            title
            excerpt
            link
            uri
            slug
            date
            featuredImage {
              url
              alt
            }
            recipientName
            blurb
            grantAmountLabel
            awardedLabel
            checkPhotoUrl
            logoUrl
            website
          }
          pagination {
            page
            perPage
            total
            totalPages
            hasNext
            hasPrevious
            enabled
          }
        }
        forms {
          databaseId
          title
          slug
          definitionJson
        }
      }
      kpfDesignFields {
        key
        value
      }
      ${KPF_SEO_FRAGMENT}
    }
  }
`;

PageTemplate.variables = (seedQuery) => {
  return {
    uri: seedQuery?.uri,
  };
};
