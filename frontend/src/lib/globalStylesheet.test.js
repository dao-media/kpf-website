const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  KPF_STYLESHEET_QUERY,
  PAGES_MARKER,
  stylesheetHref,
  stylesheetMetaFromPageProps,
  withoutPagesLayer,
} = require("./globalStylesheet");

describe("globalStylesheet", () => {
  it("keeps CSS bodies out of the Faust page query", () => {
    assert.match(KPF_STYLESHEET_QUERY, /kpfStylesheetInfo/);
    assert.match(KPF_STYLESHEET_QUERY, /revision/);
    assert.match(KPF_STYLESHEET_QUERY, /hasOverlay/);
    assert.doesNotMatch(KPF_STYLESHEET_QUERY, /^\s*kpfStylesheet\s*$/m);
    assert.doesNotMatch(KPF_STYLESHEET_QUERY, /\bcss\b/);
    assert.doesNotMatch(KPF_STYLESHEET_QUERY, /\bfoundation\b/);
    assert.doesNotMatch(KPF_STYLESHEET_QUERY, /\bpages\b/);
  });

  it("strips the pages layer used by the webpack CSS import", () => {
    const css = `.kpf-btn{color:red}\n\n${PAGES_MARKER}\n.kpf-header{display:flex}`;
    assert.equal(withoutPagesLayer(css), ".kpf-btn{color:red}");
    assert.equal(withoutPagesLayer(""), "");
  });

  it("strips duplicated pages copies that never received the marker", () => {
    const header =
      "/**\n * KPF Pages stylesheet — layout utilities, chrome, and page section contracts\n */";
    const css = `.kpf-btn{color:red}\n\n${header}\n.kpf-header{}\n\n${header}\n.kpf-header{}`;
    assert.equal(withoutPagesLayer(css), ".kpf-btn{color:red}");
  });

  it("keeps only the CMS tokens block as the public overlay", () => {
    const { publicOverlayCss } = require("./globalStylesheet");
    const overlay = publicOverlayCss(
      `:root{--kpf-ember:#bb0d0d}\n/* kpf-tokens:start */\n:root{--kpf-ember:#c00}\n/* kpf-tokens:end */\n${PAGES_MARKER}\n.kpf-header{}`,
    );
    assert.equal(
      overlay,
      "/* kpf-tokens:start */\n:root{--kpf-ember:#c00}\n/* kpf-tokens:end */",
    );
    assert.equal(publicOverlayCss(":root{--kpf-ember:#bb0d0d}"), "");
  });

  it("never yields an empty stylesheet body (avoids 204 MIME failures)", () => {
    const { EMPTY_OVERLAY_CSS, stylesheetResponseBody } = require("./globalStylesheet");
    assert.match(EMPTY_OVERLAY_CSS, /kpf: no CMS overlay/);
    assert.equal(stylesheetResponseBody(""), EMPTY_OVERLAY_CSS);
    assert.equal(stylesheetResponseBody(":root{--kpf-ember:#bb0d0d}"), EMPTY_OVERLAY_CSS);
    assert.match(
      stylesheetResponseBody(
        `/* kpf-tokens:start */\n:root{--kpf-ember:#c00}\n/* kpf-tokens:end */`,
      ),
      /--kpf-ember:#c00/,
    );
  });

  it("builds a cache-busted same-origin CSS URL from page props", () => {
    assert.equal(stylesheetHref(""), "/kpf-stylesheet.css");
    assert.equal(
      stylesheetHref("abc123"),
      "/kpf-stylesheet.css?rev=abc123",
    );
    assert.deepEqual(
      stylesheetMetaFromPageProps({
        __TEMPLATE_QUERY_DATA__: { kpfStylesheetInfo: { revision: "deadbeef" } },
      }),
      {
        revision: "deadbeef",
        hasOverlay: false,
        href: "",
      },
    );
    assert.deepEqual(
      stylesheetMetaFromPageProps({
        kpfStylesheetInfo: { revision: "deadbeef", hasOverlay: true },
      }),
      {
        revision: "deadbeef",
        hasOverlay: true,
        href: "/kpf-stylesheet.css?rev=deadbeef",
      },
    );
  });
});
