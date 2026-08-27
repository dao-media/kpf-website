import { gql } from "@apollo/client";
import BlogPostScaffold from "@/components/BlogPostScaffold";
import GsapRuntime from "@/components/GsapRuntimeGate";
import SeoHead from "@/components/SeoHead";
const { scaffoldMediaMap } = require("@/lib/scaffoldMedia");
const { GET_POST, pageVariables } = require("./pageQueries");

export default function SingleTemplate(props) {
  const post = props?.data?.post;
  const media = scaffoldMediaMap(props?.data?.kpfScaffoldMedia);
  const relatedPosts = props?.data?.kpfBlogPosts || null;

  return (
    <>
      <GsapRuntime animations={props?.data?.kpfGsapAnimations} />
      <SeoHead seo={post?.kpfSeo} />
      <BlogPostScaffold
        post={post}
        relatedPosts={relatedPosts}
        media={media}
      />
    </>
  );
}

SingleTemplate.query = gql`
  ${GET_POST}
`;

SingleTemplate.variables = pageVariables;
