import Head from "next/head";
import { useRouter } from "next/router";
import SearchPage from "@/components/SearchPage";

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
