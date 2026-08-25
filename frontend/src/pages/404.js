import Head from "next/head";
import Link from "next/link";
import PageDesignRenderer from "@/components/PageDesignRenderer";

const { KPF_ACCESSIBILITY_QUERY } = require("@/lib/accessibility");
const { KPF_CODE_SNIPPETS_QUERY } = require("@/lib/codeSnippets");
const { KPF_STYLESHEET_QUERY } = require("@/lib/globalStylesheet");
const { KPF_SITE_CHROME_QUERY } = require("@/lib/siteChrome");

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
      html
      css
      source
    }
  }
`;

function NotFoundFallback() {
  return (
    <div style={{ margin: "4rem auto", maxWidth: "40rem", padding: "0 1.5rem" }}>
      <h1>Page not found</h1>
      <p>That URL does not exist. Check the address, or return home.</p>
      <p>
        <Link href="/">Back to home</Link>
      </p>
    </div>
  );
}

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
  const page = {
    title: design?.title || "Page not found",
    content: "",
    kpfPageDesign: design,
    kpfDesignFields: [],
  };

  return (
    <>
      <Head>
        <title>{design?.title || "Page not found"}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      {design?.html ? <PageDesignRenderer page={page} /> : <NotFoundFallback />}
    </>
  );
}

export async function getStaticProps() {
  if (!wordpressUrl) {
    return {
      props: emptyChromeProps(),
      revalidate: 60,
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
        revalidate: 60,
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
      revalidate: 60,
    };
  } catch {
    return {
      props: emptyChromeProps(),
      revalidate: 60,
    };
  }
}
