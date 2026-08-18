const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeGrantQueryItems,
  parseGrantAmount,
  formatGrantTotal,
  sumGrantAmounts,
  resolveGrantsTotalLabel,
  formatGranteesTitle,
} = require("./grantsQuery");

describe("normalizeGrantQueryItems", () => {
  it("maps grant query fields onto GranteeCard props", () => {
    const out = normalizeGrantQueryItems({
      slug: "grants",
      items: [
        {
          databaseId: 12,
          title: "Freedom Riding Academy · Aug 2025 · $10,000",
          recipientName: "Freedom Riding Academy",
          blurb: "Advanced motorcycle skills training.",
          grantAmountLabel: "$10,000",
          awardedLabel: "Aug 2025",
          checkPhotoUrl: "https://example.com/check.png",
          logoUrl: "https://example.com/logo.jpg",
          website: "https://freedomridingacademy.org",
          featuredImage: { url: "https://example.com/check.png", alt: "Check photo" },
        },
        {
          databaseId: 13,
          title: "Missing name",
          recipientName: "",
        },
      ],
    });

    assert.equal(out.length, 1);
    assert.equal(out[0].id, 12);
    assert.equal(out[0].name, "Freedom Riding Academy");
    assert.equal(out[0].body, "Advanced motorcycle skills training.");
    assert.equal(out[0].date, "Aug 2025");
    assert.equal(out[0].amount, "$10,000");
    assert.equal(out[0].photoUrl, "https://example.com/check.png");
    assert.equal(out[0].logoUrl, "https://example.com/logo.jpg");
    assert.equal(out[0].href, "https://freedomridingacademy.org");
  });

  it("returns empty for missing query payload", () => {
    assert.deepEqual(normalizeGrantQueryItems(null), []);
    assert.deepEqual(normalizeGrantQueryItems({}), []);
  });
});

describe("grants total helpers", () => {
  it("parses and sums amount labels", () => {
    assert.equal(parseGrantAmount("$10,000"), 10000);
    assert.equal(sumGrantAmounts([{ amount: "$10,000" }, { amount: "$10,000" }]), 20000);
    assert.equal(formatGrantTotal(50000), "$50,000");
  });

  it("prefers API label and formats the grantees title", () => {
    assert.equal(
      resolveGrantsTotalLabel({ label: "$50,000" }, [{ amount: "$10,000" }]),
      "$50,000",
    );
    assert.equal(
      formatGranteesTitle(
        "More than {total} in grants — and counting",
        "$50,000",
      ),
      "More than $50,000 in grants — and counting",
    );
  });
});
