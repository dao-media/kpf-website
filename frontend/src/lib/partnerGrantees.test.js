const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { normalizePartnerGrantees } = require("./partnerGrantees");

describe("normalizePartnerGrantees", () => {
  it("keeps items with name and logo", () => {
    const out = normalizePartnerGrantees([
      { databaseId: 1, name: "Alpha", logoUrl: "https://example.test/a.png", website: "https://a.test" },
      { databaseId: 2, name: "Beta", logoUrl: "" },
      null,
    ]);
    assert.equal(out.length, 1);
    assert.equal(out[0].name, "Alpha");
    assert.equal(out[0].logoAlt, "Alpha");
    assert.equal(out[0].website, "https://a.test");
  });

  it("dedupes the same organization across multiple grant rows", () => {
    const out = normalizePartnerGrantees([
      { databaseId: 10, name: "My Warrior's Place", logoUrl: "https://example.test/a.png" },
      { databaseId: 11, name: "My Warrior’s Place", logoUrl: "https://example.test/a.png" },
      { databaseId: 12, name: "Freedom Riding Academy", logoUrl: "https://example.test/b.png" },
    ]);
    assert.equal(out.length, 2);
    assert.equal(out[0].name, "My Warrior's Place");
    assert.equal(out[1].name, "Freedom Riding Academy");
  });
});
