#!/usr/bin/env node
/**
 * GraphQL CI for Faust / WPGraphQL pins.
 *
 * 1. Dump compact Type.field names from wp-env introspection.
 * 2. Fail if any previously committed field is gone (additions are OK).
 * 3. Smoke homepage / about / blog queries against the live schema.
 *
 * Usage:
 *   node scripts/graphql-ci.mjs              # compare + smoke (CI)
 *   node scripts/graphql-ci.mjs --write      # refresh wordpress/graphql-schema-fields.json
 *   node scripts/graphql-ci.mjs --skip-smokes
 */
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const requireFromFrontend = createRequire(
  path.join(__dirname, "../frontend/src/wp-templates/pageQueries.js"),
);
const {
  GET_HOME_PAGE,
  GET_ABOUT_PAGE,
  GET_BLOG_PAGE,
} = requireFromFrontend("./pageQueries.js");

const ROOT = path.join(__dirname, "..");
const BASELINE_PATH = path.join(ROOT, "wordpress/graphql-schema-fields.json");
const GRAPHQL_URL =
  process.env.GRAPHQL_URL || "http://127.0.0.1:8888/graphql";
const WRITE = process.argv.includes("--write");
const SKIP_SMOKES = process.argv.includes("--skip-smokes");

const INTROSPECTION = `
  query KpfSchemaFields {
    __schema {
      types {
        kind
        name
        fields { name }
        inputFields { name }
      }
    }
  }
`;

function skipType(name, kind) {
  if (!name || name.startsWith("__")) return true;
  // Gutenberg block types churn with WP core; Faust/WPGraphQL bumps
  // still show up on RootQuery, Page, Post, and KPF types.
  if (/^Core/.test(name)) return true;
  if (kind === "SCALAR" || kind === "ENUM" || kind === "UNION") return true;
  return false;
}

function fieldsFromSchema(schema) {
  const fields = [];
  for (const type of schema?.types || []) {
    if (skipType(type.name, type.kind)) continue;
    const names = [
      ...(type.fields || []).map((f) => f.name),
      ...(type.inputFields || []).map((f) => f.name),
    ];
    for (const field of names) {
      fields.push(`${type.name}.${field}`);
    }
  }
  return [...new Set(fields)].sort();
}

async function graphql(query, variables) {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `GraphQL ${GRAPHQL_URL} returned non-JSON (${res.status}): ${text.slice(0, 400)}`,
    );
  }
  return { status: res.status, json };
}

async function waitForGraphql() {
  const deadline = Date.now() + 120_000;
  let last = "";
  while (Date.now() < deadline) {
    try {
      const { status, json } = await graphql("{ __typename }");
      if (status === 200 && json?.data?.__typename) return;
      last = `HTTP ${status} ${JSON.stringify(json).slice(0, 200)}`;
    } catch (err) {
      last = err.message;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`GraphQL at ${GRAPHQL_URL} did not become ready: ${last}`);
}

function assertNoErrors(label, json) {
  const errors = json?.errors;
  if (Array.isArray(errors) && errors.length) {
    const msg = errors.map((e) => e.message).join("\n");
    throw new Error(`${label} GraphQL errors:\n${msg}`);
  }
  if (!json?.data) {
    throw new Error(`${label} returned no data`);
  }
}

function compareFields(baseline, current) {
  const currentSet = new Set(current);
  const previousSet = new Set(baseline);
  const removed = baseline.filter((field) => !currentSet.has(field));
  const added = current.filter((field) => !previousSet.has(field));
  return { removed, added };
}

async function main() {
  await waitForGraphql();

  const introspect = await graphql(INTROSPECTION);
  assertNoErrors("introspection", introspect.json);
  const fields = fieldsFromSchema(introspect.json.data.__schema);

  if (WRITE) {
    const payload = {
      comment:
        "Compact GraphQL field list for Faust/WPGraphQL CI. Gutenberg Core* types are omitted. Refresh with: node scripts/graphql-ci.mjs --write",
      generatedAt: new Date().toISOString(),
      graphqlUrl: GRAPHQL_URL,
      fields,
    };
    fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`Wrote ${fields.length} fields to ${path.relative(ROOT, BASELINE_PATH)}`);
  } else {
    if (!fs.existsSync(BASELINE_PATH)) {
      throw new Error(
        `Missing ${path.relative(ROOT, BASELINE_PATH)}. Run: node scripts/graphql-ci.mjs --write`,
      );
    }
    const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8"));
    const previous = Array.isArray(baseline.fields) ? baseline.fields : [];
    const { removed, added } = compareFields(previous, fields);
    if (removed.length) {
      throw new Error(
        `GraphQL field removal detected (${removed.length}):\n  ${removed.slice(0, 40).join("\n  ")}${
          removed.length > 40 ? `\n  …and ${removed.length - 40} more` : ""
        }`,
      );
    }
    console.log(
      `Schema OK: ${fields.length} fields (baseline ${previous.length}, +${added.length})`,
    );
  }

  if (SKIP_SMOKES) return;

  const smokes = [
    { label: "home", query: GET_HOME_PAGE },
    { label: "about", query: GET_ABOUT_PAGE, variables: { uri: "/about/" } },
    { label: "blog", query: GET_BLOG_PAGE, variables: { uri: "/blog/" } },
  ];
  for (const smoke of smokes) {
    const { json } = await graphql(smoke.query, smoke.variables);
    assertNoErrors(smoke.label, json);
    console.log(`Smoke OK: ${smoke.label}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
