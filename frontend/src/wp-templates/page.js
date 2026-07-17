import { gql } from "@apollo/client";
import SeoHead, { KPF_SEO_FRAGMENT } from "@/components/SeoHead";
import WordPressContent from "@/components/WordPressContent";

export default function PageTemplate(props) {
  const page = props?.data?.page;

  return (
    <>
      <SeoHead seo={page?.kpfSeo} />
      <WordPressContent title={page?.title} content={page?.content} />
    </>
  );
}

PageTemplate.query = gql`
  query GetPage($uri: ID!) {
    page(id: $uri, idType: URI) {
      id
      title
      content
      ${KPF_SEO_FRAGMENT}
    }
  }
`;

PageTemplate.variables = (seedQuery) => {
  return {
    uri: seedQuery?.uri,
  };
};
