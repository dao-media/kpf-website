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
});
