import apiFetch from '@wordpress/api-fetch';
import { Button, Notice, Spinner } from '@wordpress/components';
import { createRoot, useCallback, useEffect, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import './admin.scss';

apiFetch.use(apiFetch.createNonceMiddleware(window.kpfStylesheetAdmin?.nonce || ''));

const REST_BASE = (window.kpfStylesheetAdmin?.restBase || '/wp-json/kpf-stylesheet/v1').replace(
	/\/$/,
	''
);
const MAX_BYTES = Number(window.kpfStylesheetAdmin?.maxBytes || 1048576);
const CODE_EDITOR_SETTINGS = window.kpfStylesheetAdmin?.codeEditor || {};

function formatBytes(bytes) {
	if (bytes < 1024) return sprintf(__('%d B', 'kpf-core'), bytes);
	if (bytes < 1024 * 1024) return sprintf(__('%s KB', 'kpf-core'), (bytes / 1024).toFixed(1));
	return sprintf(__('%s MB', 'kpf-core'), (bytes / (1024 * 1024)).toFixed(2));
}

function CssEditor({ value, onChange }) {
	const textareaRef = useRef(null);
	const editorRef = useRef(null);
	const onChangeRef = useRef(onChange);

	useEffect(() => {
		onChangeRef.current = onChange;
	}, [onChange]);

	useEffect(() => {
		if (!textareaRef.current || !window.wp?.codeEditor?.initialize) return undefined;
		const settings = {
			...CODE_EDITOR_SETTINGS,
			codemirror: {
				...(CODE_EDITOR_SETTINGS.codemirror || {}),
				mode: 'text/css',
				lineNumbers: true,
				lineWrapping: false,
				indentUnit: 2,
				tabSize: 2,
				autofocus: true,
			},
		};
		const instance = window.wp.codeEditor.initialize(textareaRef.current, settings);
		const editor = instance?.codemirror;
		if (!editor) return undefined;
		editorRef.current = editor;
		editor.on('change', (changedEditor, change) => {
			if (change.origin !== 'setValue') onChangeRef.current(changedEditor.getValue());
		});
		return () => {
			editor.toTextArea();
			editorRef.current = null;
		};
	}, []);

	useEffect(() => {
		const editor = editorRef.current;
		if (!editor || editor.getValue() === value) return;
		editor.setValue(value);
		editor.refresh();
	}, [value]);

	return (
		<div className="kpf-stylesheet-code">
			<label className="screen-reader-text" htmlFor="kpf-global-stylesheet">
				{__('Global stylesheet source', 'kpf-core')}
			</label>
			<textarea
				ref={textareaRef}
				id="kpf-global-stylesheet"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				spellCheck="false"
			/>
		</div>
	);
}

function HistoryPanel({ items, loading, error, restoring, onRestore, onClose }) {
	return (
		<aside className="kpf-stylesheet-history" aria-label={__('Stylesheet version history', 'kpf-core')}>
			<header>
				<div>
					<p>{__('Stylesheet archive', 'kpf-core')}</p>
					<h2>{__('Version history', 'kpf-core')}</h2>
				</div>
				<Button variant="tertiary" onClick={onClose} aria-label={__('Close version history', 'kpf-core')}>
					×
				</Button>
			</header>
			{error ? <Notice status="error" isDismissible={false}>{error}</Notice> : null}
			{loading ? (
				<div className="kpf-stylesheet-history-loading"><Spinner /></div>
			) : items.length ? (
				<div className="kpf-stylesheet-version-list">
					{items.map((item) => (
						<article key={item.id}>
							<div>
								<strong>{item.dateDisplay}</strong>
								<span>{item.author} · {formatBytes(item.bytes)}</span>
								<code>{item.summary}</code>
							</div>
							<Button
								variant="secondary"
								onClick={() => onRestore(item)}
								isBusy={restoring === item.id}
								disabled={Boolean(restoring)}
							>
								{__('Restore', 'kpf-core')}
							</Button>
						</article>
					))}
				</div>
			) : (
				<div className="kpf-stylesheet-history-empty">
					<strong>{__('No saved versions yet', 'kpf-core')}</strong>
					<p>{__('Versions will appear after the stylesheet is changed and saved.', 'kpf-core')}</p>
				</div>
			)}
		</aside>
	);
}

function App() {
	const [stylesheet, setStylesheet] = useState(null);
	const [css, setCss] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [historyOpen, setHistoryOpen] = useState(false);
	const [history, setHistory] = useState([]);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [historyError, setHistoryError] = useState('');
	const [restoring, setRestoring] = useState(0);
	const [historyLimit, setHistoryLimit] = useState(20);
	const [historyMinimum, setHistoryMinimum] = useState(2);
	const [historyMaximum, setHistoryMaximum] = useState(100);
	const [settingsSaving, setSettingsSaving] = useState(false);

	useEffect(() => {
		Promise.all([
			apiFetch({ url: `${REST_BASE}/stylesheet` }),
			apiFetch({ url: `${REST_BASE}/settings` }),
		])
			.then(([source, settings]) => {
				setStylesheet(source);
				setCss(source.css || '');
				setHistoryLimit(Number(settings.historyLimit || 20));
				setHistoryMinimum(Number(settings.minimum || 2));
				setHistoryMaximum(Number(settings.maximum || 100));
			})
			.catch((err) => setError(err?.message || __('Could not load the stylesheet.', 'kpf-core')))
			.finally(() => setLoading(false));
	}, []);

	const dirty = Boolean(stylesheet && css !== stylesheet.css);
	const bytes = new Blob([css]).size;

	const loadHistory = useCallback(async () => {
		setHistoryLoading(true);
		setHistoryError('');
		try {
			const response = await apiFetch({ url: `${REST_BASE}/revisions` });
			setHistory(response.revisions || []);
			setHistoryLimit(Number(response.limit || historyLimit));
		} catch (err) {
			setHistoryError(err?.message || __('Could not load version history.', 'kpf-core'));
		} finally {
			setHistoryLoading(false);
		}
	}, [historyLimit]);

	useEffect(() => {
		if (historyOpen) loadHistory();
	}, [historyOpen, loadHistory]);

	const save = useCallback(async () => {
		if (!stylesheet || saving) return;
		if (bytes > MAX_BYTES) {
			setError(__('The stylesheet must be 1 MB or smaller.', 'kpf-core'));
			return;
		}
		setSaving(true);
		setError('');
		setNotice('');
		try {
			const response = await apiFetch({
				url: `${REST_BASE}/stylesheet`,
				method: 'POST',
				data: { css, revision: stylesheet.revision },
			});
			setStylesheet(response);
			setCss(response.css || '');
			setNotice(__('Stylesheet saved. A full frontend cache refresh was requested.', 'kpf-core'));
			if (historyOpen) await loadHistory();
		} catch (err) {
			setError(err?.message || __('Could not save the stylesheet.', 'kpf-core'));
		} finally {
			setSaving(false);
		}
	}, [bytes, css, historyOpen, loadHistory, saving, stylesheet]);

	useEffect(() => {
		function saveShortcut(event) {
			if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
				event.preventDefault();
				save();
			}
		}
		window.addEventListener('keydown', saveShortcut);
		return () => window.removeEventListener('keydown', saveShortcut);
	}, [save]);

	async function restoreVersion(version) {
		if (dirty && !window.confirm(__('Discard unsaved changes and restore this version?', 'kpf-core'))) {
			return;
		}
		if (!window.confirm(sprintf(__('Restore the stylesheet from %s?', 'kpf-core'), version.dateDisplay))) {
			return;
		}
		setRestoring(version.id);
		setHistoryError('');
		setNotice('');
		try {
			const response = await apiFetch({
				url: `${REST_BASE}/revisions/${version.id}/restore`,
				method: 'POST',
				data: { revision: stylesheet.revision },
			});
			setStylesheet(response.stylesheet);
			setCss(response.stylesheet.css || '');
			setNotice(__('Version restored. The previous stylesheet remains in history.', 'kpf-core'));
			await loadHistory();
		} catch (err) {
			setHistoryError(err?.message || __('Could not restore that version.', 'kpf-core'));
		} finally {
			setRestoring(0);
		}
	}

	async function saveHistoryLimit() {
		setSettingsSaving(true);
		setError('');
		try {
			const response = await apiFetch({
				url: `${REST_BASE}/settings`,
				method: 'POST',
				data: { historyLimit },
			});
			setHistoryLimit(Number(response.historyLimit));
			setNotice(__('Version history setting saved.', 'kpf-core'));
		} catch (err) {
			setError(err?.message || __('Could not save the version history setting.', 'kpf-core'));
		} finally {
			setSettingsSaving(false);
		}
	}

	if (loading) {
		return <div className="kpf-stylesheet-loading"><Spinner /></div>;
	}

	return (
		<div className="kpf-stylesheet-shell">
			<header className="kpf-stylesheet-header">
				<div>
					<p>{__('Appearance', 'kpf-core')}</p>
					<h1>{__('Stylesheet', 'kpf-core')}</h1>
					<span>{__('Global CSS applied across the headless frontend.', 'kpf-core')}</span>
				</div>
				<div className="kpf-stylesheet-actions">
					<span className={dirty ? 'is-dirty' : ''}>
						{dirty ? __('Unsaved changes', 'kpf-core') : __('All changes saved', 'kpf-core')}
					</span>
					<Button
						variant="secondary"
						aria-expanded={historyOpen}
						onClick={() => setHistoryOpen((open) => !open)}
					>
						{__('Version history', 'kpf-core')}
					</Button>
					<Button variant="primary" onClick={save} isBusy={saving} disabled={saving || !dirty}>
						{__('Save stylesheet', 'kpf-core')}
					</Button>
				</div>
			</header>

			{error ? <Notice status="error" onRemove={() => setError('')}>{error}</Notice> : null}
			{notice ? <Notice status="success" onRemove={() => setNotice('')}>{notice}</Notice> : null}

			<div className="kpf-stylesheet-toolbar">
				<div>
					<span className="kpf-stylesheet-file-dot" />
					<strong>global.css</strong>
					<code>{formatBytes(bytes)} / 1 MB</code>
				</div>
				<div className="kpf-stylesheet-retention">
					<label htmlFor="kpf-stylesheet-history-limit">{__('Versions to keep', 'kpf-core')}</label>
					<input
						id="kpf-stylesheet-history-limit"
						type="number"
						min={historyMinimum}
						max={historyMaximum}
						value={historyLimit}
						onChange={(event) => setHistoryLimit(Number(event.target.value))}
					/>
					<Button
						variant="secondary"
						onClick={saveHistoryLimit}
						isBusy={settingsSaving}
						disabled={settingsSaving}
					>
						{__('Save', 'kpf-core')}
					</Button>
				</div>
			</div>

			<div className={`kpf-stylesheet-workspace ${historyOpen ? 'has-history' : ''}`}>
				<main>
					<CssEditor value={css} onChange={setCss} />
				</main>
				{historyOpen ? (
					<HistoryPanel
						items={history}
						loading={historyLoading}
						error={historyError}
						restoring={restoring}
						onRestore={restoreVersion}
						onClose={() => setHistoryOpen(false)}
					/>
				) : null}
			</div>

			<footer className="kpf-stylesheet-footer">
				<p>
					<strong>{__('Publishing behavior', 'kpf-core')}</strong>
					{__(' Saving publishes the global frontend stylesheet and requests a full cache refresh. Unsafe CSS imports and executable expressions are removed.', 'kpf-core')}
				</p>
				<span>{__('Tip: press ⌘S or Ctrl+S to save.', 'kpf-core')}</span>
			</footer>
		</div>
	);
}

const root = document.getElementById('kpf-stylesheet-admin-root');
if (root) createRoot(root).render(<App />);
