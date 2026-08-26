import GsapRuntime from "@/components/GsapRuntimeGate";
import PageScaffold from "@/components/PageScaffold";
import SeoHead from "@/components/SeoHead";
const { scaffoldMediaMap } = require("@/lib/scaffoldMedia");
const { normalizeGrantQueryItems } = require("@/lib/grantsQuery");
const { normalizeScrapbookTiles } = require("@/lib/scrapbookTiles");
const {
  fallbackForm,
  fallbackGrants,
  fallbackGrantsTotal,
  fallbackScrapbook,
  fallbackKevin,
  fallbackEvents,
} = require("@/lib/wpContentFallback");

/**
 * Shared Faust page renderer. Each wp-template supplies its own query.
 */
export default function PageFromFaust(props) {
  const page = props?.data?.page;
  const media = scaffoldMediaMap(props?.data?.kpfScaffoldMedia);
  const contactForm = fallbackForm(props?.data?.kpfForm || null);
  const kevinSlides = fallbackKevin(props?.data?.kpfKevinSlides || []);
  const grants = fallbackGrants(normalizeGrantQueryItems(props?.data?.kpfQuery));
  const grantsTotal = fallbackGrantsTotal(
    String(props?.data?.kpfGrantsTotal?.label || "").trim(),
  );
  const scrapbookTiles = fallbackScrapbook(
    normalizeScrapbookTiles(props?.data?.kpfScrapbookTiles),
  );
  const events = fallbackEvents(props?.data?.foundationEvents?.nodes || []);
  const posts = props?.data?.kpfBlogPosts || null;

  return (
    <>
      <GsapRuntime animations={props?.data?.kpfGsapAnimations} />
      <SeoHead seo={page?.kpfSeo} />
      <PageScaffold
        key={page?.databaseId || page?.slug || page?.uri || "page"}
        page={page}
        media={media}
        contactForm={contactForm}
        kevinSlides={kevinSlides}
        grants={grants}
        grantsTotal={grantsTotal}
        scrapbookTiles={scrapbookTiles}
        events={events}
        posts={posts}
      />
    </>
  );
}

export function pageVariables(seedQuery) {
  return {
    uri: seedQuery?.uri,
  };
}
