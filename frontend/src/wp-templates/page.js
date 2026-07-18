import { gql } from "@apollo/client";
import GlobalStylesheet, {
  KPF_STYLESHEET_QUERY,
} from "@/components/GlobalStylesheet";
import GsapRuntime, { KPF_GSAP_QUERY } from "@/components/GsapRuntime";
import PageDesignRenderer from "@/components/PageDesignRenderer";
import SeoHead, { KPF_SEO_FRAGMENT } from "@/components/SeoHead";

export default function PageTemplate(props) {
  const page = props?.data?.page;

  return (
    <>
      <GlobalStylesheet css={props?.data?.kpfStylesheet} />
      <GsapRuntime animations={props?.data?.kpfGsapAnimations} />
      <SeoHead seo={page?.kpfSeo} />
      <PageDesignRenderer page={page} />
    </>
  );
}

PageTemplate.query = gql`
  query GetPage($uri: ID!) {
    ${KPF_STYLESHEET_QUERY}
    ${KPF_GSAP_QUERY}
    page(id: $uri, idType: URI) {
      id
      databaseId
      title
      content
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
