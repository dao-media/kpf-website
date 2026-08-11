import AboutPageScaffold from "@/components/AboutPageScaffold";
import ContactPageScaffold from "@/components/ContactPageScaffold";
import EventsPageScaffold from "@/components/EventsPageScaffold";
import PageDesignRenderer from "@/components/PageDesignRenderer";

/**
 * Prefer CMS design HTML when Ready; otherwise slug-matched React scaffolds.
 */
export default function PageScaffold({ page, media = {}, contactForm = null }) {
  if (page?.kpfPageDesign?.html) {
    return <PageDesignRenderer page={page} />;
  }

  const slug = String(page?.slug || "")
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "");

  if (slug === "about") {
    return <AboutPageScaffold media={media} />;
  }

  if (slug === "events") {
    return <EventsPageScaffold media={media} />;
  }

  if (slug === "contact" || slug === "contact-2") {
    return <ContactPageScaffold form={contactForm} />;
  }

  return <PageDesignRenderer page={page} />;
}
