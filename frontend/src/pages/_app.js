import { useRouter } from "next/router";
import { FaustProvider } from "@faustwp/core";
import AccessibilityRuntime from "@/components/AccessibilityRuntime";
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
  const css = stylesheetFromPageProps(pageProps);
  const accessibility = accessibilityFromPageProps(pageProps);

  return (
    <FaustProvider pageProps={pageProps}>
      <AccessibilityRuntime config={accessibility} />
      <GlobalStylesheet css={css} />
      <SiteChrome chrome={chrome}>
        <Component {...pageProps} key={router.asPath} />
      </SiteChrome>
    </FaustProvider>
  );
}
