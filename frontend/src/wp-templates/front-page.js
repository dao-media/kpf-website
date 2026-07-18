import { gql } from "@apollo/client";
import GsapRuntime, { KPF_GSAP_QUERY } from "@/components/GsapRuntime";
import SeoHead from "@/components/SeoHead";
import WordPressContent from "@/components/WordPressContent";

export default function FrontPageTemplate(props) {
  const seo = props?.data?.kpfSeoHome;
  const page = props?.data?.home;

  return (
    <>
      <GsapRuntime animations={props?.data?.kpfGsapAnimations} />
      <SeoHead seo={seo} />
      <WordPressContent title={page?.title} content={page?.content} />
    </>
  );
}

FrontPageTemplate.query = gql`
  query GetHomeSeo {
    ${KPF_GSAP_QUERY}
    home: kpfFrontPage {
      title
      content
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
