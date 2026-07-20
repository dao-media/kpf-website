import { __ } from '@wordpress/i18n';
import './labelWithTag.css';

async function copyText(value) {
	try {
		await navigator.clipboard.writeText(value);
		return;
	} catch {
		const input = document.createElement('input');
		input.value = value;
		document.body.appendChild(input);
		input.select();
		document.execCommand('copy');
		document.body.removeChild(input);
	}
}

/**
 * Field label with a copyable tag chip (SEO %%tokens%% or design Mustache tags).
 */
export default function LabelWithTag({ children, tag, copyLabel }) {
	if (!tag) {
		return children;
	}

	const isSeoPlaceholder = String(tag).startsWith('%%');
	const actionLabel =
		copyLabel ||
		(isSeoPlaceholder
			? __('Copy placeholder', 'kpf-core')
			: __('Copy design tag', 'kpf-core'));

	return (
		<span className="kpf-label-with-tag">
			<span className="kpf-label-with-tag__text">{children}</span>
			<button
				type="button"
				className="kpf-label-with-tag__chip"
				title={actionLabel}
				aria-label={actionLabel + ': ' + tag}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					copyText(tag);
				}}
			>
				<code>{tag}</code>
			</button>
		</span>
	);
}
