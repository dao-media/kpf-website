import { gql } from "@apollo/client";
import { KPF_STYLESHEET_QUERY } from "@/components/GlobalStylesheet";
import GsapRuntime, { KPF_GSAP_QUERY } from "@/components/GsapRuntimeGate";
import HomePageScaffold from "@/components/HomePageScaffold";
import SeoHead from "@/components/SeoHead";
const { KPF_ACCESSIBILITY_QUERY } = require("@/lib/accessibility");
const { KPF_CODE_SNIPPETS_QUERY } = require("@/lib/codeSnippets");
const { KPF_LATEST_BLOG_POST_QUERY } = require("@/lib/latestBlogPost");
const { KPF_PARTNER_GRANTEES_QUERY } = require("@/lib/partnerGrantees");
const { KPF_SITE_CHROME_QUERY } = require("@/lib/siteChrome");
const {
  KPF_SCAFFOLD_MEDIA_QUERY,
  scaffoldMediaMap,
} = require("@/lib/scaffoldMedia");
const { fallbackPartners } = require("@/lib/wpContentFallback");

export default function FrontPageTemplate(props) {
  const seo = props?.data?.kpfSeoHome;
  const media = scaffoldMediaMap(props?.data?.kpfScaffoldMedia);
  const partnerGrantees = fallbackPartners(props?.data?.kpfPartnerGrantees || []);
  const latestBlogPost = props?.data?.kpfLatestBlogPost || null;

  return (
    <>
      <GsapRuntime animations={props?.data?.kpfGsapAnimations} />
      <SeoHead seo={seo} />
      <HomePageScaffold
        media={media}
        partnerGrantees={partnerGrantees}
        latestBlogPost={latestBlogPost}
      />
    </>
  );
}

FrontPageTemplate.query = gql`
  query GetHomeSeo {
    ${KPF_STYLESHEET_QUERY}
    ${KPF_SCAFFOLD_MEDIA_QUERY}
    ${KPF_PARTNER_GRANTEES_QUERY}
    ${KPF_LATEST_BLOG_POST_QUERY}
    ${KPF_SITE_CHROME_QUERY}
    ${KPF_ACCESSIBILITY_QUERY}
    ${KPF_CODE_SNIPPETS_QUERY}
    ${KPF_GSAP_QUERY}
    home: kpfFrontPage {
      id
      databaseId
      title
      slug
      uri
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
