const { KPF_STYLESHEET_QUERY } = require("../lib/globalStylesheet");
const { KPF_SEO_FRAGMENT } = require("../lib/seoFragment");
const { KPF_GSAP_QUERY } = require("../lib/gsapQuery");
const { KPF_ACCESSIBILITY_QUERY } = require("../lib/accessibility");
const { KPF_CODE_SNIPPETS_QUERY } = require("../lib/codeSnippets");
const { KPF_SITE_CHROME_QUERY } = require("../lib/siteChrome");

/** Chrome every public page still needs. Scaffold media is queried per slug. */
const KPF_PAGE_SHELL_QUERY = `
  ${KPF_STYLESHEET_QUERY}
  ${KPF_SITE_CHROME_QUERY}
  ${KPF_ACCESSIBILITY_QUERY}
  ${KPF_CODE_SNIPPETS_QUERY}
  ${KPF_GSAP_QUERY}
`;

const KPF_PAGE_NODE_CORE = `
      id
      databaseId
      title
      excerpt
      slug
      uri
      link
      date
      modified
      ${KPF_SEO_FRAGMENT}
`;

const KPF_PAGE_DESIGN_FALLBACK = `
      kpfPageDesign {
        databaseId
        title
        html
        css
        source
        queries {
          slug
          title
          items {
            databaseId
            title
            excerpt
            link
            uri
            slug
            date
            featuredImage {
              url
              alt
            }
            recipientName
            blurb
            grantAmountLabel
            awardedLabel
            checkPhotoUrl
            logoUrl
            website
          }
          pagination {
            page
            perPage
            total
            totalPages
            hasNext
            hasPrevious
            enabled
          }
        }
        forms {
          databaseId
          title
          slug
          definitionJson
        }
      }
      kpfDesignFields {
        key
        value
      }
`;

const KPF_PAGE_DESIGN_HTML = `
      kpfPageDesign {
        databaseId
        title
        html
        css
        source
      }
`;

module.exports = {
  KPF_PAGE_SHELL_QUERY,
  KPF_PAGE_NODE_CORE,
  KPF_PAGE_DESIGN_FALLBACK,
  KPF_PAGE_DESIGN_HTML,
};
