import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, FileText, Newspaper, Search, X } from "lucide-react";
import MiniSearch from "minisearch";

const INDEX_OPTIONS = {
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

const RESULT_LIMIT = 20;

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function ResultIcon({ type }) {
  const Component = type === "post" ? Newspaper : FileText;
  return <Component aria-hidden="true" size={18} strokeWidth={1.8} />;
}

export default function SearchPage({ initialQuery = "", onQueryChange }) {
  const inputRef = useRef(null);
  const [query, setQuery] = useState(initialQuery);
  const [syncedQuery, setSyncedQuery] = useState(initialQuery);
  const [index, setIndex] = useState(null);
  const [status, setStatus] = useState("loading");

  // Adjust state during render (instead of an effect) when the URL-driven
  // query changes, e.g. back/forward navigation or the header search box.
  if (initialQuery !== syncedQuery) {
    setSyncedQuery(initialQuery);
    setQuery(initialQuery);
  }

  useEffect(() => {
    const controller = new AbortController();

    fetch("/search-index.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Search index returned ${response.status}`);
        }
        return response.json();
      })
      .then((payload) => {
        const loaded = MiniSearch.loadJSON(
          JSON.stringify(payload.index),
          INDEX_OPTIONS
        );
        setIndex(loaded);
        setStatus("ready");
      })
      .catch((error) => {
        if (error.name !== "AbortError") setStatus("error");
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (status === "ready") inputRef.current?.focus();
  }, [status]);

  const normalizedQuery = query.trim();
  const results = useMemo(() => {
    if (!index || normalizedQuery.length < 2) return [];

    return index
      .search(normalizedQuery, {
        boost: { title: 5, terms: 2.5, excerpt: 2, body: 1 },
        combineWith: "AND",
        fuzzy: normalizedQuery.length > 4 ? 0.2 : 0.1,
        prefix: true,
      })
      .slice(0, RESULT_LIMIT);
  }, [index, normalizedQuery]);

  function updateQuery(value) {
    setQuery(value);
    onQueryChange?.(value);
  }

  let resultMessage = "Type at least two characters to search.";
  if (status === "loading") resultMessage = "Preparing search…";
  if (status === "error") {
    resultMessage = "Search is temporarily unavailable. Please try again later.";
  } else if (normalizedQuery.length >= 2 && status === "ready") {
    resultMessage =
      results.length === 1
        ? "1 result"
        : `${results.length} results`;
  }

  return (
    <main className="kpf-page kpf-search">
      <article className="kpf-page__article kpf-search__article">
        <header className="kpf-search__header">
          <span className="kpf-search__eyebrow">Explore the foundation</span>
          <h1>Search</h1>
          <p>
            Find stories, news, people, and information from across the site.
          </p>
        </header>

        <section className="kpf-search__panel" aria-labelledby="search-label">
          <label id="search-label" className="kpf-search__label" htmlFor="site-search">
            What are you looking for?
          </label>
          <div className="kpf-search__input-wrap">
            <Search aria-hidden="true" size={22} strokeWidth={1.8} />
            <input
              ref={inputRef}
              id="site-search"
              type="search"
              autoComplete="off"
              spellCheck="false"
              value={query}
              placeholder="Try a name, place, event, or topic"
              onChange={(event) => updateQuery(event.target.value)}
            />
            {query ? (
              <button
                type="button"
                className="kpf-search__clear"
                aria-label="Clear search"
                onClick={() => {
                  updateQuery("");
                  inputRef.current?.focus();
                }}
              >
                <X aria-hidden="true" size={18} />
              </button>
            ) : null}
          </div>
          <p className="kpf-search__status" role="status" aria-live="polite">
            {resultMessage}
          </p>
        </section>

        {status === "ready" && normalizedQuery.length >= 2 ? (
          results.length ? (
            <ol className="kpf-search-results">
              {results.map((result) => (
                <li key={result.id}>
                  <a className="kpf-search-result" href={result.url}>
                    <span className="kpf-search-result__icon">
                      <ResultIcon type={result.type} />
                    </span>
                    <span className="kpf-search-result__body">
                      <span className="kpf-search-result__meta">
                        {result.typeLabel}
                        {formatDate(result.date) ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <time dateTime={result.date}>{formatDate(result.date)}</time>
                          </>
                        ) : null}
                      </span>
                      <strong>{result.title}</strong>
                      {result.excerpt ? <span>{result.excerpt}</span> : null}
                    </span>
                    <ArrowUpRight
                      className="kpf-search-result__arrow"
                      aria-hidden="true"
                      size={20}
                      strokeWidth={1.8}
                    />
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <div className="kpf-search__empty">
              <Search aria-hidden="true" size={28} strokeWidth={1.6} />
              <h2>No matches yet</h2>
              <p>Try a shorter phrase, a different spelling, or a broader topic.</p>
            </div>
          )
        ) : null}
      </article>
    </main>
  );
}
