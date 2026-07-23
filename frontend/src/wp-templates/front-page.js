import { gql } from "@apollo/client";
import { KPF_EDITOR_BLOCKS_QUERY } from "@/components/BlockRenderer";
import { KPF_STYLESHEET_QUERY } from "@/components/GlobalStylesheet";
import GsapRuntime, { KPF_GSAP_QUERY } from "@/components/GsapRuntime";
import PageDesignRenderer from "@/components/PageDesignRenderer";
import SeoHead from "@/components/SeoHead";
const { KPF_ACCESSIBILITY_QUERY } = require("@/lib/accessibility");
const { KPF_CODE_SNIPPETS_QUERY } = require("@/lib/codeSnippets");
const { KPF_SITE_CHROME_QUERY } = require("@/lib/siteChrome");

export default function FrontPageTemplate(props) {
  const seo = props?.data?.kpfSeoHome;
  const page = props?.data?.home;

  return (
    <>
      <GsapRuntime animations={props?.data?.kpfGsapAnimations} />
      <SeoHead seo={seo} />
      <PageDesignRenderer page={page} />
    </>
  );
}

FrontPageTemplate.query = gql`
  query GetHomeSeo {
    ${KPF_STYLESHEET_QUERY}
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
