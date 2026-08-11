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
  // Pathname only — asPath (query/hash) differs SSR vs client and remounts the
  // page tree mid-hydrate when used as a React key.
  const pageKey = router.pathname || router.asPath?.split(/[?#]/)[0] || "/";

  return (
    <FaustProvider pageProps={pageProps}>
      <GlobalStylesheet css={css} />
      <SiteChrome chrome={chrome}>
        <Component {...pageProps} key={pageKey} />
      </SiteChrome>
    </FaustProvider>
  );
}
