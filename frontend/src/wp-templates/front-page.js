import { gql } from "@apollo/client";
import SeoHead from "@/components/SeoHead";
import WordPressContent from "@/components/WordPressContent";

export default function FrontPageTemplate(props) {
  const seo = props?.data?.kpfSeoHome;
  const page = props?.data?.home;

  return (
    <>
      <SeoHead seo={seo} />
      <WordPressContent title={page?.title} content={page?.content} />
    </>
  );
}

FrontPageTemplate.query = gql`
  query GetHomeSeo {
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
