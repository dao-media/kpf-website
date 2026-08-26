import SingleTemplate from "./single";
import PageTemplate from "./page";
import FrontPageTemplate from "./front-page";
import AboutPageTemplate from "./page-about";
import ContactPageTemplate from "./page-contact";
import EventsPageTemplate from "./page-events";
import BlogPageTemplate from "./page-blog";
import PrivacyPageTemplate from "./page-privacy";

const templates = {
  single: SingleTemplate,
  page: PageTemplate,
  "front-page": FrontPageTemplate,
  "page-about": AboutPageTemplate,
  "page-contact": ContactPageTemplate,
  "page-contact-2": ContactPageTemplate,
  "page-events": EventsPageTemplate,
  "page-blog": BlogPageTemplate,
  "page-privacy": PrivacyPageTemplate,
};

export default templates;
