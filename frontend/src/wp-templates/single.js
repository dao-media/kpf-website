import { gql } from "@apollo/client";
import GsapRuntime, { KPF_GSAP_QUERY } from "@/components/GsapRuntime";
import SeoHead, { KPF_SEO_FRAGMENT } from "@/components/SeoHead";
import WordPressContent from "@/components/WordPressContent";

export default function SingleTemplate(props) {
  const post = props?.data?.post;

  return (
    <>
      <GsapRuntime animations={props?.data?.kpfGsapAnimations} />
      <SeoHead seo={post?.kpfSeo} />
      <WordPressContent title={post?.title} content={post?.content} />
    </>
  );
}

SingleTemplate.query = gql`
  query GetPost($uri: ID!) {
    ${KPF_GSAP_QUERY}
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
