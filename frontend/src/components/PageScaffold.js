import AboutPageScaffold from "@/components/AboutPageScaffold";
import ContactPageScaffold from "@/components/ContactPageScaffold";
import EventsPageScaffold from "@/components/EventsPageScaffold";
import PageDesignRenderer from "@/components/PageDesignRenderer";
import { useRouter } from "next/router";

/**
 * Prefer slug-matched React scaffolds (interactive 1:1 builds);
 * fall back to CMS design HTML when no scaffold exists.
 *
 * Route path wins over `page.slug` so a stalled Faust template query cannot
 * leave the previous scaffold on screen after client-side nav.
 */
export default function PageScaffold({
  page,
  media = {},
  contactForm = null,
  kevinSlides = [],
  grants = [],
  grantsTotal = "",
  scrapbookTiles = [],
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
    return <EventsPageScaffold media={media} />;
  }

  if (slug === "contact" || slug === "contact-2") {
    return <ContactPageScaffold form={contactForm} />;
  }

  if (page?.kpfPageDesign?.html) {
    return <PageDesignRenderer page={page} grantsTotal={grantsTotal} />;
  }

  return <PageDesignRenderer page={page} grantsTotal={grantsTotal} />;
}
