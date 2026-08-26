const {
  KPF_PAGE_SHELL_QUERY,
  KPF_PAGE_NODE_CORE,
} = require("./pageChrome");
const { KPF_GRANTS_QUERY, KPF_GRANTS_TOTAL_QUERY } = require("../lib/grantsQuery");
const { KPF_SCRAPBOOK_TILES_QUERY } = require("../lib/scrapbookTiles");
const { KPF_EVENTS_QUERY } = require("../lib/eventsQuery");
const { KPF_BLOG_POSTS_QUERY } = require("../lib/blogPosts");
const { scaffoldMediaQuery } = require("../lib/scaffoldMedia");

const KPF_KEVIN_SLIDES_QUERY = `
  kpfKevinSlides(first: 12) {
    databaseId
    header
    body
    imageUrl
    imageAlt
    menuOrder
  }
`;

const KPF_CONTACT_FORM_QUERY = `
  kpfForm(slug: "contact") {
    databaseId
    title
    slug
    definitionJson
  }
`;

const GET_ABOUT_PAGE = `
  query GetAboutPage($uri: ID!) {
    ${KPF_PAGE_SHELL_QUERY}
    ${scaffoldMediaQuery(["about.", "cta."])}
    ${KPF_GRANTS_QUERY}
    ${KPF_GRANTS_TOTAL_QUERY}
    ${KPF_SCRAPBOOK_TILES_QUERY}
    ${KPF_KEVIN_SLIDES_QUERY}
    page(id: $uri, idType: URI) {
      ${KPF_PAGE_NODE_CORE}
    }
  }
`;

const GET_CONTACT_PAGE = `
  query GetContactPage($uri: ID!) {
    ${KPF_PAGE_SHELL_QUERY}
    ${scaffoldMediaQuery(["cta."])}
    ${KPF_CONTACT_FORM_QUERY}
    page(id: $uri, idType: URI) {
      ${KPF_PAGE_NODE_CORE}
    }
  }
`;

const GET_EVENTS_PAGE = `
  query GetEventsPage($uri: ID!) {
    ${KPF_PAGE_SHELL_QUERY}
    ${scaffoldMediaQuery(["events.", "cta."])}
    ${KPF_EVENTS_QUERY}
    page(id: $uri, idType: URI) {
      ${KPF_PAGE_NODE_CORE}
    }
  }
`;

const GET_BLOG_PAGE = `
  query GetBlogPage($uri: ID!) {
    ${KPF_PAGE_SHELL_QUERY}
    ${scaffoldMediaQuery(["cta."])}
    ${KPF_BLOG_POSTS_QUERY}
    page(id: $uri, idType: URI) {
      ${KPF_PAGE_NODE_CORE}
    }
  }
`;

const GET_PRIVACY_PAGE = `
  query GetPrivacyPage($uri: ID!) {
    ${KPF_PAGE_SHELL_QUERY}
    page(id: $uri, idType: URI) {
      ${KPF_PAGE_NODE_CORE}
      content
    }
  }
`;

const GET_PAGE = `
  query GetPage($uri: ID!) {
    ${KPF_PAGE_SHELL_QUERY}
    page(id: $uri, idType: URI) {
      ${KPF_PAGE_NODE_CORE}
      content
    }
  }
`;

module.exports = {
  GET_ABOUT_PAGE,
  GET_CONTACT_PAGE,
  GET_EVENTS_PAGE,
  GET_BLOG_PAGE,
  GET_PRIVACY_PAGE,
  GET_PAGE,
};
