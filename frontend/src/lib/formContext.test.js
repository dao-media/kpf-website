const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  evaluateRule,
  evaluateCondition,
  resolveFieldVisibility,
  formatNationalTel,
} = require("./formContext");

describe("formContext", () => {
  it("formats US telephone numbers", () => {
    assert.equal(formatNationalTel("5551234567", "US"), "(555) 123-4567");
    assert.equal(formatNationalTel("555", "US"), "(555");
  });

  it("evaluates field equality rules", () => {
    const matched = evaluateRule(
      { source: "field", fieldId: "a", operator: "equals", value: "yes" },
      { values: { a: "yes" }, context: {} },
    );
    assert.equal(matched, true);
  });

  it("resolves show/hide conditions", () => {
    const field = {
      required: false,
      conditions: [
        {
          action: "show",
          match: "all",
          rules: [
            {
              source: "utm",
              key: "utm_source",
              operator: "equals",
              value: "newsletter",
            },
          ],
        },
      ],
    };

    const visible = resolveFieldVisibility(field, {
      values: {},
      context: { utm: { utm_source: "newsletter" } },
    });
    assert.equal(visible.visible, true);

    const waiting = resolveFieldVisibility(field, {
      values: {},
      context: { utm: { utm_source: "other" } },
    });
    assert.equal(waiting.visible, false);

    const hidden = resolveFieldVisibility(
      {
        ...field,
        conditions: [{ ...field.conditions[0], action: "hide" }],
      },
      {
        values: {},
        context: { utm: { utm_source: "newsletter" } },
      },
    );
    assert.equal(hidden.visible, false);
  });

  it("supports any-match conditions", () => {
    const ok = evaluateCondition(
      {
        match: "any",
        rules: [
          { source: "path", operator: "equals", value: "/a" },
          { source: "path", operator: "equals", value: "/b" },
        ],
      },
      { values: {}, context: { path: "/b" } },
    );
    assert.equal(ok, true);
  });
});
