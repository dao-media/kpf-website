import apiFetch from '@wordpress/api-fetch';
import { useCallback, useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

const GROUP_LABELS = {
	page: __('Page', 'kpf-core'),
	media: __('Media', 'kpf-core'),
	seo: __('SEO (design)', 'kpf-core'),
	seo_patterns: __('SEO patterns (%%)', 'kpf-core'),
	fields: __('Fields', 'kpf-core'),
	library: __('Media library', 'kpf-core'),
};

const GROUP_ORDER = ['page', 'media', 'seo', 'seo_patterns', 'fields', 'library'];

function discoverFieldTags(source) {
	if (!source || typeof source !== 'string') return [];
	const found = new Map();
	const pattern = /\{\{\{\s*fields\.([a-zA-Z0-9_]+)\s*\}\}\}|\{\{\s*fields\.([a-zA-Z0-9_]+)\s*\}\}/g;
	let match;
	while ((match = pattern.exec(source)) !== null) {
		const key = match[1] || match[2];
		if (!key || found.has(key)) continue;
		found.set(key, {
			token: `{{fields.${key}}}`,
			label: key.replace(/_/g, ' '),
			description: __('Field used in this design.', 'kpf-core'),
			group: 'fields',
		});
	}
	return Array.from(found.values());
}

function getTrigger(cm) {
	const cursor = cm.getCursor();
	const line = cm.getLine(cursor.line) || '';
	const before = line.slice(0, cursor.ch);

	const percentIndex = before.lastIndexOf('%%');
	const braceIndex = before.lastIndexOf('{{');
	const dollarIndex = before.lastIndexOf('$');

	const candidates = [];
	if (percentIndex >= 0) {
		candidates.push({ type: 'percent', index: percentIndex });
	}
	if (braceIndex >= 0) {
		candidates.push({ type: 'brace', index: braceIndex });
	}
	if (dollarIndex >= 0) {
		candidates.push({ type: 'dollar', index: dollarIndex });
	}
	if (!candidates.length) {
		return null;
	}

	candidates.sort((a, b) => b.index - a.index);
	const chosen = candidates[0];

	if (chosen.type === 'percent') {
		const after = before.slice(percentIndex + 2);
		if (after.includes('%%') || after.includes('\n')) {
			return null;
		}
		return {
			type: 'percent',
			from: { line: cursor.line, ch: percentIndex },
			to: cursor,
			query: after,
		};
	}

	if (chosen.type === 'brace') {
		const after = before.slice(braceIndex + 2);
		if (after.includes('}}') || after.includes('\n')) {
			return null;
		}
		return {
			type: 'brace',
			from: { line: cursor.line, ch: braceIndex },
			to: cursor,
			query: after,
		};
	}

	const afterDollar = before.slice(dollarIndex + 1);
	if (/[\s<>"'`]/.test(afterDollar) || afterDollar.includes('{{') || afterDollar.includes('%%')) {
		return null;
	}
	if (dollarIndex > 0 && /[A-Za-z0-9_]/.test(before[dollarIndex - 1])) {
		return null;
	}

	return {
		type: 'dollar',
		from: { line: cursor.line, ch: dollarIndex },
		to: cursor,
		query: afterDollar,
	};
}

function filterItems(items, query, triggerType) {
	let list = [...items];
	if (triggerType === 'percent') {
		list = list.filter((item) => item.group === 'seo_patterns' || String(item.token || '').startsWith('%%'));
	}

	const q = (query || '').trim().toLowerCase();
	if (q) {
		list = list.filter((item) => {
			const haystack = `${item.label} ${item.token} ${item.description || ''} ${item.group || ''}`.toLowerCase();
			return haystack.includes(q);
		});
	}

	list.sort((a, b) => {
		const rank = (group) => {
			const index = GROUP_ORDER.indexOf(group);
			return index === -1 ? 999 : index;
		};
		const byGroup = rank(a.group) - rank(b.group);
		return byGroup !== 0 ? byGroup : a.label.localeCompare(b.label);
	});

	return list;
}

function groupItems(items) {
	const buckets = {};
	items.forEach((item) => {
		const key = item.group || 'page';
		if (!buckets[key]) {
			buckets[key] = [];
		}
		buckets[key].push(item);
	});

	const orderedKeys = [
		...GROUP_ORDER.filter((key) => buckets[key]?.length),
		...Object.keys(buckets).filter((key) => !GROUP_ORDER.includes(key)),
	];

	return orderedKeys.map((key) => ({
		key,
		label: GROUP_LABELS[key] || key,
		items: buckets[key],
	}));
}

/**
 * CodeMirror 5 tag picker for {{, $, and %% triggers.
 */
export default function useTagAutocomplete(editorRef, { enabled, staticPlaceholders, sourceHtml }) {
	const [open, setOpen] = useState(false);
	const [items, setItems] = useState([]);
	const [activeIndex, setActiveIndex] = useState(0);
	const [coords, setCoords] = useState({ top: 0, left: 0 });
	const [query, setQuery] = useState('');
	const [triggerType, setTriggerType] = useState('dollar');
	const triggerRef = useRef(null);
	const mediaCacheRef = useRef([]);
	const menuRef = useRef(null);
	const openRef = useRef(false);
	const itemsRef = useRef([]);
	const activeIndexRef = useRef(0);

	useEffect(() => {
		openRef.current = open;
	}, [open]);
	useEffect(() => {
		itemsRef.current = items;
	}, [items]);
	useEffect(() => {
		activeIndexRef.current = activeIndex;
	}, [activeIndex]);

	const fieldTags = useMemo(() => discoverFieldTags(sourceHtml), [sourceHtml]);

	const baseItems = useMemo(() => {
		const merged = new Map();
		[...(staticPlaceholders || []), ...fieldTags].forEach((item) => {
			if (item?.token) {
				merged.set(item.token, item);
			}
		});
		return Array.from(merged.values());
	}, [staticPlaceholders, fieldTags]);

	const loadMedia = useCallback(async (search) => {
		try {
			const path = search
				? `/wp/v2/media?per_page=20&search=${encodeURIComponent(search)}&_fields=id,source_url,title,alt_text,mime_type,media_details`
				: '/wp/v2/media?per_page=20&orderby=date&order=desc&_fields=id,source_url,title,alt_text,mime_type,media_details';
			const results = await apiFetch({ path });
			const mapped = (Array.isArray(results) ? results : []).map((media) => {
				const title = (media.title?.rendered || media.title?.raw || `Media #${media.id}`)
					.replace(/<[^>]+>/g, '')
					.trim();
				const url = media.source_url || '';
				return {
					token: url,
					label: title || url,
					description: media.alt_text || media.mime_type || __('Media library file', 'kpf-core'),
					group: 'library',
					kind: 'media-url',
				};
			});
			mediaCacheRef.current = mapped;
			return mapped;
		} catch (error) {
			return mediaCacheRef.current;
		}
	}, []);

	const debounceRef = useRef(0);

	const refreshList = useCallback(
		(trigger) => {
			if (!trigger) {
				window.clearTimeout(debounceRef.current);
				setOpen(false);
				triggerRef.current = null;
				return;
			}

			triggerRef.current = trigger;
			setQuery(trigger.query);
			setTriggerType(trigger.type);

			const pool =
				trigger.type === 'percent'
					? baseItems
					: [...baseItems, ...mediaCacheRef.current];
			const immediate = filterItems(pool, trigger.query, trigger.type);
			setItems(immediate);
			setActiveIndex(0);
			setOpen(true);

			if (trigger.type === 'percent') {
				return;
			}

			window.clearTimeout(debounceRef.current);
			debounceRef.current = window.setTimeout(async () => {
				const media = await loadMedia(trigger.query);
				const next = filterItems([...baseItems, ...media], trigger.query, trigger.type);
				setItems(next);
				setActiveIndex(0);
				setOpen(true);
			}, 160);
		},
		[baseItems, loadMedia]
	);

	const insertItem = useCallback(
		(item) => {
			const cm = editorRef.current;
			const trigger = triggerRef.current;
			if (!cm || !trigger || !item) return;

			let insertion = item.token;
			if (item.kind === 'media-url') {
				insertion = item.token;
			} else if (item.token.startsWith('%%') || item.token.startsWith('{{')) {
				insertion = item.token;
			} else {
				insertion = `{{${item.token}}}`;
			}

			cm.focus();
			cm.replaceRange(insertion, trigger.from, trigger.to);
			setOpen(false);
			triggerRef.current = null;
		},
		[editorRef]
	);

	useEffect(() => {
		const cm = editorRef.current;
		if (!cm || !enabled) {
			setOpen(false);
			return undefined;
		}

		const updatePosition = () => {
			const trigger = getTrigger(cm);
			if (!trigger) {
				setOpen(false);
				triggerRef.current = null;
				return;
			}
			const pos = cm.cursorCoords(true, 'page');
			setCoords({ top: pos.bottom + 6, left: pos.left });
			refreshList(trigger);
		};

		const onCursorOrChange = () => {
			window.requestAnimationFrame(updatePosition);
		};

		cm.on('cursorActivity', onCursorOrChange);
		cm.on('changes', onCursorOrChange);
		cm.on('focus', onCursorOrChange);

		const onKeyDown = (instance, event) => {
			if (!openRef.current || !itemsRef.current.length) return;
			const list = itemsRef.current;
			if (event.key === 'ArrowDown') {
				event.preventDefault();
				setActiveIndex((index) => (index + 1) % list.length);
			} else if (event.key === 'ArrowUp') {
				event.preventDefault();
				setActiveIndex((index) => (index - 1 + list.length) % list.length);
			} else if (event.key === 'Enter' || event.key === 'Tab') {
				event.preventDefault();
				insertItem(list[activeIndexRef.current] || list[0]);
			} else if (event.key === 'Escape') {
				event.preventDefault();
				setOpen(false);
				triggerRef.current = null;
			}
		};

		cm.on('keydown', onKeyDown);

		return () => {
			cm.off('cursorActivity', onCursorOrChange);
			cm.off('changes', onCursorOrChange);
			cm.off('focus', onCursorOrChange);
			cm.off('keydown', onKeyDown);
		};
	}, [editorRef, enabled, insertItem, refreshList]);

	useEffect(() => {
		if (!open || !menuRef.current) return;
		const active = menuRef.current.querySelector('[data-active="true"]');
		active?.scrollIntoView({ block: 'nearest' });
	}, [activeIndex, open]);

	const sections = useMemo(() => groupItems(items), [items]);
	let flatIndex = -1;

	if (!enabled || !open) {
		return null;
	}

	return (
		<div
			ref={menuRef}
			className="kpf-tag-autocomplete"
			style={{ top: coords.top, left: coords.left }}
			role="listbox"
			aria-label={__('Insert content or media tag', 'kpf-core')}
		>
			<div className="kpf-tag-autocomplete__hint">
				{query
					? sprintf(__('Filtering: “%s”', 'kpf-core'), query)
					: triggerType === 'percent'
						? __('SEO %% patterns · filter · Enter to insert', 'kpf-core')
						: __('Type $, {{, or %% · filter · Enter to insert', 'kpf-core')}
			</div>
			{items.length ? (
				<div className="kpf-tag-autocomplete__scroller">
					{sections.map((section) => (
						<section key={section.key} className="kpf-tag-autocomplete__section">
							<h4 className="kpf-tag-autocomplete__section-title">{section.label}</h4>
							<ul className="kpf-tag-autocomplete__list">
								{section.items.map((item) => {
									flatIndex += 1;
									const index = flatIndex;
									return (
										<li key={`${item.group}-${item.token}-${index}`}>
											<button
												type="button"
												role="option"
												aria-selected={index === activeIndex}
												data-active={index === activeIndex ? 'true' : 'false'}
												className={index === activeIndex ? 'is-active' : ''}
												onMouseDown={(event) => {
													event.preventDefault();
													insertItem(item);
												}}
												onMouseEnter={() => setActiveIndex(index)}
											>
												<span className="kpf-tag-autocomplete__meta">
													<span className="kpf-tag-autocomplete__label">{item.label}</span>
													{item.description ? (
														<span className="kpf-tag-autocomplete__desc">
															{item.description}
														</span>
													) : null}
												</span>
												<code className="kpf-tag-autocomplete__token">{item.token}</code>
											</button>
										</li>
									);
								})}
							</ul>
						</section>
					))}
				</div>
			) : (
				<p className="kpf-tag-autocomplete__empty">
					{__('No matching content or media.', 'kpf-core')}
				</p>
			)}
		</div>
	);
}
