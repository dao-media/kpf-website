const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { withoutApolloState } = require("./withoutApolloState");

describe("withoutApolloState", () => {
  it("drops the Apollo cache dump and keeps template query data", () => {
    const next = withoutApolloState({
      props: {
        __SEED_NODE__: { uri: "/" },
        __TEMPLATE_QUERY_DATA__: { kpfSiteChrome: {} },
        __APOLLO_STATE__: { ROOT_QUERY: { kpfSiteChrome: {} } },
      },
      revalidate: 3600,
    });
    assert.equal(next.revalidate, 3600);
    assert.deepEqual(next.props.__TEMPLATE_QUERY_DATA__, { kpfSiteChrome: {} });
    assert.equal("__APOLLO_STATE__" in next.props, false);
  });

  it("passes through results with no Apollo state", () => {
    const input = { props: { __SEED_NODE__: { uri: "/" } } };
    assert.equal(withoutApolloState(input), input);
  });
});
