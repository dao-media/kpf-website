import dynamic from "next/dynamic";
import { useRouter } from "next/router";

const AboutPageScaffold = dynamic(() => import("@/components/AboutPageScaffold"));
const BlogPageScaffold = dynamic(() => import("@/components/BlogPageScaffold"));
const ContactPageScaffold = dynamic(() => import("@/components/ContactPageScaffold"));
const EventsPageScaffold = dynamic(() => import("@/components/EventsPageScaffold"));
const PageDesignRenderer = dynamic(() => import("@/components/PageDesignRenderer"));
const PrivacyPageScaffold = dynamic(() => import("@/components/PrivacyPageScaffold"));

/**
 * Prefer slug-matched React scaffolds (interactive 1:1 builds);
 * fall back to CMS design HTML when no scaffold exists.
 *
 * Route path wins over `page.slug` so a stalled Faust template query cannot
 * leave the previous scaffold on screen after client-side nav.
 *
 * Scaffolds are next/dynamic so Faust’s shared template graph does not
 * download About/Events/Blog GSAP (CustomEase, history carousel, DrawSVG)
 * on pages that never mount those trees.
 */
export default function PageScaffold({
  page,
  media = {},
  contactForm = null,
  kevinSlides = [],
  grants = [],
  grantsTotal = "",
  scrapbookTiles = [],
  events = [],
  posts = null,
  blogArchiveDesign = null,
}) {
  const router = useRouter();
  const routeSlug = String(router?.asPath || "")
    .split(/[?#]/)[0]
    .replace(/^\/+|\/+$/g, "")
    .split("/")[0]
    .toLowerCase();
  const pageSlug = String(page?.slug || "")
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");
  const slug = routeSlug || pageSlug;

  if (slug === "about") {
    return (
      <AboutPageScaffold
        media={media}
        kevinSlides={kevinSlides}
        grants={grants}
        grantsTotal={grantsTotal}
        scrapbookTiles={scrapbookTiles}
      />
    );
  }

  if (slug === "events") {
    return <EventsPageScaffold media={media} events={events} />;
  }

  if (slug === "blog") {
    const design = page?.kpfPageDesign?.html
      ? page.kpfPageDesign
      : blogArchiveDesign?.html
        ? blogArchiveDesign
        : null;
    if (design) {
      return (
        <PageDesignRenderer
          page={{ ...page, kpfPageDesign: design }}
          posts={posts}
        />
      );
    }
    return <BlogPageScaffold media={media} posts={posts} />;
  }

  if (slug === "privacy") {
    return <PrivacyPageScaffold page={page} />;
  }

  if (slug === "contact" || slug === "contact-2") {
    return <ContactPageScaffold form={contactForm} media={media} />;
  }

  if (page?.kpfPageDesign?.html) {
    return <PageDesignRenderer page={page} grantsTotal={grantsTotal} />;
  }

  return <PageDesignRenderer page={page} grantsTotal={grantsTotal} />;
}
