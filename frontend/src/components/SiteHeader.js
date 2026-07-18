import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Search } from "lucide-react";

export default function SiteHeader() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function onSubmit(event) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(
      trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search"
    );
  }

  return (
    <header className="kpf-site-header">
      <div className="kpf-site-header__inner">
        <Link className="kpf-site-header__brand" href="/">
          Kevin Popke Foundation
        </Link>

        <form
          className="kpf-site-header__search"
          role="search"
          action="/search"
          method="get"
          onSubmit={onSubmit}
        >
          <label className="kpf-site-header__search-label" htmlFor="kpf-header-search">
            Search the site
          </label>
          <Search aria-hidden="true" size={18} strokeWidth={1.8} />
          <input
            id="kpf-header-search"
            name="q"
            type="search"
            autoComplete="off"
            placeholder="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </div>
    </header>
  );
}
