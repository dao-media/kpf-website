const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  renderDesignTemplate,
} = require("./pageDesignTemplate");

describe("page design templates", () => {
  const model = {
    page: {
      title: 'Kevin & <Friends>',
      content: "<p>Trusted WordPress content</p>",
      featuredImage: { url: "https://example.test/image.jpg" },
    },
    fields: { heading: "Custom heading" },
  };

  it("escapes ordinary placeholders", () => {
    assert.equal(
      renderDesignTemplate("<h1>{{page.title}}</h1>", model),
      "<h1>Kevin &amp; &lt;Friends&gt;</h1>",
    );
  });

  it("allows raw rendered WordPress content only", () => {
    assert.equal(
      renderDesignTemplate("<main>{{{page.content}}}</main>", model),
      "<main><p>Trusted WordPress content</p></main>",
    );
    assert.equal(
      renderDesignTemplate("{{{page.title}}}", model),
      "Kevin &amp; &lt;Friends&gt;",
    );
  });

  it("does not process placeholder-like text inside WordPress content", () => {
    assert.equal(
      renderDesignTemplate("{{{page.content}}}", {
        page: { content: "<code>{{example}}</code>" },
      }),
      "<code>{{example}}</code>",
    );
  });

  it("supports custom and nested fields", () => {
    assert.equal(
      renderDesignTemplate(
        '<img src="{{page.featuredImage.url}}"><h2>{{fields.heading}}</h2>',
        model,
      ),
      '<img src="https://example.test/image.jpg"><h2>Custom heading</h2>',
    );
  });

  it("does not double-escape pre-encoded field values into visible entity codes", () => {
    assert.equal(
      renderDesignTemplate("<p>{{fields.heading}}</p>", {
        fields: { heading: "Kevin&#039;s &amp; friends" },
      }),
      "<p>Kevin&#039;s &amp; friends</p>",
    );
    assert.equal(
      renderDesignTemplate("<p>{{fields.heading}}</p>", {
        fields: { heading: "Kevin's — “quote”" },
      }),
      "<p>Kevin&#039;s — “quote”</p>",
    );
  });

  it("renders placeholders inside inline SVG markup", () => {
    assert.equal(
      renderDesignTemplate(
        '<svg viewBox="0 0 100 100"><text>{{page.title}}</text><use href="{{fields.icon}}"></use></svg>',
        { ...model, fields: { ...model.fields, icon: "#heart" } },
      ),
      '<svg viewBox="0 0 100 100"><text>Kevin &amp; &lt;Friends&gt;</text><use href="#heart"></use></svg>',
    );
  });

  it("renders missing and unresolved placeholders as empty strings", () => {
    assert.equal(renderDesignTemplate("<p>{{fields.missing}}</p>", model), "<p></p>");
  });

  it("removes unsafe URL schemes after placeholder rendering", () => {
    assert.equal(
      renderDesignTemplate('<a href="{{fields.link}}">Open</a>', {
        fields: { link: "javascript:alert(1)" },
      }),
      '<a href="">Open</a>',
    );
    assert.equal(
      renderDesignTemplate('<a href="{{fields.link}}">Open</a>', {
        fields: { link: "java\nscript:alert(1)" },
      }),
      '<a href="">Open</a>',
    );
    assert.equal(
      renderDesignTemplate('<a href="{{fields.link}}">Open</a>', {
        fields: { link: "https://example.test/donate" },
      }),
      '<a href="https://example.test/donate">Open</a>',
    );
    assert.equal(
      renderDesignTemplate('<a href="{{fields.link}}">Open</a>', {
        fields: { link: "donate" },
      }),
      '<a href="donate">Open</a>',
    );
  });

  it("renders query loops with nested fields", () => {
    assert.equal(
      renderDesignTemplate(
        '{{#each queries.news}}<li><a href="{{link}}">{{title}}</a></li>{{/each}}',
        {
          queries: {
            news: {
              items: [
                { title: "One & Two", link: "/one/" },
                { title: "Three", link: "/three/" },
              ],
            },
          },
        },
      ),
      '<li><a href="/one/">One &amp; Two</a></li><li><a href="/three/">Three</a></li>',
    );
  });

  it("supports nested conditionals with else", () => {
    assert.equal(
      renderDesignTemplate(
        "{{#if title}}Hello {{title}}{{else}}Empty{{/if}}",
        { title: "World" },
      ),
      "Hello World",
    );
    assert.equal(
      renderDesignTemplate(
        "{{#if title}}Hello {{title}}{{else}}Empty{{/if}}",
        { title: "" },
      ),
      "Empty",
    );
  });

  it("discovers query slugs from design HTML", () => {
    const { discoverQuerySlugs } = require("./pageDesignTemplate");
    assert.deepEqual(
      discoverQuerySlugs(
        "{{#each queries.latest_news}}x{{/each}} {{#each queries.events}}y{{/each}}",
      ),
      ["latest_news", "events"],
    );
  });

  it("preserves form embed markers through rendering", () => {
    const { renderDesignTemplate, discoverFormSlugs, splitDesignHtml } =
      require("./pageDesignTemplate");
    assert.equal(
      renderDesignTemplate("<div>{{form:contact}}</div><p>{{page.title}}</p>", model),
      "<div>{{form:contact}}</div><p>Kevin &amp; &lt;Friends&gt;</p>",
    );
    assert.deepEqual(discoverFormSlugs("{{form:contact}} {{form:volunteer}}"), [
      "contact",
      "volunteer",
    ]);
    assert.deepEqual(splitDesignHtml("before{{form:contact}}after"), [
      { type: "html", html: "before" },
      { type: "form", slug: "contact" },
      { type: "html", html: "after" },
    ]);
  });

  it("preserves stacked-slider markers and splits islands", () => {
    const {
      renderDesignTemplate,
      discoverStackedSliderSlugs,
      splitDesignHtml,
    } = require("./pageDesignTemplate");
    assert.equal(
      renderDesignTemplate(
        "<aside>{{stacked-slider:history}}</aside><p>{{page.title}}</p>",
        model,
      ),
      "<aside>{{stacked-slider:history}}</aside><p>Kevin &amp; &lt;Friends&gt;</p>",
    );
    assert.deepEqual(discoverStackedSliderSlugs("{{stacked-slider:history}}"), [
      "history",
    ]);
    assert.deepEqual(
      splitDesignHtml("a{{stacked-slider:history}}b{{form:contact}}c"),
      [
        { type: "html", html: "a" },
        { type: "stacked-slider", slug: "history" },
        { type: "html", html: "b" },
        { type: "form", slug: "contact" },
        { type: "html", html: "c" },
      ],
    );
  });

  it("preserves partners-slider markers and splits islands", () => {
    const { renderDesignTemplate, splitDesignHtml } = require("./pageDesignTemplate");
    assert.equal(
      renderDesignTemplate(
        "<div>{{partners-slider}}</div><p>{{page.title}}</p>",
        model,
      ),
      "<div>{{partners-slider}}</div><p>Kevin &amp; &lt;Friends&gt;</p>",
    );
    assert.deepEqual(splitDesignHtml("a{{partners-slider}}b{{form:contact}}c"), [
      { type: "html", html: "a" },
      { type: "partners-slider" },
      { type: "html", html: "b" },
      { type: "form", slug: "contact" },
      { type: "html", html: "c" },
    ]);
  });

  it("preserves blog islands and splits @first featured rows", () => {
    const { renderDesignTemplate, splitDesignHtml } = require("./pageDesignTemplate");
    assert.equal(
      renderDesignTemplate("<div>{{blog-filters}}{{post-sidebar}}{{comments}}</div>", model),
      "<div>{{blog-filters}}{{post-sidebar}}{{comments}}</div>",
    );
    assert.deepEqual(
      splitDesignHtml("a{{blog-filters}}b{{post-sidebar}}c{{comments}}d"),
      [
        { type: "html", html: "a" },
        { type: "blog-filters" },
        { type: "html", html: "b" },
        { type: "post-sidebar" },
        { type: "html", html: "c" },
        { type: "comments" },
        { type: "html", html: "d" },
      ],
    );
    const { embedDesignIslands } = require("./pageDesignTemplate");
    const embedded = embedDesignIslands(
      '<div class="kpf-post-body__inner">{{post-sidebar}}<div class="kpf-post-main"></div></div>{{comments}}',
      "kpf-island-12",
    );
    assert.equal(
      embedded.html,
      '<div class="kpf-post-body__inner"><div id="kpf-island-12-0" data-kpf-island="post-sidebar"></div><div class="kpf-post-main"></div></div><div id="kpf-island-12-1" data-kpf-island="comments"></div>',
    );
    assert.deepEqual(embedded.islands, [
      { id: "kpf-island-12-0", type: "post-sidebar", slug: "" },
      { id: "kpf-island-12-1", type: "comments", slug: "" },
    ]);
    assert.equal(
      renderDesignTemplate(
        "{{#each queries.blog-posts}}{{#if @first}}F:{{title}}{{else}}R:{{title}}{{/if}}{{/each}}",
        {
          queries: {
            "blog-posts": {
              items: [
                { title: "First", href: "/blog/a/" },
                { title: "Second", href: "/blog/b/" },
              ],
            },
          },
        },
      ),
      "F:FirstR:Second",
    );
    assert.equal(
      renderDesignTemplate(
        "{{#if queries.blog-posts}}{{#each queries.blog-posts}}{{#if @first}}F {{#if featuredImage.url}}IMG{{else}}NOIMG{{/if}} {{title}}{{/if}}{{/each}}{{else}}EMPTY{{/if}}",
        {
          queries: {
            "blog-posts": {
              items: [
                {
                  title: "Hello",
                  featuredImage: { url: "https://example.test/a.jpg" },
                },
              ],
            },
          },
        },
      ),
      "F IMG Hello",
    );
    assert.equal(
      renderDesignTemplate(
        "{{#if queries.blog-posts}}HAS{{else}}EMPTY{{/if}}",
        { queries: { "blog-posts": { items: [] } } },
      ),
      "EMPTY",
    );
  });
});
