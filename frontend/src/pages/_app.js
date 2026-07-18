import { useRouter } from "next/router";
import { FaustProvider } from "@faustwp/core";
import SiteHeader from "@/components/SiteHeader";
import "../../faust.config";
import "@/styles/components.css";

export default function App({ Component, pageProps }) {
  const router = useRouter();

  return (
    <FaustProvider pageProps={pageProps}>
      <SiteHeader />
      <Component {...pageProps} key={router.asPath} />
    </FaustProvider>
  );
}
