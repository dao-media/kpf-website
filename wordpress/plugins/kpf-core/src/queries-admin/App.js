import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	Notice,
	Spinner,
	TextControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

apiFetch.use(apiFetch.createNonceMiddleware(window.kpfQueriesAdmin?.nonce || ''));

const REST_BASE = (window.kpfQueriesAdmin?.restBase || '/wp-json/kpf-queries/v1').replace(
	/\/$/,
	''
);

const EMPTY_DEFINITION = {
	postType: 'post',
	perPage: 6,
	orderby: 'date',
	order: 'DESC',
	status: ['publish'],
	excludeIds: [],
	excludeCurrent: true,
	includeIds: [],
	taxonomies: [],
	metaQuery: [],
	related: { enabled: false, by: 'category', taxonomy: 'category' },
	pagination: { enabled: false, perPage: 6 },
};

function emptyDraft() {
	return {
		id: 0,
		title: '',
		slug: '',
		status: 'publish',
		definition: { ...EMPTY_DEFINITION, related: { ...EMPTY_DEFINITION.related }, pagination: { ...EMPTY_DEFINITION.pagination } },
	};
}

function idsToText(ids) {
	return (ids || []).join(', ');
}

function textToIds(text) {
	return String(text || '')
		.split(/[\s,]+/)
		.map((part) => Number(part))
		.filter((id) => Number.isFinite(id) && id > 0);
}

