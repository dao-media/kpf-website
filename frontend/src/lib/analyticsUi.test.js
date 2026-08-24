/**
 * Delegated click rules for foundation UI.
 * Run with: node --test src/lib/analyticsUi.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

describe("analytics UI rules", () => {
  it("covers donate-adjacent events, filters, search, and carousels", async () => {
    const { ANALYTICS_UI_RULES, ANALYTICS_UI_SELECTOR } = await import("./analyticsUi.js");
    const events = ANALYTICS_UI_RULES.map((rule) => rule.event);
    const selectors = ANALYTICS_UI_RULES.map((rule) => rule.selector).join(" ");

    assert.ok(events.includes("event_card_clicked"));
    assert.ok(events.includes("event_chip_clicked"));
    assert.ok(events.includes("filter_selected"));
    assert.ok(events.includes("search_result_clicked"));
    assert.ok(events.includes("cta_clicked"));
    assert.ok(selectors.includes(".kpf-blog-filters__chip"));
    assert.ok(selectors.includes(".kpf-search-result"));
    assert.ok(selectors.includes(".kpf-event-card"));
    assert.ok(selectors.includes(".kpf-stacked-slider__card"));
    assert.ok(ANALYTICS_UI_SELECTOR.includes("[data-kpf-track]"));
  });
});
