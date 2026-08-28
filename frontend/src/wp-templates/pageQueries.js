const {
  KPF_PAGE_SHELL_QUERY,
  KPF_PAGE_SHELL_WITH_GSAP_QUERY,
  KPF_PAGE_NODE_CORE,
} = require("./pageChrome");
const { KPF_GRANTS_QUERY, KPF_GRANTS_TOTAL_QUERY } = require("../lib/grantsQuery");
const { KPF_SCRAPBOOK_TILES_QUERY } = require("../lib/scrapbookTiles");
const { KPF_EVENTS_QUERY } = require("../lib/eventsQuery");
const { KPF_BLOG_POSTS_QUERY } = require("../lib/blogPosts");
const { KPF_SCAFFOLD_MEDIA_QUERY, scaffoldMediaQuery } = require("../lib/scaffoldMedia");
const { KPF_PARTNER_GRANTEES_QUERY } = require("../lib/partnerGrantees");
const { KPF_LATEST_BLOG_POST_QUERY } = require("../lib/latestBlogPost");
const { KPF_STYLESHEET_QUERY } = require("../lib/globalStylesheet");
const { KPF_SITE_CHROME_QUERY } = require("../lib/siteChrome");
const { KPF_ACCESSIBILITY_QUERY } = require("../lib/accessibility");
const { KPF_CODE_SNIPPETS_QUERY } = require("../lib/codeSnippets");
const { KPF_GSAP_QUERY } = require("../lib/gsapQuery");
const { KPF_SEO_FRAGMENT } = require("../lib/seoFragment");
const { KPF_EDITOR_BLOCKS_QUERY } = require("../lib/editorBlocksQuery");

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

const GET_HOME_PAGE = `
  query GetHomePage {
    ${KPF_PAGE_SHELL_WITH_GSAP_QUERY}
    ${KPF_SCAFFOLD_MEDIA_QUERY}
    ${KPF_PARTNER_GRANTEES_QUERY}
    ${KPF_LATEST_BLOG_POST_QUERY}
    home: kpfFrontPage {
      id
      databaseId
      title
      slug
      uri
    }
    kpfSeoHome {
      title
      description
      canonical
      robots {
        index
        follow
        noarchive
        nosnippet
      }
      openGraph {
        title
        description
        imageUrl
        type
        url
      }
      twitter {
        card
        site
        title
        description
        imageUrl
      }
      customMeta {
        name
        property
        content
        rel
        href
        media
      }
      schemaJson
    }
  }
`;

const GET_ABOUT_PAGE = `
  query GetAboutPage($uri: ID!) {
    ${KPF_PAGE_SHELL_WITH_GSAP_QUERY}
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
    ${KPF_PAGE_SHELL_WITH_GSAP_QUERY}
    ${scaffoldMediaQuery(["cta."])}
    ${KPF_CONTACT_FORM_QUERY}
    page(id: $uri, idType: URI) {
      ${KPF_PAGE_NODE_CORE}
    }
  }
`;

const GET_EVENTS_PAGE = `
  query GetEventsPage($uri: ID!) {
    ${KPF_PAGE_SHELL_WITH_GSAP_QUERY}
    ${scaffoldMediaQuery(["events.", "cta."])}
    ${KPF_EVENTS_QUERY}
    page(id: $uri, idType: URI) {
      ${KPF_PAGE_NODE_CORE}
    }
  }
`;

const GET_BLOG_PAGE = `
  query GetBlogPage($uri: ID!) {
    ${KPF_PAGE_SHELL_WITH_GSAP_QUERY}
    ${scaffoldMediaQuery(["cta."])}
    ${KPF_BLOG_POSTS_QUERY}
    page(id: $uri, idType: URI) {
      ${KPF_PAGE_NODE_CORE}
    }
  }
`;

const GET_PRIVACY_PAGE = `
  query GetPrivacyPage($uri: ID!) {
    ${KPF_PAGE_SHELL_WITH_GSAP_QUERY}
    page(id: $uri, idType: URI) {
      ${KPF_PAGE_NODE_CORE}
      content
    }
  }
`;

const GET_PAGE = `
  query GetPage($uri: ID!) {
    ${KPF_PAGE_SHELL_WITH_GSAP_QUERY}
    page(id: $uri, idType: URI) {
      ${KPF_PAGE_NODE_CORE}
      content
    }
  }
`;

const GET_POST = `
  query GetPost($uri: ID!) {
    ${KPF_STYLESHEET_QUERY}
    ${scaffoldMediaQuery(["cta."])}
    ${KPF_SITE_CHROME_QUERY}
    ${KPF_ACCESSIBILITY_QUERY}
    ${KPF_CODE_SNIPPETS_QUERY}
    ${KPF_GSAP_QUERY}
    ${KPF_BLOG_POSTS_QUERY}
    post(id: $uri, idType: URI) {
      id
      databaseId
      title
      content
      date
      uri
      slug
      commentStatus
      ${KPF_EDITOR_BLOCKS_QUERY}
      ${KPF_SEO_FRAGMENT}
      author {
        node {
          name
          firstName
          lastName
        }
      }
      categories {
        nodes {
          name
          slug
        }
      }
      featuredImage {
        node {
          sourceUrl
          altText
        }
      }
      comments(first: 20) {
        nodes {
          id
          databaseId
          content
          date
          author {
            node {
              name
            }
          }
        }
      }
    }
  }
`;

function pageVariables(seedQuery) {
  return {
    uri: seedQuery?.uri,
  };
}

module.exports = {
  GET_HOME_PAGE,
  GET_ABOUT_PAGE,
  GET_CONTACT_PAGE,
  GET_EVENTS_PAGE,
  GET_BLOG_PAGE,
  GET_PRIVACY_PAGE,
  GET_PAGE,
  GET_POST,
  pageVariables,
};
