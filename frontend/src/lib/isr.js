/**
 * ISR for Faust pages. Inner catch-all routes were generated on demand
 * (`paths: []`) so About/Events/Blog paid GraphQL TTFB on every cold miss.
 * Prerender the public slugs at build; keep fallback blocking for posts.
 */
const KPF_ISR_SECONDS = 3600;

const KPF_PRERENDER_SLUGS = ["about", "events", "blog", "contact", "privacy"];

function wordpressNodeStaticPaths() {
  return {
    paths: KPF_PRERENDER_SLUGS.map((slug) => ({
      params: { wordpressNode: [slug] },
    })),
    fallback: "blocking",
  };
}

module.exports = {
  KPF_ISR_SECONDS,
  KPF_PRERENDER_SLUGS,
  wordpressNodeStaticPaths,
};
