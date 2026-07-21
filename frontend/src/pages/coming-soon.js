import Head from "next/head";
import PageDesignRenderer from "@/components/PageDesignRenderer";

const { KPF_ACCESSIBILITY_QUERY } = require("@/lib/accessibility");
const { KPF_CODE_SNIPPETS_QUERY } = require("@/lib/codeSnippets");
const { KPF_SITE_CHROME_QUERY } = require("@/lib/siteChrome");

const wordpressUrl = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(
  /\/$/,
  ""
);

const MAINTENANCE_QUERY = `
  query MaintenancePage {
    kpfStylesheet
    ${KPF_SITE_CHROME_QUERY}
    ${KPF_ACCESSIBILITY_QUERY}
    ${KPF_CODE_SNIPPETS_QUERY}
    kpfMaintenanceMode {
      enabled
      path
      ready
    }
    kpfMaintenanceDesign {
      databaseId
      title
      html
      css
      source
    }
  }
`;

function MaintenanceFallback() {
  return (
    <main style={{ margin: "4rem auto", maxWidth: "40rem", padding: "0 1.5rem" }}>
      <h1>Coming soon</h1>
      <p>This site is temporarily unavailable. Please check back shortly.</p>
    </main>
  );
}

export default function ComingSoonPage({ design, mode }) {
  const page = {
    title: design?.title || "Coming soon",
    content: "",
    kpfPageDesign: design,
    kpfDesignFields: [],
  };

  return (
    <>
      <Head>
        <title>{design?.title || "Coming soon"}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      {design?.html ? <PageDesignRenderer page={page} /> : <MaintenanceFallback />}
      {!mode?.enabled ? (
        <p style={{ display: "none" }} data-kpf-maintenance-inactive>
          Maintenance mode is off.
        </p>
      ) : null}
    </>
  );
}

export async function getServerSideProps() {
  if (!wordpressUrl) {
    return {
      props: {
        design: null,
        mode: { enabled: false, path: "/coming-soon/", ready: false },
        kpfStylesheet: "",
        kpfSiteChrome: null,
        kpfAccessibility: null,
        kpfCodeSnippets: [],
      },
    };
  }

  try {
    const response = await fetch(`${wordpressUrl}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ query: MAINTENANCE_QUERY }),
    });

    if (!response.ok) {
      return {
        props: {
          design: null,
          mode: null,
          kpfStylesheet: "",
          kpfSiteChrome: null,
          kpfAccessibility: null,
          kpfCodeSnippets: [],
        },
      };
    }

    const payload = await response.json();
    return {
      props: {
        design: payload?.data?.kpfMaintenanceDesign || null,
        mode: payload?.data?.kpfMaintenanceMode || null,
        kpfStylesheet: payload?.data?.kpfStylesheet || "",
        kpfSiteChrome: payload?.data?.kpfSiteChrome || null,
        kpfAccessibility: payload?.data?.kpfAccessibility || null,
        kpfCodeSnippets: payload?.data?.kpfCodeSnippets || [],
      },
    };
  } catch (error) {
    return {
      props: {
        design: null,
        mode: null,
        kpfStylesheet: "",
        kpfSiteChrome: null,
        kpfAccessibility: null,
        kpfCodeSnippets: [],
      },
    };
  }
}
