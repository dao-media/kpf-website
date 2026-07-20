import apiFetch from '@wordpress/api-fetch';
import { Button, Notice, Spinner, TextareaControl } from '@wordpress/components';
import { createRoot, useCallback, useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import CodeEditor from './CodeEditor';
import { extractCopyFields, updateCopyField } from './copyFields';
import './admin.scss';

apiFetch.use(apiFetch.createNonceMiddleware(window.kpfDesignsAdmin?.nonce || ''));

const REST_BASE = (window.kpfDesignsAdmin?.restBase || '/wp-json/kpf-designs/v1').replace(/\/$/, '');
const MAX_BYTES = Number(window.kpfDesignsAdmin?.maxSourceBytes || 1048576);
const CAN_MANAGE_SETTINGS = Boolean(window.kpfDesignsAdmin?.canManageSettings);

function StatusBadge({ ready }) {
	return (
		<span className={`kpf-design-status ${ready ? 'is-ready' : 'is-missing'}`}>
			{ready ? __('Ready', 'kpf-core') : __('No design', 'kpf-core')}
		</span>
	);
}

function formatFileSize(bytes) {
	if (!bytes || bytes < 1024) {
		return sprintf(__('%s B', 'kpf-core'), String(bytes || 0));
	}
	if (bytes < 1024 * 1024) {
		return sprintf(__('%s KB', 'kpf-core'), (bytes / 1024).toFixed(1));
	}
	return sprintf(__('%s MB', 'kpf-core'), (bytes / (1024 * 1024)).toFixed(2));
}

function FilePicker({
	id,
	label,
	hint,
	accept,
	extensions,
	file,
	savedName,
	required,
	disabled,
	onChange,
}) {
	function handleChange(event) {
		const next = event.target.files?.[0] || null;
		if (!next) {
			onChange(null);
			return;
		}

		const extension = next.name.split('.').pop()?.toLowerCase() || '';
		if (!extensions.includes(extension)) {
			onChange(null, sprintf(
				__('Choose a %1$s file (%2$s).', 'kpf-core'),
				label,
				extensions.map((item) => `.${item}`).join(', ')
			));
			event.target.value = '';
			return;
		}

		if (next.size > MAX_BYTES) {
			onChange(null, __('Each file must be 1 MB or smaller.', 'kpf-core'));
			event.target.value = '';
			return;
		}

		onChange(next);
	}

	const displayName = file?.name || savedName || '';
	const hasSelection = Boolean(file);

	return (
		<div className={`kpf-file-picker ${hasSelection ? 'has-file' : ''} ${required ? 'is-required' : ''}`}>
			<div className="kpf-file-picker-meta">
				<span className="kpf-file-picker-label">
					{label}
					{required ? <abbr title={__('Required', 'kpf-core')}>*</abbr> : null}
				</span>
				{hint ? <span className="kpf-file-picker-hint">{hint}</span> : null}
			</div>
			<div className="kpf-file-picker-row">
				<label className="kpf-file-picker-button" htmlFor={id}>
					{hasSelection || savedName
						? __('Change file', 'kpf-core')
						: __('Choose file', 'kpf-core')}
				</label>
				<input
					id={id}
					className="kpf-file-picker-input"
					type="file"
					accept={accept}
					disabled={disabled}
					onChange={handleChange}
				/>
				<div className="kpf-file-picker-name" title={displayName || undefined}>
					{hasSelection ? (
						<>
							<strong>{file.name}</strong>
							<span>{formatFileSize(file.size)}</span>
						</>
					) : savedName ? (
						<>
							<strong>{savedName}</strong>
							<span>{__('Attached', 'kpf-core')}</span>
						</>
					) : (
						<em>{__('No file selected', 'kpf-core')}</em>
					)}
				</div>
				{hasSelection ? (
					<button
						type="button"
						className="kpf-file-picker-clear"
						onClick={() => onChange(null)}
						disabled={disabled}
						aria-label={sprintf(__('Clear %s selection', 'kpf-core'), label)}
					>
						×
					</button>
				) : null}
			</div>
		</div>
	);
}

function UrlRow({ row, onUpdated, onEdit }) {
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const [htmlFile, setHtmlFile] = useState(null);
	const [cssFile, setCssFile] = useState(null);
	const htmlInputId = `kpf-design-html-${row.id}`;
	const cssInputId = `kpf-design-css-${row.id}`;

	async function uploadFiles() {
		if (!htmlFile) {
			setError(__('Choose an HTML file first.', 'kpf-core'));
			return;
		}

		setBusy(true);
		setError('');
		try {
			const body = new FormData();
			body.append('html', htmlFile);
			if (cssFile) {
				body.append('css', cssFile);
			}
			const response = await apiFetch({
				url: `${REST_BASE}/page/${row.id}/upload`,
				method: 'POST',
				body,
			});
			setHtmlFile(null);
			setCssFile(null);
			onUpdated(response.url);
		} catch (err) {
			setError(err?.message || __('Upload failed.', 'kpf-core'));
		} finally {
			setBusy(false);
		}
	}

	async function clearDesign() {
		setBusy(true);
		setError('');
		try {
			const response = await apiFetch({
				url: `${REST_BASE}/page/${row.id}/clear`,
				method: 'POST',
			});
			setHtmlFile(null);
			setCssFile(null);
			onUpdated(response.url);
		} catch (err) {
			setError(err?.message || __('Could not clear this design.', 'kpf-core'));
		} finally {
			setBusy(false);
		}
	}

	function handleFileChange(setter) {
		return (file, message) => {
			if (message) {
				setError(message);
				setter(null);
				return;
			}
			setError('');
			setter(file);
		};
	}

	return (
		<tr className={row.ready ? 'kpf-design-row is-ready' : 'kpf-design-row is-missing'}>
			<td>
				<strong>{row.title}</strong>
				<div className="kpf-design-path">
					<code>{row.path}</code>
					<span className="kpf-design-page-status">{row.status}</span>
				</div>
				{error ? (
					<Notice status="error" isDismissible={false}>
						{error}
					</Notice>
				) : null}
			</td>
			<td>
				<a href={row.url} target="_blank" rel="noreferrer">
					{row.url}
				</a>
			</td>
			<td>
				<StatusBadge ready={Boolean(row.ready)} />
			</td>
			<td className="kpf-design-actions">
				<div className="kpf-design-uploaders">
					<FilePicker
						id={htmlInputId}
						label={__('HTML', 'kpf-core')}
						hint={__('Required page markup', 'kpf-core')}
						accept=".html,.htm,text/html"
						extensions={['html', 'htm']}
						file={htmlFile}
						savedName={row.htmlFilename || ''}
						required
						disabled={busy}
						onChange={handleFileChange(setHtmlFile)}
					/>
					<FilePicker
						id={cssInputId}
						label={__('CSS', 'kpf-core')}
						hint={__('Optional stylesheet', 'kpf-core')}
						accept=".css,text/css"
						extensions={['css']}
						file={cssFile}
						savedName={row.cssFilename || ''}
						disabled={busy}
						onChange={handleFileChange(setCssFile)}
					/>
				</div>
				<div className="kpf-design-action-buttons">
					{row.ready ? (
						<Button variant="primary" onClick={() => onEdit(row)}>
							{__('Edit code & copy', 'kpf-core')}
						</Button>
					) : null}
					<Button
						variant={row.ready ? 'secondary' : 'primary'}
						onClick={uploadFiles}
						isBusy={busy}
						disabled={busy || !htmlFile}
					>
						{row.ready ? __('Replace selected files', 'kpf-core') : __('Apply design', 'kpf-core')}
					</Button>
					{row.ready ? (
						<Button variant="secondary" onClick={clearDesign} disabled={busy}>
							{__('Clear', 'kpf-core')}
						</Button>
					) : null}
				</div>
			</td>
		</tr>
	);
}

function DesignEditorWorkspace({ row, onBack, onSaved }) {
	const shellRef = useRef(null);
	const [editor, setEditor] = useState(null);
	const [html, setHtml] = useState('');
	const [css, setCss] = useState('');
	const [activeFile, setActiveFile] = useState('html');
	const [copyQuery, setCopyQuery] = useState('');
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [historyOpen, setHistoryOpen] = useState(false);
	const [history, setHistory] = useState([]);
	const [historyLimit, setHistoryLimit] = useState(0);
	const [historyLoading, setHistoryLoading] = useState(false);
	const [historyError, setHistoryError] = useState('');
	const [restoring, setRestoring] = useState(0);

	useEffect(() => {
		setLoading(true);
		apiFetch({ url: `${REST_BASE}/page/${row.id}` })
			.then((response) => {
				setEditor(response);
				setHtml(response.html || '');
				setCss(response.css || '');
				setError('');
			})
			.catch((err) => setError(err?.message || __('Could not open this design.', 'kpf-core')))
			.finally(() => setLoading(false));
	}, [row.id]);

	useEffect(() => {
		document.body.classList.add('kpf-designs-editing');
		return () => {
			document.body.classList.remove('kpf-designs-editing');
		};
	}, []);

	useEffect(() => {
		if (loading || !editor) return undefined;

		const shell = shellRef.current;
		if (!shell) return undefined;

		const fit = () => {
			const top = shell.getBoundingClientRect().top;
			const next = Math.max(420, Math.floor(window.innerHeight - top - 12));
			shell.style.height = `${next}px`;
		};

		fit();
		window.requestAnimationFrame(fit);
		window.addEventListener('resize', fit);
		return () => {
			window.removeEventListener('resize', fit);
		};
	}, [editor, loading]);

	const copyFields = useMemo(() => extractCopyFields(html), [html]);
	const filteredCopy = useMemo(() => {
		const needle = copyQuery.trim().toLowerCase();
		if (!needle) return copyFields;
		return copyFields.filter((field) =>
			[field.label, field.value, field.tag, field.name].join(' ').toLowerCase().includes(needle)
		);
	}, [copyFields, copyQuery]);
	const dirty = Boolean(editor && (html !== editor.html || css !== editor.css));

	const loadHistory = useCallback(async () => {
		setHistoryLoading(true);
		setHistoryError('');
		try {
			const response = await apiFetch({ url: `${REST_BASE}/page/${row.id}/revisions` });
			setHistory(response.revisions || []);
			setHistoryLimit(Number(response.limit || 0));
		} catch (err) {
			setHistoryError(err?.message || __('Could not load version history.', 'kpf-core'));
		} finally {
			setHistoryLoading(false);
		}
	}, [row.id]);

	useEffect(() => {
		if (historyOpen) loadHistory();
	}, [historyOpen, loadHistory]);

	const save = useCallback(async () => {
		if (!editor || saving) return;
		if (html.length > MAX_BYTES || css.length > MAX_BYTES) {
			setError(__('HTML and CSS must each be 1 MB or smaller.', 'kpf-core'));
			return;
		}

		setSaving(true);
		setError('');
		setNotice('');
		try {
			const response = await apiFetch({
				url: `${REST_BASE}/page/${row.id}`,
				method: 'POST',
				data: {
					html,
					css,
					revision: editor.revision,
				},
			});
			setEditor(response.editor);
			setHtml(response.editor.html || '');
			setCss(response.editor.css || '');
			onSaved(response.url);
			setNotice(__('Design saved.', 'kpf-core'));
			if (historyOpen) loadHistory();
		} catch (err) {
			setError(err?.message || __('Could not save the design.', 'kpf-core'));
		} finally {
			setSaving(false);
		}
	}, [css, editor, historyOpen, html, loadHistory, onSaved, row.id, saving]);

	async function restoreVersion(version) {
		if (dirty && !window.confirm(__('Discard your unsaved changes and restore this version?', 'kpf-core'))) {
			return;
		}
		if (!window.confirm(sprintf(__('Restore the version from %s?', 'kpf-core'), version.dateDisplay))) {
			return;
		}

		setRestoring(version.id);
		setHistoryError('');
		setNotice('');
		try {
			const response = await apiFetch({
				url: `${REST_BASE}/page/${row.id}/revisions/${version.id}/restore`,
				method: 'POST',
				data: { revision: editor.revision },
			});
			setEditor(response.editor);
			setHtml(response.editor.html || '');
			setCss(response.editor.css || '');
			onSaved(response.url);
			setNotice(__('Version restored. The previous current version remains in history.', 'kpf-core'));
			await loadHistory();
		} catch (err) {
			setHistoryError(err?.message || __('Could not restore that version.', 'kpf-core'));
		} finally {
			setRestoring(0);
		}
	}

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

	function leaveEditor() {
		if (dirty && !window.confirm(__('Discard your unsaved changes?', 'kpf-core'))) return;
		onBack();
	}

	if (loading) {
		return (
			<div className="kpf-designs-loading">
				<Spinner />
			</div>
		);
	}

	if (!editor) {
		return (
			<div>
				{error ? (
					<Notice status="error" isDismissible={false}>
						{error}
					</Notice>
				) : null}
				<Button variant="secondary" onClick={onBack}>
					{__('Back to designs', 'kpf-core')}
				</Button>
			</div>
		);
	}

	return (
		<div className="kpf-design-editor" ref={shellRef}>
			<header className="kpf-design-editor-header">
				<div>
					<Button variant="link" onClick={leaveEditor} className="kpf-editor-back">
						← {__('All designs', 'kpf-core')}
					</Button>
					<h2>{row.title}</h2>
					<a href={row.url} target="_blank" rel="noreferrer">
						{row.path}
					</a>
				</div>
				<div className="kpf-editor-save">
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
						{__('Save design', 'kpf-core')}
					</Button>
				</div>
			</header>

			{error ? (
				<Notice status="error" onRemove={() => setError('')}>
					{error}
				</Notice>
			) : null}
			{notice ? (
				<Notice status="success" onRemove={() => setNotice('')}>
					{notice}
				</Notice>
			) : null}

			<div className="kpf-design-editor-layout">
				<aside className="kpf-copy-panel" aria-label={__('Editable page copy', 'kpf-core')}>
					<div className="kpf-copy-panel-heading">
						<p className="kpf-editor-eyebrow">{__('Content editor', 'kpf-core')}</p>
						<h3>{__('Page copy', 'kpf-core')}</h3>
						<p>
							{__(
								'Edit visible text here. Changes are written back into the markup source.',
								'kpf-core'
							)}
						</p>
						<input
							type="search"
							value={copyQuery}
							onChange={(event) => setCopyQuery(event.target.value)}
							placeholder={__('Find copy…', 'kpf-core')}
							aria-label={__('Find copy', 'kpf-core')}
						/>
					</div>
					<div className="kpf-copy-fields">
						{filteredCopy.length ? (
							filteredCopy.map((field) => (
								<TextareaControl
									key={field.id}
									label={field.label}
									help={
										field.kind === 'attribute'
											? sprintf(__('%1$s attribute on <%2$s>', 'kpf-core'), field.name, field.tag)
											: sprintf(__('<%s> text', 'kpf-core'), field.tag)
									}
									value={field.value}
									rows={3}
									onChange={(value) =>
										setHtml((source) => {
											const current = extractCopyFields(source).find(
												(item) => item.id === field.id
											);
											return updateCopyField(source, current || field, value);
										})
									}
								/>
							))
						) : (
							<p className="kpf-copy-empty">
								{copyFields.length
									? __('No copy matched your search.', 'kpf-core')
									: __('No editable copy was found in this HTML file.', 'kpf-core')}
							</p>
						)}
					</div>
				</aside>

				<main className="kpf-code-panel">
					<div className="kpf-code-tabs" role="tablist" aria-label={__('Design files', 'kpf-core')}>
						<button
							type="button"
							role="tab"
							aria-selected={activeFile === 'html'}
							className={activeFile === 'html' ? 'is-active' : ''}
							onClick={() => setActiveFile('html')}
						>
							<span className="kpf-file-dot is-html" />
							{editor.htmlFilename || 'design.html'}
						</button>
						<button
							type="button"
							role="tab"
							aria-selected={activeFile === 'css'}
							className={activeFile === 'css' ? 'is-active' : ''}
							onClick={() => setActiveFile('css')}
						>
							<span className="kpf-file-dot is-css" />
							{editor.cssFilename || 'design.css'}
						</button>
						<span className="kpf-code-size">
							{sprintf(
								__('%1$s / %2$s', 'kpf-core'),
								activeFile === 'html'
									? `${new Blob([html]).size.toLocaleString()} B`
									: `${new Blob([css]).size.toLocaleString()} B`,
								'1 MB'
							)}
						</span>
					</div>
					<CodeEditor
						id="kpf-design-source"
						label={activeFile === 'html' ? __('HTML source', 'kpf-core') : __('CSS source', 'kpf-core')}
						language={activeFile}
						value={activeFile === 'html' ? html : css}
						onChange={activeFile === 'html' ? setHtml : setCss}
						enableTagPicker={activeFile === 'html'}
					/>
				</main>
			</div>
			{historyOpen ? (
				<aside className="kpf-history-panel" aria-label={__('Design version history', 'kpf-core')}>
					<div className="kpf-history-header">
						<div>
							<p className="kpf-editor-eyebrow">{__('Design archive', 'kpf-core')}</p>
							<h3>{__('Version history', 'kpf-core')}</h3>
							<p>
								{sprintf(
									__('Up to %d saved versions are retained.', 'kpf-core'),
									historyLimit
								)}
							</p>
						</div>
						<Button
							variant="tertiary"
							onClick={() => setHistoryOpen(false)}
							aria-label={__('Close version history', 'kpf-core')}
						>
							×
						</Button>
					</div>
					{historyError ? (
						<Notice status="error" isDismissible={false}>
							{historyError}
						</Notice>
					) : null}
					<div className="kpf-history-list">
						{historyLoading ? <Spinner /> : null}
						{!historyLoading && history.length === 0 ? (
							<p className="kpf-copy-empty">
								{__('No earlier saved versions yet.', 'kpf-core')}
							</p>
						) : null}
						{history.map((version, index) => (
							<article className="kpf-history-item" key={version.id}>
								<div className="kpf-history-marker">{history.length - index}</div>
								<div>
									<strong>
										<time dateTime={version.date}>{version.dateDisplay}</time>
									</strong>
									<span>{sprintf(__('by %s', 'kpf-core'), version.author)}</span>
									{version.summary ? <p>{version.summary}</p> : null}
									<small>
										{[version.htmlFilename, version.cssFilename].filter(Boolean).join(' · ')}
									</small>
									<Button
										variant="secondary"
										isBusy={restoring === version.id}
										disabled={Boolean(restoring)}
										onClick={() => restoreVersion(version)}
									>
										{__('Restore this version', 'kpf-core')}
									</Button>
								</div>
							</article>
						))}
					</div>
				</aside>
			) : null}
		</div>
	);
}

function DesignsAdminApp() {
	const [rows, setRows] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [query, setQuery] = useState('');
	const [editingRow, setEditingRow] = useState(null);
	const [settings, setSettings] = useState({ historyLimit: 20, minimum: 2, maximum: 100 });
	const [historyLimitDraft, setHistoryLimitDraft] = useState(20);
	const [settingsSaving, setSettingsSaving] = useState(false);
	const [settingsNotice, setSettingsNotice] = useState('');

	const load = useCallback(() => {
		setLoading(true);
		Promise.all([
			apiFetch({ url: `${REST_BASE}/urls` }),
			apiFetch({ url: `${REST_BASE}/settings` }),
		])
			.then(([urlResponse, settingsResponse]) => {
				setRows(urlResponse.urls || []);
				setSettings(settingsResponse);
				setHistoryLimitDraft(Number(settingsResponse.historyLimit));
				setError('');
			})
			.catch((err) => {
				setError(err?.message || __('Could not load site URLs.', 'kpf-core'));
			})
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return rows;
		return rows.filter((row) =>
			[row.title, row.path, row.url, row.status].join(' ').toLowerCase().includes(needle)
		);
	}, [rows, query]);

	function updateRow(next) {
		setRows((current) => current.map((row) => (row.id === next.id ? { ...row, ...next } : row)));
	}

	async function saveHistoryLimit() {
		setSettingsSaving(true);
		setSettingsNotice('');
		try {
			const response = await apiFetch({
				url: `${REST_BASE}/settings`,
				method: 'POST',
				data: { historyLimit: historyLimitDraft },
			});
			setSettings(response);
			setHistoryLimitDraft(Number(response.historyLimit));
			setSettingsNotice(__('Version history setting saved.', 'kpf-core'));
		} catch (err) {
			setError(err?.message || __('Could not save the version history setting.', 'kpf-core'));
		} finally {
			setSettingsSaving(false);
		}
	}

	if (loading) {
		return (
			<div className="kpf-designs-loading">
				<Spinner />
			</div>
		);
	}

	if (editingRow) {
		return (
			<DesignEditorWorkspace
				row={editingRow}
				onBack={() => setEditingRow(null)}
				onSaved={(next) => {
					updateRow(next);
					setEditingRow((current) => ({ ...current, ...next }));
				}}
			/>
		);
	}

	return (
		<div className="kpf-designs-table-wrap">
			{error ? (
				<Notice status="error" isDismissible={false}>
					{error}
				</Notice>
			) : null}
			{settingsNotice ? (
				<Notice status="success" onRemove={() => setSettingsNotice('')}>
					{settingsNotice}
				</Notice>
			) : null}
			<div className="kpf-designs-toolbar">
				<label htmlFor="kpf-designs-search">{__('Search URLs', 'kpf-core')}</label>
				<input
					id="kpf-designs-search"
					type="search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder={__('Filter by title or path…', 'kpf-core')}
				/>
				<span>
					{sprintf(
						__('%1$d ready · %2$d missing', 'kpf-core'),
						rows.filter((row) => row.ready).length,
						rows.filter((row) => !row.ready).length
					)}
				</span>
				<div className="kpf-history-setting">
					<label htmlFor="kpf-history-limit">{__('Versions to keep', 'kpf-core')}</label>
					{CAN_MANAGE_SETTINGS ? (
						<>
							<input
								id="kpf-history-limit"
								type="number"
								min={settings.minimum}
								max={settings.maximum}
								value={historyLimitDraft}
								onChange={(event) => setHistoryLimitDraft(Number(event.target.value))}
							/>
							<Button
								variant="secondary"
								onClick={saveHistoryLimit}
								isBusy={settingsSaving}
								disabled={
									settingsSaving || Number(historyLimitDraft) === Number(settings.historyLimit)
								}
							>
								{__('Save', 'kpf-core')}
							</Button>
						</>
					) : (
						<strong>{settings.historyLimit}</strong>
					)}
				</div>
			</div>
			<table className="widefat striped kpf-designs-table">
				<thead>
					<tr>
						<th>{__('Page', 'kpf-core')}</th>
						<th>{__('URL', 'kpf-core')}</th>
						<th>{__('Status', 'kpf-core')}</th>
						<th>{__('Design file', 'kpf-core')}</th>
					</tr>
				</thead>
				<tbody>
					{filtered.length === 0 ? (
						<tr>
							<td colSpan={4}>{__('No site URLs matched that search.', 'kpf-core')}</td>
						</tr>
					) : (
						filtered.map((row) => (
							<UrlRow
								key={row.id}
								row={row}
								onUpdated={updateRow}
								onEdit={setEditingRow}
							/>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}

const root = document.getElementById('kpf-designs-admin-root');
if (root) {
	createRoot(root).render(<DesignsAdminApp />);
}