function QueryEditor({ draft, options, onChange, onSave, onCancel, saving, preview, onPreview }) {
	const definition = draft.definition || EMPTY_DEFINITION;
	const taxonomies = options?.taxonomies || [];
	const postTypes = options?.postTypes || [];

	function patchDefinition(patch) {
		onChange({
			...draft,
			definition: { ...definition, ...patch },
		});
	}

	function updateTaxonomy(index, patch) {
		const next = [...(definition.taxonomies || [])];
		next[index] = { ...next[index], ...patch };
		patchDefinition({ taxonomies: next });
	}

	function updateMeta(index, patch) {
		const next = [...(definition.metaQuery || [])];
		next[index] = { ...next[index], ...patch };
		patchDefinition({ metaQuery: next });
	}

	return (
		<div className="kpf-query-editor">
			<div className="kpf-query-editor-header">
				<Button variant="link" onClick={onCancel}>
					← {__('Back to queries', 'kpf-core')}
				</Button>
				<h2>{draft.id ? __('Edit query', 'kpf-core') : __('New query', 'kpf-core')}</h2>
			</div>

			<div className="kpf-query-grid">
				<section>
					<TextControl
						label={__('Title', 'kpf-core')}
						value={draft.title}
						onChange={(title) => onChange({ ...draft, title })}
					/>
					<TextControl
						label={__('Slug', 'kpf-core')}
						help={__('Used in designs as queries.slug', 'kpf-core')}
						value={draft.slug}
						onChange={(slug) => onChange({ ...draft, slug: slug.toLowerCase().replace(/[^a-z0-9_-]/g, '-') })}
					/>
					<SelectControl
						label={__('Status', 'kpf-core')}
						value={draft.status}
						options={[
							{ label: __('Active', 'kpf-core'), value: 'publish' },
							{ label: __('Inactive', 'kpf-core'), value: 'draft' },
						]}
						onChange={(status) => onChange({ ...draft, status })}
					/>
					{draft.slug ? (
						<p className="kpf-query-invocation">
							<code>{`{{#each queries.${draft.slug}}}…{{/each}}`}</code>
							<Button
								variant="secondary"
								onClick={() =>
									navigator.clipboard?.writeText(
										`{{#each queries.${draft.slug}}}\n  <a href="{{link}}">{{title}}</a>\n{{/each}}`
									)
								}
							>
								{__('Copy loop', 'kpf-core')}
							</Button>
						</p>
					) : null}
				</section>

				<section>
					<h3>{__('Content source', 'kpf-core')}</h3>
					<SelectControl
						label={__('Post type', 'kpf-core')}
						value={definition.postType}
						options={postTypes.map((type) => ({ label: type.label, value: type.name }))}
						onChange={(postType) => patchDefinition({ postType })}
					/>
					<TextControl
						label={__('Items per page', 'kpf-core')}
						type="number"
						min={1}
						max={options?.maxPerPage || 50}
						value={definition.perPage}
						onChange={(value) => patchDefinition({ perPage: Number(value) || 1 })}
					/>
					<SelectControl
						label={__('Order by', 'kpf-core')}
						value={definition.orderby}
						options={(options?.orderby || ['date']).map((key) => ({ label: key, value: key }))}
						onChange={(orderby) => patchDefinition({ orderby })}
					/>
					<SelectControl
						label={__('Order', 'kpf-core')}
						value={definition.order}
						options={[
							{ label: __('Descending', 'kpf-core'), value: 'DESC' },
							{ label: __('Ascending', 'kpf-core'), value: 'ASC' },
						]}
						onChange={(order) => patchDefinition({ order })}
					/>
					<ToggleControl
						label={__('Exclude current page/post', 'kpf-core')}
						checked={Boolean(definition.excludeCurrent)}
						onChange={(excludeCurrent) => patchDefinition({ excludeCurrent })}
					/>
					<TextControl
						label={__('Exclude IDs', 'kpf-core')}
						help={__('Comma-separated post IDs', 'kpf-core')}
						value={idsToText(definition.excludeIds)}
						onChange={(value) => patchDefinition({ excludeIds: textToIds(value) })}
					/>
					<TextControl
						label={__('Include only IDs', 'kpf-core')}
						help={__('Optional allowlist; overrides ordering to match this list', 'kpf-core')}
						value={idsToText(definition.includeIds)}
						onChange={(value) => patchDefinition({ includeIds: textToIds(value) })}
					/>
				</section>

				<section>
					<h3>{__('Taxonomy filters', 'kpf-core')}</h3>
					{(definition.taxonomies || []).map((tax, index) => (
						<div className="kpf-query-clause" key={`tax-${index}`}>
							<SelectControl
								label={__('Taxonomy', 'kpf-core')}
								value={tax.taxonomy}
								options={taxonomies.map((item) => ({ label: item.label, value: item.name }))}
								onChange={(taxonomy) => updateTaxonomy(index, { taxonomy })}
							/>
							<TextControl
								label={__('Terms (slugs)', 'kpf-core')}
								value={(tax.terms || []).join(', ')}
								onChange={(value) =>
									updateTaxonomy(index, {
										terms: value
											.split(/[\s,]+/)
											.map((term) => term.trim())
											.filter(Boolean),
									})
								}
							/>
							<SelectControl
								label={__('Operator', 'kpf-core')}
								value={tax.operator || 'IN'}
								options={[
									{ label: 'IN', value: 'IN' },
									{ label: 'NOT IN', value: 'NOT IN' },
									{ label: 'AND', value: 'AND' },
								]}
								onChange={(operator) => updateTaxonomy(index, { operator })}
							/>
							<Button
								variant="tertiary"
								isDestructive
								onClick={() =>
									patchDefinition({
										taxonomies: definition.taxonomies.filter((_, i) => i !== index),
									})
								}
							>
								{__('Remove', 'kpf-core')}
							</Button>
						</div>
					))}
					<Button
						variant="secondary"
						onClick={() =>
							patchDefinition({
								taxonomies: [
									...(definition.taxonomies || []),
									{
										taxonomy: taxonomies[0]?.name || 'category',
										terms: [],
										field: 'slug',
										operator: 'IN',
									},
								],
							})
						}
					>
						{__('Add taxonomy filter', 'kpf-core')}
					</Button>
				</section>

				<section>
					<h3>{__('Custom field filters', 'kpf-core')}</h3>
					{(definition.metaQuery || []).map((meta, index) => (
						<div className="kpf-query-clause" key={`meta-${index}`}>
							<TextControl
								label={__('Meta key', 'kpf-core')}
								value={meta.key || ''}
								onChange={(key) => updateMeta(index, { key })}
							/>
							<SelectControl
								label={__('Compare', 'kpf-core')}
								value={meta.compare || '='}
								options={['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'NOT LIKE', 'EXISTS', 'NOT EXISTS', 'IN', 'NOT IN'].map(
									(value) => ({ label: value, value })
								)}
								onChange={(compare) => updateMeta(index, { compare })}
							/>
							{!['EXISTS', 'NOT EXISTS'].includes(meta.compare) ? (
								<TextControl
									label={__('Value', 'kpf-core')}
									value={meta.value || ''}
									onChange={(value) => updateMeta(index, { value })}
								/>
							) : null}
							<Button
								variant="tertiary"
								isDestructive
								onClick={() =>
									patchDefinition({
										metaQuery: definition.metaQuery.filter((_, i) => i !== index),
									})
								}
							>
								{__('Remove', 'kpf-core')}
							</Button>
						</div>
					))}
					<Button
						variant="secondary"
						onClick={() =>
							patchDefinition({
								metaQuery: [
									...(definition.metaQuery || []),
									{ key: '', value: '', compare: '=', type: 'CHAR' },
								],
							})
						}
					>
						{__('Add custom field filter', 'kpf-core')}
					</Button>
				</section>

				<section>
					<h3>{__('Related posts', 'kpf-core')}</h3>
					<ToggleControl
						label={__('Limit to related items of the current page/post', 'kpf-core')}
						checked={Boolean(definition.related?.enabled)}
						onChange={(enabled) =>
							patchDefinition({ related: { ...definition.related, enabled } })
						}
					/>
					{definition.related?.enabled ? (
						<>
							<SelectControl
								label={__('Relate by', 'kpf-core')}
								value={definition.related?.by || 'category'}
								options={[
									{ label: __('Category', 'kpf-core'), value: 'category' },
									{ label: __('Tag', 'kpf-core'), value: 'tag' },
									{ label: __('Custom taxonomy', 'kpf-core'), value: 'taxonomy' },
									{ label: __('Same post type only', 'kpf-core'), value: 'post_type' },
								]}
								onChange={(by) => patchDefinition({ related: { ...definition.related, by } })}
							/>
							{definition.related?.by === 'taxonomy' ? (
								<SelectControl
									label={__('Taxonomy', 'kpf-core')}
									value={definition.related?.taxonomy || 'category'}
									options={taxonomies.map((item) => ({ label: item.label, value: item.name }))}
									onChange={(taxonomy) =>
										patchDefinition({ related: { ...definition.related, taxonomy } })
									}
								/>
							) : null}
						</>
					) : null}
				</section>

				<section>
					<h3>{__('Pagination', 'kpf-core')}</h3>
					<ToggleControl
						label={__('Enable pagination metadata for this query', 'kpf-core')}
						help={__(
							'Exposes queries.slug.pagination in designs (hasNext, page, totalPages).',
							'kpf-core'
						)}
						checked={Boolean(definition.pagination?.enabled)}
						onChange={(enabled) =>
							patchDefinition({
								pagination: { ...definition.pagination, enabled },
							})
						}
					/>
					{definition.pagination?.enabled ? (
						<TextControl
							label={__('Page size', 'kpf-core')}
							type="number"
							min={1}
							max={options?.maxPerPage || 50}
							value={definition.pagination?.perPage || definition.perPage}
							onChange={(value) =>
								patchDefinition({
									pagination: {
										...definition.pagination,
										perPage: Number(value) || 1,
									},
								})
							}
						/>
					) : null}
				</section>
			</div>

			<div className="kpf-query-actions">
				<Button variant="primary" onClick={onSave} isBusy={saving} disabled={saving || !draft.title}>
					{__('Save query', 'kpf-core')}
				</Button>
				<Button variant="secondary" onClick={onPreview} disabled={saving}>
					{__('Preview results', 'kpf-core')}
				</Button>
				<Button variant="tertiary" onClick={onCancel}>
					{__('Cancel', 'kpf-core')}
				</Button>
			</div>

			{preview ? (
				<div className="kpf-query-preview">
					<h3>
						{sprintf(
							__('Preview · %1$d items · page %2$d of %3$d', 'kpf-core'),
							preview.items?.length || 0,
							preview.pagination?.page || 1,
							preview.pagination?.totalPages || 1
						)}
					</h3>
					<ul>
						{(preview.items || []).map((item) => (
							<li key={item.databaseId}>
								<strong>{item.title}</strong>
								<span>{item.link}</span>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}

export default function App() {
	const [rows, setRows] = useState([]);
	const [options, setOptions] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [draft, setDraft] = useState(null);
	const [saving, setSaving] = useState(false);
	const [preview, setPreview] = useState(null);
	const [query, setQuery] = useState('');

	const load = useCallback(() => {
		setLoading(true);
		Promise.all([
			apiFetch({ url: `${REST_BASE}/queries` }),
			apiFetch({ url: `${REST_BASE}/options` }),
		])
			.then(([list, opts]) => {
				setRows(list.queries || []);
				setOptions(opts);
				setError('');
			})
			.catch((err) => setError(err?.message || __('Could not load queries.', 'kpf-core')))
			.finally(() => setLoading(false));
	}, []);

	useEffect(() => {
		load();
	}, [load]);

	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		if (!needle) return rows;
		return rows.filter((row) =>
			[row.title, row.slug, row.invocation].join(' ').toLowerCase().includes(needle)
		);
	}, [rows, query]);

	async function saveDraft() {
		setSaving(true);
		setNotice('');
		try {
			const payload = {
				title: draft.title,
				slug: draft.slug || draft.title,
				status: draft.status,
				definition: draft.definition,
			};
			const response = draft.id
				? await apiFetch({
						url: `${REST_BASE}/queries/${draft.id}`,
						method: 'POST',
						data: payload,
					})
				: await apiFetch({
						url: `${REST_BASE}/queries`,
						method: 'POST',
						data: payload,
					});
			setNotice(__('Query saved.', 'kpf-core'));
			setDraft(null);
			setPreview(null);
			load();
			return response;
		} catch (err) {
			setError(err?.message || __('Could not save the query.', 'kpf-core'));
		} finally {
			setSaving(false);
		}
	}

	async function previewDraft() {
		setError('');
		try {
			let id = draft.id;
			if (!id) {
				const created = await apiFetch({
					url: `${REST_BASE}/queries`,
					method: 'POST',
					data: {
						title: draft.title || __('Untitled query', 'kpf-core'),
						slug: draft.slug || `query-${Date.now()}`,
						status: 'draft',
						definition: draft.definition,
					},
				});
				id = created.id;
				setDraft({ ...draft, id, slug: created.slug, title: created.title });
			}
			const response = await apiFetch({
				url: `${REST_BASE}/queries/${id}/preview`,
				method: 'POST',
				data: { definition: draft.definition, page: 1 },
			});
			setPreview(response);
		} catch (err) {
			setError(err?.message || __('Could not preview this query.', 'kpf-core'));
		}
	}

	async function removeRow(row) {
		if (!window.confirm(sprintf(__('Delete query “%s”?', 'kpf-core'), row.title))) {
			return;
		}
		try {
			await apiFetch({ url: `${REST_BASE}/queries/${row.id}`, method: 'DELETE' });
			load();
		} catch (err) {
			setError(err?.message || __('Could not delete the query.', 'kpf-core'));
		}
	}

	if (loading) {
		return (
			<div className="kpf-queries-loading">
				<Spinner />
			</div>
		);
	}

	if (draft) {
		return (
			<>
				{error ? (
					<Notice status="error" onRemove={() => setError('')}>
						{error}
					</Notice>
				) : null}
				<QueryEditor
					draft={draft}
					options={options}
					onChange={setDraft}
					onSave={saveDraft}
					onCancel={() => {
						setDraft(null);
						setPreview(null);
					}}
					saving={saving}
					preview={preview}
					onPreview={previewDraft}
				/>
			</>
		);
	}

	return (
		<div className="kpf-queries-table-wrap">
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
			<div className="kpf-queries-toolbar">
				<label htmlFor="kpf-queries-search">{__('Search queries', 'kpf-core')}</label>
				<input
					id="kpf-queries-search"
					type="search"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder={__('Filter by title or slug…', 'kpf-core')}
				/>
				<Button variant="primary" onClick={() => setDraft(emptyDraft())}>
					{__('Add query', 'kpf-core')}
				</Button>
			</div>
			<table className="widefat striped kpf-queries-table">
				<thead>
					<tr>
						<th>{__('Query', 'kpf-core')}</th>
						<th>{__('Invocation', 'kpf-core')}</th>
						<th>{__('Source', 'kpf-core')}</th>
						<th>{__('Status', 'kpf-core')}</th>
						<th>{__('Actions', 'kpf-core')}</th>
					</tr>
				</thead>
				<tbody>
					{filtered.length === 0 ? (
						<tr>
							<td colSpan={5}>{__('No queries yet. Create one to use in page designs.', 'kpf-core')}</td>
						</tr>
					) : (
						filtered.map((row) => (
							<tr key={row.id}>
								<td>
									<strong>{row.title}</strong>
									<div>
										<code>{row.slug}</code>
									</div>
								</td>
								<td>
									<code>{row.invocation}</code>
								</td>
								<td>
									{row.definition?.postType} · {row.definition?.perPage}
								</td>
								<td>{row.active ? __('Active', 'kpf-core') : __('Inactive', 'kpf-core')}</td>
								<td className="kpf-query-row-actions">
									<Button variant="secondary" onClick={() => setDraft({ ...row })}>
										{__('Edit', 'kpf-core')}
									</Button>
									<Button
										variant="secondary"
										onClick={() => navigator.clipboard?.writeText(row.invocation)}
									>
										{__('Copy', 'kpf-core')}
									</Button>
									<Button variant="tertiary" isDestructive onClick={() => removeRow(row)}>
										{__('Delete', 'kpf-core')}
									</Button>
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
		</div>
	);
}
