import { gql } from "@apollo/client";
import GsapRuntime from "@/components/GsapRuntimeGate";
import HomePageScaffold from "@/components/HomePageScaffold";
import SeoHead from "@/components/SeoHead";
const { scaffoldMediaMap } = require("@/lib/scaffoldMedia");
const { fallbackPartners } = require("@/lib/wpContentFallback");
const { GET_HOME_PAGE } = require("./pageQueries");

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
  ${GET_HOME_PAGE}
`;
