import Script from "next/script";
import { useRouter } from "next/router";

const {
  allowlistedScriptSrc,
  filterSnippetsForPath,
  isSafePublicSnippet,
  pathFromAsPath,
} = require("@/lib/codeSnippets");
const { shouldSkipSnippetAnalyticsSrc } = require("@/lib/thirdPartyIdle");

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "";
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

function SnippetMarkup({ snippet }) {
  const id = snippet.databaseId || snippet.name || "snippet";
  const code = String(snippet.code || "");

  if (snippet.type === "css") {
    return (
      <style
        data-kpf-code-snippet={id}
        data-kpf-code-location={snippet.location}
        dangerouslySetInnerHTML={{ __html: code }}
      />
    );
  }

  if (snippet.type === "js") {
    const src = allowlistedScriptSrc(code);
    if (!src) return null;
    if (shouldSkipSnippetAnalyticsSrc(src, GTM_ID, GA_ID)) return null;
    const strategy = snippet.location === "footer" ? "lazyOnload" : "afterInteractive";
    return (
      <Script
        id={`kpf-code-js-${id}`}
        src={src}
        strategy={strategy}
        data-kpf-code-snippet={id}
        data-kpf-code-location={snippet.location}
      />
    );
  }

  if (!isSafePublicSnippet(snippet)) return null;
  if (GTM_ID && /googletagmanager\.com\/ns\.html/i.test(code)) return null;

  return (
    <div
      data-kpf-code-snippet={id}
      data-kpf-code-location={snippet.location}
      data-kpf-code-type="html"
      dangerouslySetInnerHTML={{ __html: code }}
    />
  );
}

/**
 * @param {{ snippets?: Array, slot?: 'header' | 'footer' }} props
 */
export default function CodeSnippetsRuntime({
  snippets: rawSnippets,
  slot = "header",
}) {
  const router = useRouter();
  const path = pathFromAsPath(router.asPath);
  const snippets = filterSnippetsForPath(rawSnippets, path).filter(
    (item) =>
      isSafePublicSnippet(item) &&
      (slot === "footer" ? item.location === "footer" : item.location !== "footer")
  );

  if (!snippets.length) {
    return null;
  }

  return (
    <div data-kpf-code-slot={slot}>
      {snippets.map((snippet) => (
        <SnippetMarkup
          key={`${slot}-${snippet.databaseId || snippet.name}`}
          snippet={snippet}
        />
      ))}
    </div>
  );
}
