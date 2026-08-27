import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

const { analyticsScriptsToLoad } = require("@/lib/thirdPartyIdle");

const { gtm: GTM_ID } = analyticsScriptsToLoad(
  process.env.NEXT_PUBLIC_GTM_ID || "",
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
);

const GTM_BOOTSTRAP = GTM_ID
  ? `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`
  : "";

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
            <Script id="kpf-gtm" strategy="beforeInteractive">
              {GTM_BOOTSTRAP}
            </Script>
          </>
        ) : null}
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
