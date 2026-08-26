import Head from "next/head";
import NotFoundPageScaffold from "@/components/NotFoundPageScaffold";

const { KPF_ACCESSIBILITY_QUERY } = require("@/lib/accessibility");
const { KPF_CODE_SNIPPETS_QUERY } = require("@/lib/codeSnippets");
const { KPF_STYLESHEET_QUERY } = require("@/lib/globalStylesheet");
const { KPF_SITE_CHROME_QUERY } = require("@/lib/siteChrome");
const { KPF_ISR_SECONDS } = require("@/lib/isr");

const wordpressUrl = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(
  /\/$/,
  ""
);

const NOT_FOUND_QUERY = `
  query NotFoundPage {
    ${KPF_STYLESHEET_QUERY}
    ${KPF_SITE_CHROME_QUERY}
    ${KPF_ACCESSIBILITY_QUERY}
    ${KPF_CODE_SNIPPETS_QUERY}
    kpfNotFoundDesign {
      databaseId
      title
    }
  }
`;

function emptyChromeProps() {
  return {
    design: null,
    kpfStylesheetInfo: null,
    kpfSiteChrome: null,
    kpfAccessibility: null,
    kpfCodeSnippets: [],
  };
}

export default function NotFoundPage({ design }) {
  return (
    <>
      <Head>
        <title>{design?.title || "Page not found"}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <NotFoundPageScaffold />
    </>
  );
}

export async function getStaticProps() {
  if (!wordpressUrl) {
    return {
      props: emptyChromeProps(),
      revalidate: KPF_ISR_SECONDS,
    };
  }

  try {
    const response = await fetch(`${wordpressUrl}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query: NOT_FOUND_QUERY }),
    });

    if (!response.ok) {
      return {
        props: emptyChromeProps(),
        revalidate: KPF_ISR_SECONDS,
      };
    }

    const payload = await response.json();
    return {
      props: {
        design: payload?.data?.kpfNotFoundDesign || null,
        kpfStylesheetInfo: payload?.data?.kpfStylesheetInfo || null,
        kpfSiteChrome: payload?.data?.kpfSiteChrome || null,
        kpfAccessibility: payload?.data?.kpfAccessibility || null,
        kpfCodeSnippets: payload?.data?.kpfCodeSnippets || [],
      },
      revalidate: KPF_ISR_SECONDS,
    };
  } catch {
    return {
      props: emptyChromeProps(),
      revalidate: KPF_ISR_SECONDS,
    };
  }
}
