import { gql } from "@apollo/client";
import { KPF_EDITOR_BLOCKS_QUERY } from "@/components/BlockRenderer";
import { KPF_STYLESHEET_QUERY } from "@/components/GlobalStylesheet";
import GsapRuntime, { KPF_GSAP_QUERY } from "@/components/GsapRuntime";
import PageDesignRenderer from "@/components/PageDesignRenderer";
import SeoHead, { KPF_SEO_FRAGMENT } from "@/components/SeoHead";
const { KPF_ACCESSIBILITY_QUERY } = require("@/lib/accessibility");
const { KPF_SITE_CHROME_QUERY } = require("@/lib/siteChrome");

export default function PageTemplate(props) {
  const page = props?.data?.page;

  return (
    <>
      <GsapRuntime animations={props?.data?.kpfGsapAnimations} />
      <SeoHead seo={page?.kpfSeo} />
      <PageDesignRenderer page={page} />
    </>
  );
}

PageTemplate.query = gql`
  query GetPage($uri: ID!) {
    ${KPF_STYLESHEET_QUERY}
    ${KPF_SITE_CHROME_QUERY}
    ${KPF_ACCESSIBILITY_QUERY}
    ${KPF_GSAP_QUERY}
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
