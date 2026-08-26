import Head from "next/head";
import { useRouter } from "next/router";
import SearchPage from "@/components/SearchPage";

const { KPF_ACCESSIBILITY_QUERY } = require("@/lib/accessibility");
const { KPF_CODE_SNIPPETS_QUERY } = require("@/lib/codeSnippets");
const { KPF_STYLESHEET_QUERY } = require("@/lib/globalStylesheet");
const { KPF_SITE_CHROME_QUERY } = require("@/lib/siteChrome");
const { KPF_ISR_SECONDS } = require("@/lib/isr");

const wordpressUrl = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(
  /\/$/,
  ""
);

const SEARCH_SHELL_QUERY = `
  query SearchShellChrome {
    ${KPF_STYLESHEET_QUERY}
    ${KPF_ACCESSIBILITY_QUERY}
    ${KPF_CODE_SNIPPETS_QUERY}
    ${KPF_SITE_CHROME_QUERY}
  }
`;

export default function SearchRoute() {
  const router = useRouter();
  const initialQuery =
    typeof router.query.q === "string" ? router.query.q.slice(0, 200) : "";

  function updateUrl(value) {
    const url = new URL(window.location.href);
    if (value.trim()) {
      url.searchParams.set("q", value.slice(0, 200));
    } else {
      url.searchParams.delete("q");
    }
    window.history.replaceState(window.history.state, "", url);
  }

  return (
    <>
      <Head>
        <title>Search | Kevin Popke Foundation</title>
        <meta
          name="description"
          content="Search stories, news, people, and information from the Kevin Popke Foundation."
        />
        <meta name="robots" content="noindex, follow" />
      </Head>
      <SearchPage initialQuery={initialQuery} onQueryChange={updateUrl} />
    </>
  );
}

export async function getStaticProps() {
  let kpfStylesheetInfo = null;
  let kpfSiteChrome = null;
  let kpfAccessibility = null;
  let kpfCodeSnippets = [];

  if (wordpressUrl) {
    try {
      const response = await fetch(`${wordpressUrl}/graphql`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ query: SEARCH_SHELL_QUERY }),
      });
      if (response.ok) {
        const payload = await response.json();
        kpfStylesheetInfo = payload?.data?.kpfStylesheetInfo || null;
        kpfSiteChrome = payload?.data?.kpfSiteChrome || null;
        kpfAccessibility = payload?.data?.kpfAccessibility || null;
        kpfCodeSnippets = payload?.data?.kpfCodeSnippets || [];
      }
    } catch {
      // Fall back to hardcoded header / empty stylesheet when WP is offline.
    }
  }

  return {
    props: {
      kpfStylesheetInfo,
      kpfSiteChrome,
      kpfAccessibility,
      kpfCodeSnippets,
    },
    revalidate: KPF_ISR_SECONDS,
  };
}
