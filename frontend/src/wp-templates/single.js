import { gql } from "@apollo/client";
import { KPF_EDITOR_BLOCKS_QUERY } from "@/components/BlockRenderer";
import GlobalStylesheet, {
  KPF_STYLESHEET_QUERY,
} from "@/components/GlobalStylesheet";
import GsapRuntime, { KPF_GSAP_QUERY } from "@/components/GsapRuntime";
import SeoHead, { KPF_SEO_FRAGMENT } from "@/components/SeoHead";
import WordPressContent from "@/components/WordPressContent";

export default function SingleTemplate(props) {
  const post = props?.data?.post;

  return (
    <>
      <GlobalStylesheet css={props?.data?.kpfStylesheet} />
      <GsapRuntime animations={props?.data?.kpfGsapAnimations} />
      <SeoHead seo={post?.kpfSeo} />
      <WordPressContent
        title={post?.title}
        content={post?.content}
        blocks={post?.editorBlocks}
      />
    </>
  );
}

SingleTemplate.query = gql`
  query GetPost($uri: ID!) {
    ${KPF_STYLESHEET_QUERY}
    ${KPF_GSAP_QUERY}
    post(id: $uri, idType: URI) {
      id
      title
      content
      ${KPF_EDITOR_BLOCKS_QUERY}
      ${KPF_SEO_FRAGMENT}
    }
  }
`;

SingleTemplate.variables = (seedQuery) => {
  return {
    uri: seedQuery?.uri,
  };
};
