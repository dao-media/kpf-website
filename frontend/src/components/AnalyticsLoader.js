/**
 * GA4 / GTM loaders plus SPA page_viewed.
 *
 * Set NEXT_PUBLIC_GTM_ID and/or NEXT_PUBLIC_GA_MEASUREMENT_ID on Vercel.
 * If both are set, only GTM loads (the container already ships GA4) from
 * pages/_document.js so Tag Assistant sees the snippet in the first HTML.
 * This file still boots dataLayer, SPA page_viewed, and gtag-only fallback.
 */
import Script from "next/script";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { pushAnalyticsEvent } from "@/lib/analyticsUi";

const { analyticsScriptsToLoad } = require("@/lib/thirdPartyIdle");

const { gtm: GTM_ID, ga: GA_ID } = analyticsScriptsToLoad(
  process.env.NEXT_PUBLIC_GTM_ID || "",
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
);

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
  }, []);

  useEffect(() => {
    if (GTM_ID || !GA_ID || typeof window.gtag !== "function") return;
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { send_page_view: true });
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

  if (GTM_ID || !GA_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="kpf-gtag" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());gtag('config','${GA_ID}',{send_page_view:true});`}
      </Script>
    </>
  );
}
