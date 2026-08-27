const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  GET_HOME_PAGE,
  GET_ABOUT_PAGE,
  GET_CONTACT_PAGE,
  GET_EVENTS_PAGE,
  GET_BLOG_PAGE,
  GET_PRIVACY_PAGE,
  GET_PAGE,
} = require("./pageQueries");

function assertOmits(query, needles, label) {
  for (const needle of needles) {
    assert.doesNotMatch(
      query,
      needle,
      `${label} must not include ${needle}`,
    );
  }
}

describe("slug Faust page queries", () => {
  it("Home fetches partners, latest post, front page, and home SEO", () => {
    assert.match(GET_HOME_PAGE, /query GetHomePage/);
    assert.match(GET_HOME_PAGE, /kpfPartnerGrantees/);
    assert.match(GET_HOME_PAGE, /kpfLatestBlogPost/);
    assert.match(GET_HOME_PAGE, /kpfFrontPage/);
    assert.match(GET_HOME_PAGE, /kpfSeoHome/);
    assertOmits(
      GET_HOME_PAGE,
      [/kpfPageDesign/, /foundationEvents/, /kpfForm/, /editorBlocks/],
      "GetHomePage",
    );
  });

  it("keeps CSS bodies out of the page shell", () => {
    assert.match(GET_ABOUT_PAGE, /kpfStylesheetInfo/);
    assert.doesNotMatch(GET_ABOUT_PAGE, /\bkpfStylesheet\s*\{/);
  });

  it("About fetches grants, kevin, scrapbook — not events, blog, or design HTML", () => {
    assert.match(GET_ABOUT_PAGE, /query GetAboutPage/);
    assert.match(GET_ABOUT_PAGE, /kpfQuery\(slug: "grants"\)/);
    assert.match(GET_ABOUT_PAGE, /kpfKevinSlides/);
    assert.match(GET_ABOUT_PAGE, /kpfScrapbookTiles/);
    assert.match(GET_ABOUT_PAGE, /kpfScaffoldMedia\(prefixes: \["about\.", "cta\."\]\)/);
    assertOmits(
      GET_ABOUT_PAGE,
      [/foundationEvents/, /kpfPageDesign/, /kpfForm/, /kpfBlogPosts/, /editorBlocks/],
      "GetAboutPage",
    );
  });

  it("Contact fetches the contact form only", () => {
    assert.match(GET_CONTACT_PAGE, /query GetContactPage/);
    assert.match(GET_CONTACT_PAGE, /kpfForm\(slug: "contact"\)/);
    assertOmits(
      GET_CONTACT_PAGE,
      [/foundationEvents/, /kpfQuery/, /kpfKevinSlides/, /kpfPageDesign/, /kpfBlogPosts/],
      "GetContactPage",
    );
  });

  it("Events fetches foundationEvents only", () => {
    assert.match(GET_EVENTS_PAGE, /query GetEventsPage/);
    assert.match(GET_EVENTS_PAGE, /foundationEvents/);
    assert.match(GET_EVENTS_PAGE, /kpfScaffoldMedia\(prefixes: \["events\.", "cta\."\]\)/);
    assertOmits(
      GET_EVENTS_PAGE,
      [/kpfQuery/, /kpfKevinSlides/, /kpfPageDesign/, /kpfForm/, /kpfBlogPosts/],
      "GetEventsPage",
    );
  });

  it("Blog fetches posts, not Mustache design HTML", () => {
    assert.match(GET_BLOG_PAGE, /query GetBlogPage/);
    assert.match(GET_BLOG_PAGE, /kpfBlogPosts/);
    assertOmits(
      GET_BLOG_PAGE,
      [
        /kpfPageDesign/,
        /kpfBlogArchiveDesign/,
        /foundationEvents/,
        /kpfQuery\(slug: "grants"\)/,
        /kpfKevinSlides/,
        /kpfForm/,
      ],
      "GetBlogPage",
    );
  });

  it("Privacy fetches Gutenberg content, not design HTML", () => {
    assert.match(GET_PRIVACY_PAGE, /query GetPrivacyPage/);
    assert.match(GET_PRIVACY_PAGE, /^\s+content$/m);
    assertOmits(
      GET_PRIVACY_PAGE,
      [/kpfPageDesign/, /foundationEvents/, /kpfBlogPosts/, /kpfForm/],
      "GetPrivacyPage",
    );
  });

  it("fallback GetPage fetches Gutenberg content, not Mustache design HTML", () => {
    assert.match(GET_PAGE, /query GetPage/);
    assert.match(GET_PAGE, /^\s+content$/m);
    assertOmits(
      GET_PAGE,
      [
        /kpfPageDesign/,
        /kpfDesignFields/,
        /foundationEvents/,
        /kpfQuery\(slug: "grants"\)/,
        /kpfKevinSlides/,
        /kpfBlogPosts/,
        /editorBlocks/,
      ],
      "GetPage",
    );
  });
});
