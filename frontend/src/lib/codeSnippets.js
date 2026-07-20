const KPF_CODE_SNIPPETS_QUERY = `
  kpfCodeSnippets {
    databaseId
    name
    location
    type
    code
    scope
    urls
  }
`;

function normalizePath(path) {
  let next = String(path || "").trim();
  if (!next) return "/";

  if (/^https?:\/\//i.test(next)) {
    try {
      next = new URL(next).pathname || "/";
    } catch {
      next = "/";
    }
  }

  next = `/${next.replace(/^\/+/, "")}`;
  if (next.length > 1 && next.endsWith("/")) {
    next = next.slice(0, -1);
  }

  return next || "/";
}

function pathFromAsPath(asPath) {
  const raw = String(asPath || "/");
  const withoutHash = raw.split("#")[0] || "/";
  const withoutQuery = withoutHash.split("?")[0] || "/";
  return normalizePath(withoutQuery);
}

function pathMatches(path, patterns) {
  const normalizedPath = normalizePath(path);
  if (!Array.isArray(patterns) || patterns.length === 0) {
    return false;
  }

  return patterns.some((pattern) => {
    let next = String(pattern || "").trim();
    if (!next) return false;

    const wildcard = next.endsWith("*");
    if (wildcard) {
      next = next.slice(0, -1);
    }

    const normalized = normalizePath(next);
    if (wildcard) {
      if (normalized === "/") return true;
      return (
        normalizedPath === normalized ||
        normalizedPath.startsWith(`${normalized}/`)
      );
    }

    return normalizedPath === normalized;
  });
}

function snippetApplies(snippet, path) {
  if (!snippet || !String(snippet.code || "").trim()) {
    return false;
  }

  if ((snippet.scope || "global") === "global") {
    return true;
  }

  return pathMatches(path, snippet.urls || []);
}

function filterSnippetsForPath(snippets, path) {
  const list = Array.isArray(snippets) ? snippets : [];
  return list.filter((snippet) => snippetApplies(snippet, path));
}

module.exports = {
  KPF_CODE_SNIPPETS_QUERY,
  filterSnippetsForPath,
  normalizePath,
  pathFromAsPath,
  pathMatches,
  snippetApplies,
};
