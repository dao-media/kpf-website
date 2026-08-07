import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	Notice,
	Spinner,
	TextControl,
	TextareaControl,
} from '@wordpress/components';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

apiFetch.use(apiFetch.createNonceMiddleware(window.kpfTokensAdmin?.nonce || ''));

const REST_BASE = (window.kpfTokensAdmin?.restBase || '/wp-json/kpf-design-tokens/v1').replace(
	/\/$/,
	''
);
const DESIGNS_URL = window.kpfTokensAdmin?.designsUrl || '';

const FILTERS = [
	{ id: 'all', label: __('All', 'kpf-core') },
	{ id: 'global', label: __('Global', 'kpf-core') },
	{ id: 'design', label: __('In designs', 'kpf-core') },
	{ id: 'variables', label: __('Variables', 'kpf-core') },
	{ id: 'classes', label: __('Classes', 'kpf-core') },
	{ id: 'managed', label: __('Managed', 'kpf-core') },
];

function colorPreview(value) {
	const v = String(value || '').trim();
	if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) return v;
	if (/^rgba?\(/i.test(v) || /^hsla?\(/i.test(v)) return v;
	return '';
}

function emptyDraft(kind = 'variable') {
	return {
		kind,
		name: kind === 'variable' ? '--' : '.',
		oldName: '',
		value: '',
		css: '',
		note: '',
		managed: true,
		locations: [],
		isNew: true,
	};
}

function filterItems(items, filter, query) {
	const needle = query.trim().toLowerCase();
	return items.filter((item) => {
		if (filter === 'variables' && item.kind !== 'variable') return false;
		if (filter === 'classes' && item.kind !== 'class') return false;
		if (filter === 'managed' && !item.managed) return false;
		if (filter === 'global' && !['global', 'both'].includes(item.scope)) return false;
		if (filter === 'design' && !['design', 'both'].includes(item.scope)) return false;
		if (!needle) return true;
		return `${item.name} ${item.value || ''} ${item.css || ''} ${item.note || ''}`
			.toLowerCase()
			.includes(needle);
	});
}

function DetailPanel({ draft, saving, onChange, onSave, onPromote, onCancel }) {
	if (!draft) {
		return (
			<aside className="kpf-tokens-detail">
				<p className="kpf-tokens-empty">
					{__('Select a token to edit, or add a global variable or class.', 'kpf-core')}
				</p>
			</aside>
		);
	}

	const isVariable = draft.kind === 'variable';

	return (
		<aside className="kpf-tokens-detail">
			<h2>
				{draft.isNew
					? isVariable
						? __('New global variable', 'kpf-core')
						: __('New global class', 'kpf-core')
					: __('Edit token', 'kpf-core')}
			</h2>
			<TextControl
				label={isVariable ? __('Variable name', 'kpf-core') : __('Class name', 'kpf-core')}
				help={
					isVariable
						? __('Include leading dashes, e.g. --kpf-ember.', 'kpf-core')
						: __('Include the leading dot, e.g. .kpf-btn.', 'kpf-core')
				}
				value={draft.name}
				onChange={(name) => onChange({ ...draft, name })}
			/>
			{isVariable ? (
				<TextControl
					label={__('Value', 'kpf-core')}
					value={draft.value}
					onChange={(value) => onChange({ ...draft, value })}
				/>
			) : (
				<TextareaControl
					label={__('Declarations', 'kpf-core')}
					help={__('CSS declarations without the surrounding braces.', 'kpf-core')}
					value={draft.css}
					onChange={(css) => onChange({ ...draft, css })}
					rows={6}
				/>
			)}
			<TextControl
				label={__('Note', 'kpf-core')}
				value={draft.note || ''}
				onChange={(note) => onChange({ ...draft, note })}
			/>
			<div className="kpf-tokens-actions" style={{ marginBottom: '0.75rem' }}>
				<Button variant="primary" isBusy={saving} disabled={saving} onClick={onSave}>
					{__('Save changes', 'kpf-core')}
				</Button>
				{!draft.isNew && !draft.managed ? (
					<Button variant="secondary" disabled={saving} onClick={onPromote}>
						{__('Promote to global', 'kpf-core')}
					</Button>
				) : null}
				{draft.isNew ? (
					<Button variant="tertiary" disabled={saving} onClick={onCancel}>
						{__('Cancel', 'kpf-core')}
					</Button>
				) : null}
			</div>
			{draft.locations?.length ? (
				<ul className="kpf-tokens-locations">
					<li>
						<strong>
							{sprintf(
								/* translators: %d: number of locations */
								__('Used in %d place(s)', 'kpf-core'),
								draft.locations.length
							)}
						</strong>
					</li>
					{draft.locations.map((loc, index) => (
						<li key={`${loc.type}-${loc.id || loc.label}-${index}`}>
							{loc.type === 'design' ? (
								<a href={DESIGNS_URL}>{loc.label || __('Design', 'kpf-core')}</a>
							) : (
								loc.label || __('Global stylesheet', 'kpf-core')
							)}
						</li>
					))}
				</ul>
			) : null}
		</aside>
	);
}

export default function App() {
	const [items, setItems] = useState([]);
	const [counts, setCounts] = useState({});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [filter, setFilter] = useState('all');
	const [query, setQuery] = useState('');
	const [selectedId, setSelectedId] = useState('');
	const [draft, setDraft] = useState(null);

	async function load() {
		setLoading(true);
		setError('');
		try {
			const data = await apiFetch({ url: `${REST_BASE}/inventory` });
			setItems(data.items || []);
			setCounts(data.counts || {});
			if (selectedId) {
				const match = (data.items || []).find((item) => item.id === selectedId);
				if (match) {
					setDraft({
						...match,
						oldName: match.name,
						isNew: false,
					});
				}
			}
		} catch (err) {
			setError(err?.message || __('Could not load tokens.', 'kpf-core'));
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const visible = useMemo(() => filterItems(items, filter, query), [items, filter, query]);

	function selectItem(item) {
		setSelectedId(item.id);
		setDraft({
			...item,
			oldName: item.name,
			isNew: false,
		});
		setNotice('');
		setError('');
	}

	function startNew(kind) {
		const next = emptyDraft(kind);
		setSelectedId('');
		setDraft(next);
		setNotice('');
		setError('');
	}

	async function save() {
		if (!draft) return;
		setSaving(true);
		setError('');
		setNotice('');
		try {
			const path =
				draft.isNew || draft.managed
					? draft.kind === 'variable'
						? '/variable'
						: '/class'
					: '/update';
			const body =
				draft.kind === 'variable'
					? {
							kind: 'variable',
							name: draft.name,
							oldName: draft.oldName || draft.name,
							value: draft.value,
							note: draft.note || '',
						}
					: {
							kind: 'class',
							name: draft.name,
							oldName: draft.oldName || draft.name,
							css: draft.css,
							note: draft.note || '',
						};
			const data = await apiFetch({
				url: `${REST_BASE}${path}`,
				method: 'POST',
				data: body,
			});
			setItems(data.items || []);
			setCounts(data.counts || {});
			const nextId = `${draft.kind}:${draft.name}`;
			const match = (data.items || []).find((item) => item.id === nextId);
			setSelectedId(nextId);
			setDraft(
				match
					? { ...match, oldName: match.name, isNew: false }
					: { ...draft, oldName: draft.name, isNew: false, managed: true }
			);
			setNotice(__('Token saved. Matching stylesheet and design sources were updated.', 'kpf-core'));
		} catch (err) {
			setError(err?.message || __('Could not save this token.', 'kpf-core'));
		} finally {
			setSaving(false);
		}
	}

	async function promote() {
		if (!draft) return;
		setSaving(true);
		setError('');
		try {
			const data = await apiFetch({
				url: `${REST_BASE}/promote`,
				method: 'POST',
				data:
					draft.kind === 'variable'
						? { kind: 'variable', name: draft.name, value: draft.value, note: draft.note }
						: { kind: 'class', name: draft.name, css: draft.css, note: draft.note },
			});
			setItems(data.items || []);
			setCounts(data.counts || {});
			const nextId = `${draft.kind}:${draft.name}`;
			const match = (data.items || []).find((item) => item.id === nextId);
			setSelectedId(nextId);
			if (match) setDraft({ ...match, oldName: match.name, isNew: false });
			setNotice(__('Promoted to managed global tokens.', 'kpf-core'));
		} catch (err) {
			setError(err?.message || __('Could not promote this token.', 'kpf-core'));
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="kpf-tokens-shell">
			<header className="kpf-tokens-header">
				<div>
					<p>{__('Design', 'kpf-core')}</p>
					<h1>{__('Tokens', 'kpf-core')}</h1>
					<span>
						{__(
							'Manage CSS variables and classes globally and from page designs. Saving updates the stylesheet and any matching design files.',
							'kpf-core'
						)}
					</span>
				</div>
				<div className="kpf-tokens-actions">
					<Button variant="secondary" onClick={() => startNew('variable')}>
						{__('Add variable', 'kpf-core')}
					</Button>
					<Button variant="secondary" onClick={() => startNew('class')}>
						{__('Add class', 'kpf-core')}
					</Button>
					<Button variant="tertiary" onClick={load} disabled={loading}>
						{__('Refresh scan', 'kpf-core')}
					</Button>
				</div>
			</header>

			{error ? (
				<Notice status="error" isDismissible onRemove={() => setError('')}>
					{error}
				</Notice>
			) : null}
			{notice ? (
				<Notice status="success" isDismissible onRemove={() => setNotice('')}>
					{notice}
				</Notice>
			) : null}

			<div className="kpf-tokens-toolbar">
				<div className="kpf-tokens-filters">
					{FILTERS.map((entry) => (
						<Button
							key={entry.id}
							variant="secondary"
							className={filter === entry.id ? 'is-active' : undefined}
							onClick={() => setFilter(entry.id)}
						>
							{entry.label}
							{entry.id === 'all' && counts.all != null ? ` (${counts.all})` : ''}
							{entry.id === 'variables' && counts.variables != null
								? ` (${counts.variables})`
								: ''}
							{entry.id === 'classes' && counts.classes != null ? ` (${counts.classes})` : ''}
						</Button>
					))}
				</div>
				<TextControl
					label={__('Search', 'kpf-core')}
					hideLabelFromVision
					placeholder={__('Search tokens…', 'kpf-core')}
					value={query}
					onChange={setQuery}
				/>
			</div>

			{loading ? (
				<div className="kpf-tokens-loading">
					<Spinner />
				</div>
			) : (
				<div className="kpf-tokens-layout">
					<section className="kpf-tokens-table">
						{visible.length === 0 ? (
							<p className="kpf-tokens-empty">
								{__('No tokens match this filter.', 'kpf-core')}
							</p>
						) : (
							<table>
								<thead>
									<tr>
										<th>{__('Name', 'kpf-core')}</th>
										<th>{__('Value', 'kpf-core')}</th>
										<th>{__('Scope', 'kpf-core')}</th>
										<th>{__('Uses', 'kpf-core')}</th>
									</tr>
								</thead>
								<tbody>
									{visible.map((item) => {
										const swatch = colorPreview(item.value);
										return (
											<tr
												key={item.id}
												className={selectedId === item.id ? 'is-selected' : undefined}
												onClick={() => selectItem(item)}
											>
												<td>
													<code>{item.name}</code>
												</td>
												<td>
													{item.kind === 'variable' ? (
														<>
															{swatch ? (
																<span
																	className="kpf-tokens-swatch"
																	style={{ background: swatch }}
																/>
															) : null}
															<code>{item.value || '—'}</code>
														</>
													) : (
														<code>
															{(item.css || '').slice(0, 48) ||
																__('(HTML class only)', 'kpf-core')}
															{(item.css || '').length > 48 ? '…' : ''}
														</code>
													)}
												</td>
												<td>
													<div className="kpf-tokens-badges">
														<span className="kpf-tokens-badge">{item.scope}</span>
														{item.managed ? (
															<span className="kpf-tokens-badge kpf-tokens-badge--managed">
																{__('managed', 'kpf-core')}
															</span>
														) : null}
													</div>
												</td>
												<td>{item.locations?.length || 0}</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						)}
					</section>
					<DetailPanel
						draft={draft}
						saving={saving}
						onChange={setDraft}
						onSave={save}
						onPromote={promote}
						onCancel={() => setDraft(null)}
					/>
				</div>
			)}
		</div>
	);
}
