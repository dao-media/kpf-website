const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  fallbackRobotsTxt,
  sanitizeRobotsTxt,
} = require("./robotsTxt");

describe("robots.txt hardening", () => {
  it("fallback is a valid allow-all file with a sitemap", () => {
    const body = fallbackRobotsTxt("https://kevinpopkefoundation.org");
    assert.match(body, /^User-agent: \*\nAllow: \/\n/);
    assert.match(body, /^Sitemap: https:\/\/kevinpopkefoundation\.org\/sitemap\.xml$/m);
    assert.doesNotMatch(body, /Noindex:/i);
  });

  it("keeps comments and known directives, drops unknown ones", () => {
    const body = sanitizeRobotsTxt(
      "\uFEFFUser-agent: *\r\nAllow: /\r\nNoindex: /\r\n# AI context\r\nSitemap: https://example.com/sitemap.xml\r\n",
      "https://kevinpopkefoundation.org",
    );
    assert.match(body, /User-agent: \*/);
    assert.match(body, /Allow: \//);
    assert.match(body, /# AI context/);
    assert.match(body, /Sitemap: https:\/\/example.com\/sitemap.xml/);
    assert.doesNotMatch(body, /Noindex:/);
  });

  it("replaces empty or illegal bodies with the fallback", () => {
    const body = sanitizeRobotsTxt("Not a robots file", "https://kevinpopkefoundation.org");
    assert.equal(body, fallbackRobotsTxt("https://kevinpopkefoundation.org"));
  });

  it("appends Sitemap when CMS output omitted it", () => {
    const body = sanitizeRobotsTxt(
      "User-agent: *\nAllow: /\n",
      "https://kevinpopkefoundation.org",
    );
    assert.match(body, /Sitemap: https:\/\/kevinpopkefoundation\.org\/sitemap\.xml/);
  });
});
