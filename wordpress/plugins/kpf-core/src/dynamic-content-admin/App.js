import { useEffect, useMemo, useState } from '@wordpress/element';
import {
	Button,
	Notice,
	SearchControl,
	Spinner,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { dynamicContentApi } from './api';

function emptyTag() {
	return {
		key: '',
		label: '',
		description: '',
		value: '',
		enabled: true,
		expose_seo: true,
		expose_design: true,
	};
}

export default function App() {
	const [catalog, setCatalog] = useState(null);
	const [custom, setCustom] = useState([]);
	const [saved, setSaved] = useState([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [notice, setNotice] = useState(null);
	const [query, setQuery] = useState('');
	const [copied, setCopied] = useState('');

	const dirty = useMemo(() => JSON.stringify(custom) !== JSON.stringify(saved), [custom, saved]);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			try {
				const next = await dynamicContentApi.getCatalog();
				if (cancelled) {
					return;
				}
				setCatalog(next);
				setCustom(next.custom || []);
				setSaved(next.custom || []);
			} catch (error) {
				if (!cancelled) {
					setNotice({
						status: 'error',
						message: error?.message || __('Could not load dynamic content tags.', 'kpf-core'),
					});
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	async function copyInvocation(value) {
		try {
			await navigator.clipboard.writeText(value);
		} catch (error) {
			const input = document.createElement('input');
			input.value = value;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
		}
		setCopied(value);
		setTimeout(() => setCopied(''), 1500);
	}

	async function save() {
		setSaving(true);
		setNotice(null);
		try {
			const result = await dynamicContentApi.saveTags(custom);
			setCustom(result.tags || []);
			setSaved(result.tags || []);
			if (result.catalog) {
				setCatalog(result.catalog);
			}
			setNotice({
				status: 'success',
				message: __('Site-wide tags saved and synced.', 'kpf-core'),
			});
		} catch (error) {
			setNotice({
				status: 'error',
				message: error?.message || __('Could not save tags.', 'kpf-core'),
			});
		} finally {
			setSaving(false);
		}
	}

	function updateCustom(index, patch) {
		setCustom((current) =>
			current.map((tag, i) => (i === index ? { ...tag, ...patch } : tag))
		);
	}

	function addTag() {
		setCustom((current) => [...current, emptyTag()]);
	}

	function removeTag(index) {
		setCustom((current) => current.filter((_, i) => i !== index));
	}

	const sections = useMemo(() => {
		const list = catalog?.sections || [];
		const q = query.trim().toLowerCase();
		if (!q) {
			return list;
		}
		return list
			.map((section) => ({
				...section,
				tags: (section.tags || []).filter((tag) =>
					[tag.token, tag.label, tag.description, tag.invocation, ...(tag.invocations || [])]
						.join(' ')
						.toLowerCase()
						.includes(q)
				),
			}))
			.filter((section) => section.editable || (section.tags && section.tags.length > 0));
	}, [catalog, query]);

	if (loading) {
		return (
			<div className="kpf-dc-loading">
				<Spinner />
			</div>
		);
	}

	return (
		<div className="kpf-dc">
			<header className="kpf-dc__header">
				<div>
					<h1>{__('Dynamic Content', 'kpf-core')}</h1>
					<p>
						{__(
							'Browse every tag you can invoke on the front end, then edit site-wide custom values. Changes sync to SEO patterns (%%site_key%%) and design templates ({{site.key}}).',
							'kpf-core'
						)}
					</p>
				</div>
				<div className="kpf-dc__actions">
					{dirty ? <span className="kpf-dc__dirty">{__('Unsaved', 'kpf-core')}</span> : null}
					<Button variant="primary" onClick={save} isBusy={saving} disabled={saving || !dirty}>
						{__('Save site tags', 'kpf-core')}
					</Button>
				</div>
			</header>

			{notice ? (
				<Notice status={notice.status} isDismissible onRemove={() => setNotice(null)}>
					{notice.message}
				</Notice>
			) : null}
			{copied ? (
				<Notice status="success" isDismissible={false}>
					{__('Copied', 'kpf-core')}: {copied}
				</Notice>
			) : null}

			<div className="kpf-dc__toolbar">
				<SearchControl
					label={__('Search tags', 'kpf-core')}
					value={query}
					onChange={setQuery}
					__nextHasNoMarginBottom
				/>
			</div>

			<section className="kpf-dc-section">
				<header className="kpf-dc-section__header">
					<h2>{__('Site-wide custom tags', 'kpf-core')}</h2>
					<p>
						{__(
							'Editable values available everywhere. Enable SEO and/or design exposure per tag.',
							'kpf-core'
						)}
					</p>
				</header>
				<div className="kpf-dc-section__body">
					{custom.map((tag, index) => (
						<div key={`custom-${index}`} className="kpf-dc-editor">
							<div className="kpf-dc-editor__grid">
								<TextControl
									label={__('Key', 'kpf-core')}
									help={__('Letters, numbers, hyphen, underscore.', 'kpf-core')}
									value={tag.key}
									onChange={(key) => updateCustom(index, { key })}
									__next40pxDefaultSize
									__nextHasNoMarginBottom
								/>
								<TextControl
									label={__('Label', 'kpf-core')}
									value={tag.label}
									onChange={(label) => updateCustom(index, { label })}
									__next40pxDefaultSize
									__nextHasNoMarginBottom
								/>
							</div>
							<TextControl
								label={__('Description', 'kpf-core')}
								value={tag.description}
								onChange={(description) => updateCustom(index, { description })}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<TextareaControl
								label={__('Value', 'kpf-core')}
								value={tag.value}
								onChange={(value) => updateCustom(index, { value })}
								rows={3}
								__nextHasNoMarginBottom
							/>
							<div className="kpf-dc-editor__toggles">
								<ToggleControl
									label={__('Enabled', 'kpf-core')}
									checked={!!tag.enabled}
									onChange={(enabled) => updateCustom(index, { enabled })}
								/>
								<ToggleControl
									label={__('Expose as %%site_key%%', 'kpf-core')}
									checked={!!tag.expose_seo}
									onChange={(expose_seo) => updateCustom(index, { expose_seo })}
								/>
								<ToggleControl
									label={__('Expose as {{site.key}}', 'kpf-core')}
									checked={!!tag.expose_design}
									onChange={(expose_design) => updateCustom(index, { expose_design })}
								/>
							</div>
							<div className="kpf-dc-editor__footer">
								{tag.key ? (
									<code>
										%%site_{tag.key}%% · {'{{site.'}
										{tag.key}
										{'}}'}
									</code>
								) : null}
								<Button isDestructive variant="tertiary" onClick={() => removeTag(index)}>
									{__('Remove', 'kpf-core')}
								</Button>
							</div>
						</div>
					))}
					<Button variant="secondary" onClick={addTag}>
						{__('Add custom tag', 'kpf-core')}
					</Button>
				</div>
			</section>

			{sections
				.filter((section) => section.id !== 'site')
				.map((section) => (
					<section key={section.id} className="kpf-dc-section">
						<header className="kpf-dc-section__header">
							<h2>{section.label}</h2>
							{section.description ? <p>{section.description}</p> : null}
						</header>
						<div className="kpf-dc-section__body">
							{(section.tags || []).length === 0 ? (
								<p className="kpf-dc__empty">{__('No tags in this group.', 'kpf-core')}</p>
							) : (
								(section.tags || []).map((tag) => (
									<div key={tag.id || tag.token} className="kpf-dc-row">
										<div className="kpf-dc-row__main">
											<strong>{tag.label}</strong>
											<span>{tag.description}</span>
											<div className="kpf-dc-row__tokens">
												{(tag.invocations || [tag.invocation]).filter(Boolean).map((token) => (
													<button
														key={token}
														type="button"
														className="kpf-dc-token"
														onClick={() => copyInvocation(token)}
													>
														<code>{token}</code>
													</button>
												))}
											</div>
										</div>
										<Button
											variant="secondary"
											size="compact"
											onClick={() =>
												copyInvocation(
													(tag.invocations && tag.invocations[0]) || tag.invocation
												)
											}
										>
											{__('Copy', 'kpf-core')}
										</Button>
									</div>
								))
							)}
						</div>
					</section>
				))}
		</div>
	);
}
