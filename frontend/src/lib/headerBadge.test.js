const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const {
  isHeaderBadgeEntranceSettled,
  isHeaderBadgeNode,
  restoreHeaderBadge,
} = require("./headerBadge");

describe("headerBadge", () => {
  let originalDocument;

  beforeEach(() => {
    originalDocument = global.document;
  });

  afterEach(() => {
    global.document = originalDocument;
  });

  it("recognizes the anniversary mark node", () => {
    const badge = {
      matches(selector) {
        return (
          selector === "[data-kpf-badge], .kpf-header__badge" ||
          selector === "[data-kpf-badge]"
        );
      },
    };
    assert.equal(isHeaderBadgeNode(badge), true);
    assert.equal(
      isHeaderBadgeNode({
        matches: () => false,
        closest: () => null,
      }),
      false,
    );
  });

  it("treats kpf-nav-entered as the settled entrance", () => {
    global.document = {
      documentElement: { classList: { contains: () => false } },
    };
    assert.equal(isHeaderBadgeEntranceSettled(), false);
    global.document = {
      documentElement: { classList: { contains: (c) => c === "kpf-nav-entered" } },
    };
    assert.equal(isHeaderBadgeEntranceSettled(), true);
  });

  it("pins y at rest and kills the CSS drop once the entrance has settled", () => {
    const badge = {
      style: { animation: "kpf-header-badge-drop 0.7s both" },
      matches: () => true,
    };
    const killed = [];
    const sets = [];
    global.document = {
      documentElement: {
        classList: { contains: (c) => c === "kpf-nav-entered" },
      },
      querySelectorAll: () => [badge],
    };
    restoreHeaderBadge({
      resetY: true,
      gsap: {
        killTweensOf(node, props) {
          killed.push([node, props]);
        },
        set(node, vars) {
          sets.push([node, vars]);
        },
      },
    });
    assert.equal(badge.style.animation, "none");
    assert.equal(killed.length, 1);
    assert.match(killed[0][1], /\by\b/);
    assert.equal(sets[0][1].y, 0);
    assert.equal(sets[0][1].x, 0);
  });
});
