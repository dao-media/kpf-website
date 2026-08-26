import { gql } from "@apollo/client";
import { KPF_EDITOR_BLOCKS_QUERY } from "@/components/BlockRenderer";
import { KPF_STYLESHEET_QUERY } from "@/components/GlobalStylesheet";
import GsapRuntime, { KPF_GSAP_QUERY } from "@/components/GsapRuntimeGate";
import HomePageScaffold from "@/components/HomePageScaffold";
import PageDesignRenderer from "@/components/PageDesignRenderer";
import SeoHead from "@/components/SeoHead";
const { KPF_ACCESSIBILITY_QUERY } = require("@/lib/accessibility");
const { KPF_CODE_SNIPPETS_QUERY } = require("@/lib/codeSnippets");
const { KPF_LATEST_BLOG_POST_QUERY } = require("@/lib/latestBlogPost");
const { KPF_PARTNER_GRANTEES_QUERY } = require("@/lib/partnerGrantees");
const { KPF_SITE_CHROME_QUERY } = require("@/lib/siteChrome");
const {
  KPF_SCAFFOLD_MEDIA_QUERY,
  scaffoldMediaMap,
} = require("@/lib/scaffoldMedia");
const { fallbackPartners } = require("@/lib/wpContentFallback");

export default function FrontPageTemplate(props) {
  const seo = props?.data?.kpfSeoHome;
  const page = props?.data?.home;
  const media = scaffoldMediaMap(props?.data?.kpfScaffoldMedia);
  const partnerGrantees = fallbackPartners(props?.data?.kpfPartnerGrantees || []);
  const latestBlogPost = props?.data?.kpfLatestBlogPost || null;
  // Prefer the React scaffold (Figma 414:532) over CMS design HTML. Seeded
  // design markup was fighting hydrate via dangerouslySetInnerHTML islands.
  const useHomeScaffold = true;
  const hasDesignHtml = Boolean(page?.kpfPageDesign?.html);

  return (
    <>
      <GsapRuntime animations={props?.data?.kpfGsapAnimations} />
      <SeoHead seo={seo} />
      {useHomeScaffold || !hasDesignHtml ? (
        <HomePageScaffold
          media={media}
          partnerGrantees={partnerGrantees}
          latestBlogPost={latestBlogPost}
        />
      ) : (
        <PageDesignRenderer page={page} partnerGrantees={partnerGrantees} />
      )}
    </>
  );
}

FrontPageTemplate.query = gql`
  query GetHomeSeo {
    ${KPF_STYLESHEET_QUERY}
    ${KPF_SCAFFOLD_MEDIA_QUERY}
    ${KPF_PARTNER_GRANTEES_QUERY}
    ${KPF_LATEST_BLOG_POST_QUERY}
    ${KPF_SITE_CHROME_QUERY}
    ${KPF_ACCESSIBILITY_QUERY}
    ${KPF_CODE_SNIPPETS_QUERY}
    ${KPF_GSAP_QUERY}
    home: kpfFrontPage {
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
    }
    kpfSeoHome {
      title
      description
      canonical
      robots {
        index
        follow
        noarchive
        nosnippet
      }
      openGraph {
        title
        description
        imageUrl
        type
        url
      }
      twitter {
        card
        site
        title
        description
        imageUrl
      }
      customMeta {
        name
        property
        content
        rel
        href
        media
      }
      schemaJson
    }
  }
`;
