const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  HOME_TITLE,
  applySeoDefaults,
  isGenericTitle,
  isUsableDescription,
} = require("./seoPageDefaults");

describe("seoPageDefaults", () => {
  it("replaces empty Home/About descriptions and generic titles", () => {
    const home = applySeoDefaults(
      { title: "The Kevin Popke Foundation", description: "" },
      "/",
    );
    assert.equal(home.title, HOME_TITLE);
    assert.match(home.description, /Tampa Bay/);
    assert.match(home.openGraph.imageUrl, /kevin-double-exposure/);

    const about = applySeoDefaults(
      { title: "About | The Kevin Popke Foundation", description: "" },
      "/about/",
    );
    assert.match(about.title, /Who Was Kevin Popke/);
    assert.match(about.description, /Donald/);
  });

  it("drops placeholder Events descriptions", () => {
    const events = applySeoDefaults(
      { title: "Events | The Kevin Popke Foundation", description: "Editor save check" },
      "/events",
    );
    assert.match(events.title, /Songwriters for Vets/);
    assert.equal(isUsableDescription("Editor save check"), false);
    assert.match(events.description, /tickets/i);
  });

  it("leaves a unique blog archive description alone", () => {
    const blog = applySeoDefaults(
      {
        title: "News & Updates | Kevin Popke Foundation, Inc.",
        description: "Follow our grantees, volunteers, and events on the KPF blog.",
      },
      "/blog",
    );
    assert.equal(
      blog.description,
      "Follow our grantees, volunteers, and events on the KPF blog.",
    );
    assert.equal(isGenericTitle(blog.title, "/blog"), false);
  });
});
