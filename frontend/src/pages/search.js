import Head from "next/head";
import { useRouter } from "next/router";
import SearchPage from "@/components/SearchPage";

const { KPF_ACCESSIBILITY_QUERY } = require("@/lib/accessibility");

const wordpressUrl = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(
  /\/$/,
  ""
);

const SEARCH_SHELL_QUERY = `
  query SearchShellChrome {
    kpfStylesheet
    ${KPF_ACCESSIBILITY_QUERY}
    kpfSiteChrome {
      header {
        databaseId
        title
        role
        html
        behavior {
          version
          mode
          retractDelayMs
          scrollThresholdPx
          transitionMs
          revealAtTop
          overlayHero
          transparentAtTop
          zIndex
          fullWidth
        }
      }
      footer {
        databaseId
        title
        role
        html
        behavior {
          version
          mode
          retractDelayMs
          scrollThresholdPx
          transitionMs
          revealAtTop
          overlayHero
          transparentAtTop
          zIndex
          fullWidth
        }
      }
    }
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
  let kpfStylesheet = "";
  let kpfSiteChrome = null;
  let kpfAccessibility = null;

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
        kpfStylesheet = payload?.data?.kpfStylesheet || "";
        kpfSiteChrome = payload?.data?.kpfSiteChrome || null;
        kpfAccessibility = payload?.data?.kpfAccessibility || null;
      }
    } catch {
      // Fall back to hardcoded header / empty stylesheet when WP is offline.
    }
  }

  return {
    props: {
      kpfStylesheet,
      kpfSiteChrome,
      kpfAccessibility,
    },
    revalidate: 60,
  };
}
