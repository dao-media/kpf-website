import BlockRenderer from "@/components/BlockRenderer";

export default function WordPressContent({
	title,
	content,
	blocks,
	as = "main",
	showTitle = true,
}) {
	const Element = as;
	const hasBlocks = Array.isArray(blocks) && blocks.length > 0;

	return (
		<Element className="kpf-page">
			<article className="kpf-page__article">
				{showTitle && title ? (
					<header className="kpf-page__header">
						<h1>{title}</h1>
					</header>
				) : null}
				{hasBlocks ? (
					<div className="kpf-content" data-kpf-block-renderer>
						<BlockRenderer blocks={blocks} />
					</div>
				) : content ? (
					<div
						className="kpf-content"
						// WordPress applies KSES when editor content is saved. Only
						// trusted WordPress authors can supply this rendered HTML.
						dangerouslySetInnerHTML={{ __html: content }}
					/>
				) : null}
			</article>
		</Element>
	);
}
