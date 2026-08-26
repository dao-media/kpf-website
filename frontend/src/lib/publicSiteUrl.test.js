const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  PRODUCTION_ORIGIN,
  WORDPRESS_CMS_ORIGIN,
  adminCmsDestination,
  isAdminCmsHost,
  isEphemeralHost,
  isVercelProductionAlias,
  rewriteSeoPublicUrls,
  toPublicUrl,
} = require("./publicSiteUrl");

describe("publicSiteUrl", () => {
  it("treats Vercel project and preview hosts as ephemeral", () => {
    assert.equal(isEphemeralHost("kpf-site.vercel.app"), true);
    assert.equal(isEphemeralHost("kpf-1i3sf81rq-daneoleary.vercel.app"), true);
    assert.equal(isEphemeralHost("localhost"), true);
    assert.equal(isEphemeralHost("kevinpopkefoundation.org"), false);
  });

  it("sends the admin CMS host to the DreamHost WordPress login", () => {
    assert.equal(isAdminCmsHost("admin.kevinpopkefoundation.org"), true);
    assert.equal(isAdminCmsHost("ADMIN.kevinpopkefoundation.org:443"), true);
    assert.equal(isAdminCmsHost("kevinpopkefoundation.org"), false);
    assert.equal(
      adminCmsDestination("/"),
      `${WORDPRESS_CMS_ORIGIN}/wp-admin/`
    );
    assert.equal(
      adminCmsDestination("/wp-login.php", "?redirect_to=%2Fwp-admin%2F"),
      `${WORDPRESS_CMS_ORIGIN}/wp-login.php?redirect_to=%2Fwp-admin%2F`
    );
  });

  it("identifies the production Vercel alias for host redirects", () => {
    assert.equal(isVercelProductionAlias("kpf-site.vercel.app"), true);
    assert.equal(isVercelProductionAlias("KPF-SITE.VERCEL.APP:443"), true);
    assert.equal(isVercelProductionAlias("kpf-qt6288k1a-daneoleary.vercel.app"), false);
    assert.equal(isVercelProductionAlias("kevinpopkefoundation.org"), false);
  });

  it("rewrites vercel canonicals onto the production domain", () => {
    assert.equal(
      toPublicUrl("https://kpf-site.vercel.app/"),
      `${PRODUCTION_ORIGIN}/`
    );
    assert.equal(
      toPublicUrl("https://kpf-qt6288k1a-daneoleary.vercel.app/about/"),
      `${PRODUCTION_ORIGIN}/about/`
    );
    assert.equal(
      toPublicUrl("https://kevinpopkefoundation.org/events"),
      "https://kevinpopkefoundation.org/events"
    );
  });

  it("rewrites SEO payload URLs used in head tags", () => {
    const next = rewriteSeoPublicUrls({
      canonical: "https://kpf-site.vercel.app/",
      openGraph: { url: "https://kpf-site.vercel.app/" },
      schemaJson: '{"url":"https://kpf-site.vercel.app/"}',
    });
    assert.equal(next.canonical, `${PRODUCTION_ORIGIN}/`);
    assert.equal(next.openGraph.url, `${PRODUCTION_ORIGIN}/`);
    assert.equal(next.schemaJson, `{"url":"${PRODUCTION_ORIGIN}/"}`);
  });
});
