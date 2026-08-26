const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { isOffsiteHttpHref } = require("./externalHref");
const { KPF_DONATE_HREF } = require("./navigation");

describe("isOffsiteHttpHref", () => {
  const here = "https://kevinpopkefoundation.org";

  it("treats PayPal and partner ticket sites as off-site", () => {
    assert.equal(isOffsiteHttpHref(KPF_DONATE_HREF, here), true);
    assert.equal(
      isOffsiteHttpHref("https://www.songwriters4vets.com/", here),
      true,
    );
    assert.equal(isOffsiteHttpHref("https://mywarriorsplace.org", here), true);
  });

  it("keeps Foundation, CMS, and relative URLs on-site", () => {
    assert.equal(isOffsiteHttpHref("https://kevinpopkefoundation.org/blog/", here), false);
    assert.equal(isOffsiteHttpHref("https://www.kevinpopkefoundation.org/", here), false);
    assert.equal(isOffsiteHttpHref("https://kpf.dreamhosters.com/wp-admin/", here), false);
    assert.equal(isOffsiteHttpHref("/contact/", here), false);
    assert.equal(isOffsiteHttpHref("mailto:kevinpopke.foundation@gmail.com", here), false);
    assert.equal(isOffsiteHttpHref("#featured", here), false);
  });
});
