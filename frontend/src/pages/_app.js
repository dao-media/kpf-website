import { useRouter } from "next/router";
import { FaustProvider } from "@faustwp/core";
import GlobalStylesheet from "@/components/GlobalStylesheet";
import SiteChrome from "@/components/SiteChrome";
import "../../faust.config";
import "@/styles/components.css";

function chromeFromPageProps(pageProps) {
  return (
    pageProps?.__TEMPLATE_QUERY_DATA__?.kpfSiteChrome ||
    pageProps?.kpfSiteChrome ||
    null
  );
}

function stylesheetFromPageProps(pageProps) {
  return (
    pageProps?.__TEMPLATE_QUERY_DATA__?.kpfStylesheet ||
    pageProps?.kpfStylesheet ||
    ""
  );
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const chrome = chromeFromPageProps(pageProps);
  const css = stylesheetFromPageProps(pageProps);
  // Key by the real URL path (no query/hash). `router.pathname` is always
  // `/[...wordpressNode]` for WP pages, so using it as a key left About/Events/
  // Contact sharing one React tree — client nav kept the previous scaffold
  // while the address bar updated. Normalize trailing slashes so `/about` and
  // `/about/` do not remount mid-hydrate.
  const pageKey = (() => {
    let path = String(router.asPath || "/").split(/[?#]/)[0] || "/";
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return path || "/";
  })();

  return (
    <FaustProvider pageProps={pageProps}>
      <GlobalStylesheet css={css} />
      <SiteChrome chrome={chrome}>
        <Component {...pageProps} key={pageKey} />
      </SiteChrome>
    </FaustProvider>
  );
}
