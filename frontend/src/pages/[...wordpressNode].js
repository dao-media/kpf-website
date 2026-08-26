import { getWordPressProps, WordPressTemplate } from "@faustwp/core";

const { KPF_ISR_SECONDS, wordpressNodeStaticPaths } = require("@/lib/isr");

export default function Page(props) {
  return <WordPressTemplate {...props} />;
}

export function getStaticProps(ctx) {
  return getWordPressProps({ ctx, revalidate: KPF_ISR_SECONDS });
}

export async function getStaticPaths() {
  return wordpressNodeStaticPaths();
}
