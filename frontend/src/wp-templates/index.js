import dynamic from "next/dynamic";
import { gql } from "@apollo/client";
import FrontPageTemplate from "./front-page";
import AboutPageTemplate from "./page-about";
import ContactPageTemplateModule from "./page-contact";
import EventsPageTemplate from "./page-events";
import BlogPageTemplate from "./page-blog";
import PrivacyPageTemplate from "./page-privacy";

const {
  GET_PAGE,
  GET_POST,
  pageVariables,
} = require("./pageQueries");

/**
 * Faust treats next/dynamic templates as client-only (render.preload) and
 * skips SSR. Wrap the split module in a normal component so getWordPressProps
 * still sees .query / .variables and Next still code-splits the heavy UI.
 *
 * Primary marketing pages stay static imports (same as Home). A dynamic
 * chunk hydrates as empty <main>, then fills in — the ink footer flashes
 * under the fixed header (PSI CLS / visible FOUC).
 *
 * Generic page + single post stay code-split with a viewport-tall loading
 * shell so client nav cannot collapse main either.
 */
function PageLoadingShell() {
  return <div className="kpf-page-loading" aria-hidden="true" />;
}

function bindTemplate(loader, query, variables) {
  const Inner = dynamic(loader, {
    loading: PageLoadingShell,
  });
  function Template(props) {
    return <Inner {...props} />;
  }
  Template.query = gql`
    ${query}
  `;
  if (variables) {
    Template.variables = variables;
  }
  return Template;
}

const ContactPageTemplate = ContactPageTemplateModule;

const templates = {
  single: bindTemplate(() => import("./single"), GET_POST, pageVariables),
  page: bindTemplate(() => import("./page"), GET_PAGE, pageVariables),
  "front-page": FrontPageTemplate,
  "page-about": AboutPageTemplate,
  "page-contact": ContactPageTemplate,
  "page-contact-2": ContactPageTemplate,
  "page-events": EventsPageTemplate,
  "page-blog": BlogPageTemplate,
  "page-privacy": PrivacyPageTemplate,
};

export default templates;
