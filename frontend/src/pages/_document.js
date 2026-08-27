import { Html, Head, Main, NextScript } from "next/document";

const { analyticsScriptsToLoad, gtmBootstrapScript } = require("@/lib/thirdPartyIdle");

const { gtm: GTM_ID } = analyticsScriptsToLoad(
  process.env.NEXT_PUBLIC_GTM_ID || "",
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
);

const GTM_BOOTSTRAP = gtmBootstrapScript(GTM_ID);

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Geist + Roboto: next/font in src/lib/kpfFonts.js (applied from _app). */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/media/brand/kpf-favicon.png" />
      </Head>
      <body>
        {GTM_ID ? (
          <>
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
                title="Google Tag Manager"
              />
            </noscript>
            <script
              id="kpf-gtm"
              dangerouslySetInnerHTML={{ __html: GTM_BOOTSTRAP }}
            />
          </>
        ) : null}
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
