import { useRouter } from "next/router";
import { FaustProvider } from "@faustwp/core";
import AnalyticsLoader from "@/components/AnalyticsLoader";
import GlobalStylesheet from "@/components/GlobalStylesheet";
import SiteChrome from "@/components/SiteChrome";
import { kpfFontClassName } from "@/lib/kpfFonts";
import "../../faust.config";
import "@/styles/components.css";
import "@/styles/pages.css";

const { stylesheetMetaFromPageProps } = require("@/lib/globalStylesheet");

function chromeFromPageProps(pageProps) {
  return (
    pageProps?.__TEMPLATE_QUERY_DATA__?.kpfSiteChrome ||
    pageProps?.kpfSiteChrome ||
    null
  );
}

function stylesheetFromPageProps(pageProps) {
  return stylesheetMetaFromPageProps(pageProps);
}

function snippetsFromPageProps(pageProps) {
  return (
    pageProps?.__TEMPLATE_QUERY_DATA__?.kpfCodeSnippets ||
    pageProps?.kpfCodeSnippets ||
    []
  );
}

function accessibilityFromPageProps(pageProps) {
  return (
    pageProps?.__TEMPLATE_QUERY_DATA__?.kpfAccessibility ||
    pageProps?.kpfAccessibility ||
    null
  );
}

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const chrome = chromeFromPageProps(pageProps);
  const stylesheet = stylesheetFromPageProps(pageProps);
  const snippets = snippetsFromPageProps(pageProps);
  const accessibility = accessibilityFromPageProps(pageProps);
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
      <div className={kpfFontClassName}>
        <GlobalStylesheet href={stylesheet.href} revision={stylesheet.revision} />
        <AnalyticsLoader />
        <SiteChrome
          chrome={chrome}
          snippets={snippets}
          accessibility={accessibility}
        >
          <Component {...pageProps} key={pageKey} />
        </SiteChrome>
      </div>
    </FaustProvider>
  );
}
