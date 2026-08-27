/**
 * Faust serializes the template query twice: __TEMPLATE_QUERY_DATA__ (what
 * WordPressTemplate renders) and Apollo’s cache extract (__APOLLO_STATE__).
 * Scaffolds read props.data, so the Apollo dump only inflates HTML.
 *
 * @param {object} result getWordPressProps() return value
 * @returns {object}
 */
function withoutApolloState(result) {
  if (!result || typeof result !== "object" || !result.props) {
    return result;
  }

  if (!Object.prototype.hasOwnProperty.call(result.props, "__APOLLO_STATE__")) {
    return result;
  }

  const props = { ...result.props };
  delete props.__APOLLO_STATE__;
  return { ...result, props };
}

module.exports = { withoutApolloState };
