import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { Button, SearchControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import './seoPlaceholderGuide.css';

async function copyText(value) {
	try {
		await navigator.clipboard.writeText(value);
		return true;
	} catch {
		const input = document.createElement('input');
		input.value = value;
		document.body.appendChild(input);
		input.select();
		document.execCommand('copy');
		document.body.removeChild(input);
		return true;
	}
}

/**
 * Toggleable tooltip-style scroller listing every active SEO %% placeholder.
 */
export default function SeoPlaceholderGuide({ tags = [], className = '' }) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [copied, setCopied] = useState('');
	const rootRef = useRef(null);
	const searchRef = useRef(null);

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
			const group = tag.group || __('General', 'kpf-core');
			if (!acc[group]) {
				acc[group] = [];
			}
			acc[group].push(tag);
			return acc;
		}, {});
	}, [filtered]);

	useEffect(() => {
		if (!open) {
			return undefined;
		}

		function onPointerDown(event) {
			if (rootRef.current && !rootRef.current.contains(event.target)) {
				setOpen(false);
			}
		}

		function onKeyDown(event) {
			if (event.key === 'Escape') {
				setOpen(false);
			}
		}

		document.addEventListener('mousedown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);
		window.setTimeout(() => {
			searchRef.current?.querySelector('input')?.focus();
		}, 0);

		return () => {
			document.removeEventListener('mousedown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	}, [open]);

	async function handleCopy(invocation) {
		await copyText(invocation);
		setCopied(invocation);
		window.setTimeout(() => setCopied(''), 1400);
	}

	const count = tags.length;

	return (
		<div
			className={`kpf-seo-placeholder-guide ${open ? 'is-open' : ''} ${className}`.trim()}
			ref={rootRef}
		>
			<Button
				className="kpf-seo-placeholder-guide__toggle"
				variant={open ? 'primary' : 'secondary'}
				size="compact"
				aria-expanded={open}
				aria-controls="kpf-seo-placeholder-guide-panel"
				onClick={() => setOpen((value) => !value)}
			>
				{open
					? __('Hide Dynamic Tags', 'kpf-core')
					: __('Review Dynamic Tags', 'kpf-core')}
				{!open && count > 0 ? (
					<span className="kpf-seo-placeholder-guide__count">{count}</span>
				) : null}
			</Button>

			{open ? (
				<div
					id="kpf-seo-placeholder-guide-panel"
					className="kpf-seo-placeholder-guide__panel"
					role="dialog"
					aria-label={__('Active SEO placeholders', 'kpf-core')}
				>
					<div className="kpf-seo-placeholder-guide__caret" aria-hidden="true" />
					<header className="kpf-seo-placeholder-guide__header">
						<div>
							<strong>{__('Active SEO placeholders', 'kpf-core')}</strong>
							<p>
								{__(
									'Valid %% tokens for title and description patterns. Click Copy, then paste into a field.',
									'kpf-core'
								)}
							</p>
						</div>
						<Button
							size="compact"
							variant="tertiary"
							onClick={() => setOpen(false)}
							aria-label={__('Close placeholders', 'kpf-core')}
						>
							{__('Close', 'kpf-core')}
						</Button>
					</header>

					<div className="kpf-seo-placeholder-guide__search" ref={searchRef}>
						<SearchControl
							label={__('Filter placeholders', 'kpf-core')}
							hideLabelFromVision
							placeholder={__('Filter placeholders…', 'kpf-core')}
							value={query}
							onChange={setQuery}
							__nextHasNoMarginBottom
						/>
					</div>

					<div className="kpf-seo-placeholder-guide__scroller">
						{Object.keys(groups).length === 0 ? (
							<p className="kpf-seo-placeholder-guide__empty">
								{count === 0
									? __('No placeholders loaded yet.', 'kpf-core')
									: __('No placeholders match your filter.', 'kpf-core')}
							</p>
						) : (
							Object.entries(groups).map(([group, items]) => (
								<section key={group} className="kpf-seo-placeholder-guide__group">
									<h4 className="kpf-seo-placeholder-guide__group-title">{group}</h4>
									<ul className="kpf-seo-placeholder-guide__list">
										{items.map((tag) => (
											<li key={tag.token} className="kpf-seo-placeholder-guide__item">
												<div className="kpf-seo-placeholder-guide__item-main">
													<code>{tag.invocation}</code>
													<span className="kpf-seo-placeholder-guide__item-label">
														{tag.label}
													</span>
													{tag.description ? (
														<span className="kpf-seo-placeholder-guide__item-desc">
															{tag.description}
														</span>
													) : null}
												</div>
												<Button
													size="compact"
													variant="secondary"
													onClick={() => handleCopy(tag.invocation)}
												>
													{copied === tag.invocation
														? __('Copied', 'kpf-core')
														: __('Copy', 'kpf-core')}
												</Button>
											</li>
										))}
									</ul>
								</section>
							))
						)}
					</div>
				</div>
			) : null}
		</div>
	);
}
