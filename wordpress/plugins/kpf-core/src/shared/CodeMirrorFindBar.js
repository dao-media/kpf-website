import { useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

const MATCH_CLASS = 'cm-kpf-search-match';
const ACTIVE_CLASS = 'cm-kpf-search-match-active';

/**
 * Clear search marks from a CodeMirror 5 instance.
 * @param {object|null} editor
 */
export function clearSearchMarks(editor) {
	if (!editor?.getAllMarks) return;
	editor.getAllMarks().forEach((mark) => {
		if (mark?.className === MATCH_CLASS || mark?.className === ACTIVE_CLASS) {
			mark.clear();
		}
	});
}

/**
 * @param {object} editor CodeMirror instance
 * @param {string} query
 * @returns {{ from: object, to: object }[]}
 */
function collectMatches(editor, query) {
	if (!editor?.getSearchCursor || !query) return [];
	const matches = [];
	const cursor = editor.getSearchCursor(query, { line: 0, ch: 0 }, { caseFold: true });
	while (cursor.findNext()) {
		matches.push({ from: cursor.from(), to: cursor.to() });
	}
	return matches;
}

/**
 * Find bar for WordPress CodeMirror editors (Cmd/Ctrl+F).
 *
 * @param {{ editorRef: { current: object|null }, ready?: boolean, className?: string }} props
 */
export default function CodeMirrorFindBar({ editorRef, ready = false, className = '' }) {
	const inputRef = useRef(null);
	const inputIdRef = useRef(`kpf-code-find-${Math.random().toString(36).slice(2, 9)}`);
	const inputId = inputIdRef.current;
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const [index, setIndex] = useState(0);
	const [total, setTotal] = useState(0);
	const matchesRef = useRef([]);
	const openRef = useRef(false);
	const queryRef = useRef('');
	const indexRef = useRef(0);

	useEffect(() => {
		openRef.current = open;
	}, [open]);
	useEffect(() => {
		queryRef.current = query;
	}, [query]);
	useEffect(() => {
		indexRef.current = index;
	}, [index]);

	const paintMarks = useCallback((editor, matches, activeIndex) => {
		clearSearchMarks(editor);
		matches.forEach((match, i) => {
			editor.markText(match.from, match.to, {
				className: i === activeIndex ? ACTIVE_CLASS : MATCH_CLASS,
				clearOnEnter: false,
			});
		});
	}, []);

	const jumpTo = useCallback(
		(nextIndex, { focusEditor = false } = {}) => {
			const editor = editorRef.current;
			const matches = matchesRef.current;
			if (!editor || !matches.length) return;
			const safe = ((nextIndex % matches.length) + matches.length) % matches.length;
			const match = matches[safe];
			indexRef.current = safe;
			setIndex(safe);
			editor.setSelection(match.from, match.to);
			editor.scrollIntoView({ from: match.from, to: match.to }, 64);
			paintMarks(editor, matches, safe);
			if (focusEditor) editor.focus();
		},
		[editorRef, paintMarks]
	);

	const runSearch = useCallback(
		(nextQuery, { keepIndex = false } = {}) => {
			const editor = editorRef.current;
			const needle = String(nextQuery || '');
			queryRef.current = needle;
			setQuery(needle);

			if (!editor) {
				matchesRef.current = [];
				setTotal(0);
				setIndex(0);
				indexRef.current = 0;
				return;
			}

			if (!needle) {
				clearSearchMarks(editor);
				matchesRef.current = [];
				setTotal(0);
				setIndex(0);
				indexRef.current = 0;
				return;
			}

			const matches = collectMatches(editor, needle);
			matchesRef.current = matches;
			setTotal(matches.length);

			if (!matches.length) {
				clearSearchMarks(editor);
				setIndex(0);
				indexRef.current = 0;
				return;
			}

			let nextIndex = 0;
			if (keepIndex) {
				nextIndex = Math.min(indexRef.current, matches.length - 1);
			} else {
				const cursor = editor.getCursor('from');
				const ahead = matches.findIndex(
					(match) =>
						match.from.line > cursor.line ||
						(match.from.line === cursor.line && match.from.ch >= cursor.ch)
				);
				nextIndex = ahead === -1 ? 0 : ahead;
			}

			jumpTo(nextIndex, { focusEditor: false });
		},
		[editorRef, jumpTo]
	);

	const openFind = useCallback(() => {
		const editor = editorRef.current;
		const selected = editor?.getSelection?.()?.trim() || '';
		openRef.current = true;
		setOpen(true);
		window.requestAnimationFrame(() => {
			inputRef.current?.focus();
			inputRef.current?.select();
			if (selected) {
				runSearch(selected);
			} else if (queryRef.current) {
				runSearch(queryRef.current, { keepIndex: true });
			}
		});
	}, [editorRef, runSearch]);

	const closeFind = useCallback(() => {
		openRef.current = false;
		setOpen(false);
		clearSearchMarks(editorRef.current);
		editorRef.current?.focus();
	}, [editorRef]);

	useEffect(() => {
		if (!ready) return undefined;
		const editor = editorRef.current;
		if (!editor) return undefined;

		const prevKeys = editor.getOption('extraKeys') || {};
		editor.setOption('extraKeys', {
			...prevKeys,
			'Ctrl-F': () => openFind(),
			'Cmd-F': () => openFind(),
			'Ctrl-G': () => {
				if (!openRef.current) openFind();
				else jumpTo(indexRef.current + 1, { focusEditor: true });
			},
			'Cmd-G': () => {
				if (!openRef.current) openFind();
				else jumpTo(indexRef.current + 1, { focusEditor: true });
			},
			'Shift-Ctrl-G': () => {
				if (!openRef.current) openFind();
				else jumpTo(indexRef.current - 1, { focusEditor: true });
			},
			'Shift-Cmd-G': () => {
				if (!openRef.current) openFind();
				else jumpTo(indexRef.current - 1, { focusEditor: true });
			},
			Esc: () => {
				if (openRef.current) closeFind();
			},
		});

		const onChange = () => {
			if (!openRef.current || !queryRef.current) return;
			runSearch(queryRef.current, { keepIndex: true });
		};
		editor.on('change', onChange);

		return () => {
			editor.off('change', onChange);
			clearSearchMarks(editor);
		};
	}, [ready, editorRef, openFind, closeFind, jumpTo, runSearch]);

	useEffect(() => {
		const onKeyDown = (event) => {
			const isFind =
				(event.key === 'f' || event.key === 'F') && (event.metaKey || event.ctrlKey) && !event.altKey;
			if (!isFind) return;

			const editor = editorRef.current;
			const wrapper = editor?.getWrapperElement?.();
			if (!wrapper) return;

			const shell = wrapper.closest('.kpf-source-editor, .kpf-stylesheet-code');
			const target = event.target;
			const inShell = Boolean(shell?.contains(target));
			const inWrapper = Boolean(wrapper.contains(target));
			const inFind = Boolean(target?.closest?.('.kpf-code-find, .kpf-code-find-toggle'));
			if (!inShell && !inWrapper && !inFind) return;

			event.preventDefault();
			event.stopPropagation();
			openFind();
		};
		window.addEventListener('keydown', onKeyDown, true);
		return () => window.removeEventListener('keydown', onKeyDown, true);
	}, [editorRef, openFind]);

	if (!open) {
		return (
			<button
				type="button"
				className={`kpf-code-find-toggle ${className}`.trim()}
				onClick={openFind}
				aria-label={__('Find in file', 'kpf-core')}
				title={__('Find in file (⌘F / Ctrl+F)', 'kpf-core')}
			>
				{__('Find', 'kpf-core')}
			</button>
		);
	}

	return (
		<div className={`kpf-code-find ${className}`.trim()} role="search">
			<label className="screen-reader-text" htmlFor={inputId}>
				{__('Find in file', 'kpf-core')}
			</label>
			<input
				ref={inputRef}
				id={inputId}
				type="search"
				value={query}
				placeholder={__('Find…', 'kpf-core')}
				onChange={(event) => runSearch(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === 'Enter') {
						event.preventDefault();
						if (!matchesRef.current.length) {
							runSearch(query);
							return;
						}
						jumpTo(event.shiftKey ? index - 1 : index + 1, { focusEditor: false });
					} else if (event.key === 'Escape') {
						event.preventDefault();
						closeFind();
					}
				}}
			/>
			<span className="kpf-code-find-count" aria-live="polite">
				{query
					? total
						? sprintf(__('%1$d of %2$d', 'kpf-core'), index + 1, total)
						: __('No results', 'kpf-core')
					: ''}
			</span>
			<button
				type="button"
				className="kpf-code-find-nav"
				onClick={() => jumpTo(index - 1, { focusEditor: false })}
				disabled={!total}
				aria-label={__('Previous match', 'kpf-core')}
			>
				↑
			</button>
			<button
				type="button"
				className="kpf-code-find-nav"
				onClick={() => jumpTo(index + 1, { focusEditor: false })}
				disabled={!total}
				aria-label={__('Next match', 'kpf-core')}
			>
				↓
			</button>
			<button
				type="button"
				className="kpf-code-find-close"
				onClick={closeFind}
				aria-label={__('Close find', 'kpf-core')}
			>
				×
			</button>
		</div>
	);
}
