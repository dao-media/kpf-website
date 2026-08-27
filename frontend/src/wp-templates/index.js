import dynamic from "next/dynamic";
import { gql } from "@apollo/client";

const {
  GET_HOME_PAGE,
  GET_ABOUT_PAGE,
  GET_CONTACT_PAGE,
  GET_EVENTS_PAGE,
  GET_BLOG_PAGE,
  GET_PRIVACY_PAGE,
  GET_PAGE,
  GET_POST,
  pageVariables,
} = require("./pageQueries");

/**
 * Faust treats next/dynamic templates as client-only (render.preload) and
 * skips SSR. Wrap the split module in a normal component so getWordPressProps
 * still sees .query / .variables and Next still code-splits the heavy UI.
 */
function bindTemplate(loader, query, variables) {
  const Inner = dynamic(loader);
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

const ContactPageTemplate = bindTemplate(
  () => import("./page-contact"),
  GET_CONTACT_PAGE,
  pageVariables,
);

const templates = {
  single: bindTemplate(() => import("./single"), GET_POST, pageVariables),
  page: bindTemplate(() => import("./page"), GET_PAGE, pageVariables),
  "front-page": bindTemplate(() => import("./front-page"), GET_HOME_PAGE),
  "page-about": bindTemplate(
    () => import("./page-about"),
    GET_ABOUT_PAGE,
    pageVariables,
  ),
  "page-contact": ContactPageTemplate,
  "page-contact-2": ContactPageTemplate,
  "page-events": bindTemplate(
    () => import("./page-events"),
    GET_EVENTS_PAGE,
    pageVariables,
  ),
  "page-blog": bindTemplate(
    () => import("./page-blog"),
    GET_BLOG_PAGE,
    pageVariables,
  ),
  "page-privacy": bindTemplate(
    () => import("./page-privacy"),
    GET_PRIVACY_PAGE,
    pageVariables,
  ),
};

export default templates;
