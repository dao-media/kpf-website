import { gql } from "@apollo/client";
import dynamic from "next/dynamic";
import { KPF_EDITOR_BLOCKS_QUERY } from "@/components/BlockRenderer";
import { KPF_STYLESHEET_QUERY } from "@/components/GlobalStylesheet";
import GsapRuntime, { KPF_GSAP_QUERY } from "@/components/GsapRuntimeGate";
import SeoHead, { KPF_SEO_FRAGMENT } from "@/components/SeoHead";

const BlogPostScaffold = dynamic(() => import("@/components/BlogPostScaffold"));
const PageDesignRenderer = dynamic(() => import("@/components/PageDesignRenderer"));
const { KPF_ACCESSIBILITY_QUERY } = require("@/lib/accessibility");
const { KPF_BLOG_POSTS_QUERY } = require("@/lib/blogPosts");
const { KPF_CODE_SNIPPETS_QUERY } = require("@/lib/codeSnippets");
const {
  KPF_SCAFFOLD_MEDIA_QUERY,
  scaffoldMediaMap,
} = require("@/lib/scaffoldMedia");
const { KPF_SITE_CHROME_QUERY } = require("@/lib/siteChrome");

export default function SingleTemplate(props) {
  const post = props?.data?.post;
  const media = scaffoldMediaMap(props?.data?.kpfScaffoldMedia);
  const relatedPosts = props?.data?.kpfBlogPosts || null;
  const design = props?.data?.kpfBlogPostDesign;

  return (
    <>
      <GsapRuntime animations={props?.data?.kpfGsapAnimations} />
      <SeoHead seo={post?.kpfSeo} />
      {design?.html ? (
        <PageDesignRenderer
          page={{ ...post, kpfPageDesign: design }}
          postSource={post}
          relatedPosts={relatedPosts}
        />
      ) : (
        <BlogPostScaffold
          post={post}
          relatedPosts={relatedPosts}
          media={media}
        />
      )}
    </>
  );
}

SingleTemplate.query = gql`
  query GetPost($uri: ID!) {
    ${KPF_STYLESHEET_QUERY}
    ${KPF_SCAFFOLD_MEDIA_QUERY}
    ${KPF_SITE_CHROME_QUERY}
    ${KPF_ACCESSIBILITY_QUERY}
    ${KPF_CODE_SNIPPETS_QUERY}
    ${KPF_GSAP_QUERY}
    ${KPF_BLOG_POSTS_QUERY}
    kpfBlogPostDesign: kpfDesignTemplate(postType: "post", view: "singular") {
      databaseId
      title
      html
      css
    }
    post(id: $uri, idType: URI) {
      id
      databaseId
      title
      content
      date
      uri
      slug
      commentStatus
      ${KPF_EDITOR_BLOCKS_QUERY}
      ${KPF_SEO_FRAGMENT}
      author {
        node {
          name
          firstName
          lastName
        }
      }
      categories {
        nodes {
          name
          slug
        }
      }
      featuredImage {
        node {
          sourceUrl
          altText
        }
      }
      comments(first: 20) {
        nodes {
          id
          databaseId
          content
          date
          author {
            node {
              name
            }
          }
        }
      }
    }
  }
`;

SingleTemplate.variables = (seedQuery) => {
  return {
    uri: seedQuery?.uri,
  };
};
