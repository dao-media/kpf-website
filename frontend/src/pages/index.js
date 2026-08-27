import { getWordPressProps, WordPressTemplate } from "@faustwp/core";

const { KPF_ISR_SECONDS } = require("@/lib/isr");
const { withoutApolloState } = require("@/lib/withoutApolloState");

export default function Page(props) {
  return <WordPressTemplate {...props} />;
}

export async function getStaticProps(ctx) {
  const result = await getWordPressProps({ ctx, revalidate: KPF_ISR_SECONDS });
  return withoutApolloState(result);
}
