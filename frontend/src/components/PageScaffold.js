import AboutPageScaffold from "@/components/AboutPageScaffold";
import ContactPageScaffold from "@/components/ContactPageScaffold";
import EventsPageScaffold from "@/components/EventsPageScaffold";
import PageDesignRenderer from "@/components/PageDesignRenderer";

/**
 * Prefer slug-matched React scaffolds (interactive 1:1 builds);
 * fall back to CMS design HTML when no scaffold exists.
 */
export default function PageScaffold({ page, media = {}, contactForm = null }) {
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

  if (page?.kpfPageDesign?.html) {
    return <PageDesignRenderer page={page} />;
  }

  return <PageDesignRenderer page={page} />;
}
