export default function WordPressContent({
	title,
	content,
	as = "main",
	showTitle = true,
}) {
	const Element = as;

	return (
		<Element className="kpf-page">
			<article className="kpf-page__article">
				{showTitle && title ? (
					<header className="kpf-page__header">
						<h1>{title}</h1>
					</header>
				) : null}
				{content ? (
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
