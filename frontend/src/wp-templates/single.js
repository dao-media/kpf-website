import { gql } from "@apollo/client";
import SeoHead, { KPF_SEO_FRAGMENT } from "@/components/SeoHead";
import WordPressContent from "@/components/WordPressContent";

export default function SingleTemplate(props) {
  const post = props?.data?.post;

  return (
    <>
      <SeoHead seo={post?.kpfSeo} />
      <WordPressContent title={post?.title} content={post?.content} />
    </>
  );
}

SingleTemplate.query = gql`
  query GetPost($uri: ID!) {
    post(id: $uri, idType: URI) {
      id
      title
      content
      ${KPF_SEO_FRAGMENT}
    }
  }
`;

SingleTemplate.variables = (seedQuery) => {
  return {
    uri: seedQuery?.uri,
  };
};
