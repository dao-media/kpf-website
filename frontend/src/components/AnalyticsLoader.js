/**
 * GA4 / GTM loaders plus SPA page_viewed.
 *
 * Set NEXT_PUBLIC_GTM_ID and/or NEXT_PUBLIC_GA_MEASUREMENT_ID on Vercel.
 * Until those exist, events still land on window.dataLayer for GTM to consume.
 */
import Script from "next/script";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { pushAnalyticsEvent } from "@/lib/analyticsUi";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

function bootDataLayer() {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
}

export default function AnalyticsLoader() {
  const router = useRouter();

  useEffect(() => {
    bootDataLayer();
    if (GA_ID && typeof window.gtag === "function") {
      window.gtag("js", new Date());
      window.gtag("config", GA_ID, { send_page_view: true });
    }
  }, []);

  useEffect(() => {
    function onRoute(url) {
      pushAnalyticsEvent("page_viewed", {
        page_path: String(url || "").split(/[?#]/)[0],
        page_title: typeof document !== "undefined" ? document.title : "",
      });
    }

    router.events.on("routeChangeComplete", onRoute);
    return () => {
      router.events.off("routeChangeComplete", onRoute);
    };
  }, [router]);

  return (
    <>
      {GTM_ID ? (
        <>
          <Script id="kpf-gtm" strategy="lazyOnload">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
          </Script>
        </>
      ) : null}
      {GA_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="lazyOnload"
          />
          <Script id="kpf-gtag" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());gtag('config','${GA_ID}',{send_page_view:true});`}
          </Script>
        </>
      ) : null}
    </>
  );
}
