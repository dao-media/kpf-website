import { useMemo, useState } from '@wordpress/element';
import { Button, SearchControl, Snackbar } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

export default function TagLibrary({ tags = [], compact = false }) {
	const [query, setQuery] = useState('');
	const [copied, setCopied] = useState('');

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		if (!q) {
			return tags;
		}
		return tags.filter((tag) =>
			[tag.token, tag.label, tag.description, tag.group, tag.invocation]
				.join(' ')
				.toLowerCase()
				.includes(q)
		);
	}, [tags, query]);

	const groups = useMemo(() => {
		return filtered.reduce((acc, tag) => {
			const group = tag.group || 'General';
			if (!acc[group]) {
				acc[group] = [];
			}
			acc[group].push(tag);
			return acc;
		}, {});
	}, [filtered]);

	async function copyTag(invocation) {
		try {
			await navigator.clipboard.writeText(invocation);
		} catch (error) {
			const input = document.createElement('input');
			input.value = invocation;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
		}
		setCopied(invocation);
		setTimeout(() => setCopied(''), 1500);
	}

	return (
		<div className={compact ? 'kpf-tag-library is-compact' : 'kpf-tag-library'}>
			<SearchControl
				label={__('Search automatic placeholders', 'kpf-core')}
				value={query}
				onChange={setQuery}
				__nextHasNoMarginBottom
			/>
			<div className="kpf-tag-library__groups">
				{Object.entries(groups).map(([group, items]) => (
					<div key={group} className="kpf-tag-group">
						<h3 className="kpf-tag-group__title">{group}</h3>
						{items.map((tag) => (
							<div key={tag.token} className="kpf-tag-row">
								<div className="kpf-tag-row__header">
									<code>{tag.invocation}</code>
									<Button
										variant="secondary"
										size="compact"
										onClick={() => copyTag(tag.invocation)}
									>
										{__('Copy', 'kpf-core')}
									</Button>
								</div>
								<div className="kpf-tag-row__meta">
									<strong>{tag.label}</strong>
									<span>{tag.description}</span>
								</div>
							</div>
						))}
					</div>
				))}
				{filtered.length === 0 ? (
					<p className="kpf-tag-library__empty">
						{__('No placeholders match your search.', 'kpf-core')}
					</p>
				) : null}
			</div>
			{copied ? (
				<Snackbar>
					{__('Copied', 'kpf-core')}: {copied}
				</Snackbar>
			) : null}
		</div>
	);
}
