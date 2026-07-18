import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nextEnv from "@next/env";
import MiniSearch from "minisearch";

const require = createRequire(import.meta.url);
const { documentFromNode } = require("../src/lib/searchDocuments.js");
const { loadEnvConfig } = nextEnv;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(root, "public", "search-index.json");
loadEnvConfig(root);
const wordpressUrl = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(/\/$/, "");

const SEARCH_OPTIONS = {
  fields: ["title", "excerpt", "body", "terms"],
  storeFields: [
    "title",
    "excerpt",
    "url",
    "type",
    "typeLabel",
    "date",
    "image",
    "imageAlt",
  ],
};

const CONNECTIONS = [
  {
    name: "pages",
    type: "page",
    extraFields: "",
  },
  {
    name: "posts",
    type: "post",
    extraFields: `
      categories { nodes { name } }
      tags { nodes { name } }
    `,
  },
];

function connectionQuery({ name, extraFields }) {
  return `
    query BuildSearchIndex($after: String) {
      ${name}(first: 100, after: $after, where: { status: PUBLISH }) {
        pageInfo {
          hasNextPage
          endCursor
        }
        nodes {
          databaseId
          title
          excerpt
          content
          uri
          date
          modified
          featuredImage {
            node {
              sourceUrl
              altText
            }
          }
          kpfSeo {
            robots {
              index
            }
            showInSitemap
          }
          ${extraFields}
        }
      }
    }
  `;
}

async function requestGraphql(query, variables) {
  const response = await fetch(`${wordpressUrl}/graphql`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`WordPress GraphQL returned ${response.status}`);
  }

  const payload = await response.json();
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  return payload.data;
}

async function fetchConnection(connection) {
  const nodes = [];
  let after = null;

  do {
    const data = await requestGraphql(connectionQuery(connection), { after });
    const page = data?.[connection.name];
    if (!page) {
      throw new Error(`GraphQL response did not include ${connection.name}`);
    }

    nodes.push(...page.nodes);
    after = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (after);

  return nodes
    .map((node) => documentFromNode(node, connection.type))
    .filter(Boolean);
}

async function main() {
  if (!wordpressUrl) {
    throw new Error(
      "NEXT_PUBLIC_WORDPRESS_URL is required to generate the search index"
    );
  }

  const documents = (
    await Promise.all(CONNECTIONS.map((connection) => fetchConnection(connection)))
  ).flat();

  const index = new MiniSearch(SEARCH_OPTIONS);
  index.addAll(documents);

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    count: documents.length,
    index: index.toJSON(),
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload)}\n`, "utf8");
  console.log(`Generated search index with ${documents.length} documents.`);
}

main().catch((error) => {
  console.error(`Search index generation failed: ${error.message}`);
  process.exitCode = 1;
});
