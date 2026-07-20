import {
	Button,
	Notice,
	SelectControl,
	Spinner,
	TextControl,
	TextareaControl,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import LabelWithTag from '../design-tags/LabelWithTag';
import { SeoFields, emptySeoMeta } from '../seo-fields/SeoFields';

// Ensure the core data store is registered for media lookups.
void coreStore;

const config = window.kpfPageEditor || {};
const designTags = config.designTags || {};

apiFetch.use(apiFetch.createNonceMiddleware(config.nonce || ''));

function openFeaturedImageLibrary(onSelect) {
	if (!window.wp?.media) {
		return;
	}
	const frame = window.wp.media({
		title: __('Choose featured image', 'kpf-core'),
		button: { text: __('Use image', 'kpf-core') },
		multiple: false,
		library: { type: 'image' },
	});
	frame.on('select', () => {
		const attachment = frame.state().get('selection').first()?.toJSON();
		if (attachment) {
			onSelect(attachment);
		}
	});
	frame.open();
}

function slugify(value) {
	return String(value || '')
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-');
}

export default function App({ pageId }) {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const [tags, setTags] = useState([]);
	const [preview, setPreview] = useState({ title: '', description: '' });
	const [form, setForm] = useState(null);
	const { receiveEntityRecords } = useDispatch('core') || {};

	const mediaUrl = useSelect(
		(select) => {
			const id = form?.featuredImageId;
			if (!id) return form?.featuredImageUrl || '';
			const media = select('core')?.getMedia?.(id);
			return media?.source_url || form?.featuredImageUrl || '';
		},
		[form?.featuredImageId, form?.featuredImageUrl]
	);

	useEffect(() => {
		let cancelled = false;
		async function load() {
			setLoading(true);
			setError('');
			try {
				const [payload, tagPayload] = await Promise.all([
					apiFetch({ path: `/kpf-pages/v1/editor/${pageId}` }),
					apiFetch({ path: '/kpf-seo/v1/tags' }).catch(() => ({ tags: [] })),
				]);
				if (cancelled) return;
				setForm({
					...payload,
					seo: { ...emptySeoMeta(), ...(payload.seo || {}) },
					fieldValues: payload.fieldValues || {},
				});
				setPreview(payload.seoPreview || { title: '', description: '' });
				setTags(tagPayload.tags || []);
			} catch (err) {
				if (!cancelled) {
					setError(err?.message || __('Failed to load page editor.', 'kpf-core'));
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, [pageId]);

	useEffect(() => {
		if (!form || !pageId) return undefined;
		let cancelled = false;
		const handle = setTimeout(() => {
			apiFetch({
				path: `/kpf-seo/v1/resolve/${pageId}`,
				method: 'POST',
				data: {
					seo: form.seo || {},
					title: form.title || '',
					excerpt: form.excerpt || '',
					featured_media: form.featuredImageId || 0,
				},
			})
				.then((response) => {
					if (cancelled) return;
					setPreview({
						title: response.title || '',
						description: response.description || '',
						openGraph: response.openGraph || null,
					});
				})
				.catch(() => null);
		}, 250);
		return () => {
			cancelled = true;
			clearTimeout(handle);
		};
	}, [
		pageId,
		form?.seo?.title_template,
		form?.seo?.description_template,
		form?.seo?.og_title,
		form?.seo?.og_description,
		form?.seo?.og_image_id,
		form?.seo?.focus_keyphrase,
		form?.seo?.primary_category_id,
		form?.seo?.primary_topic_id,
		form?.title,
		form?.excerpt,
		form?.featuredImageId,
		form?.featuredImageUrl,
		mediaUrl,
	]);

	const livePreview = useMemo(() => {
		const imageUrl = form?.seo?.og_image_id
			? preview?.openGraph?.imageUrl || ''
			: mediaUrl || form?.featuredImageUrl || preview?.openGraph?.imageUrl || '';
		if (!imageUrl || imageUrl === preview?.openGraph?.imageUrl) {
			return preview;
		}
		return {
			...preview,
			openGraph: {
				...(preview?.openGraph || {}),
				imageUrl,
			},
		};
	}, [preview, form?.seo?.og_image_id, form?.featuredImageUrl, mediaUrl]);

	const permalinkPreview = useMemo(() => {
		if (!form?.link) return '';
		try {
			const url = new URL(form.link);
			const parts = url.pathname.replace(/\/$/, '').split('/');
			parts[parts.length - 1] = form.slug || parts[parts.length - 1];
			return `${url.origin}${parts.join('/')}/`;
		} catch (err) {
			return form.link;
		}
	}, [form?.link, form?.slug]);

	function updateForm(partial) {
		setForm((current) => (current ? { ...current, ...partial } : current));
		setNotice('');
	}

	function updateFieldValue(key, value) {
		setForm((current) =>
			current
				? {
						...current,
						fieldValues: {
							...(current.fieldValues || {}),
							[key]: value,
						},
					}
				: current
		);
		setNotice('');
	}

	async function save() {
		if (!form) return;
		setSaving(true);
		setError('');
		setNotice('');
		try {
			const saved = await apiFetch({
				path: `/kpf-pages/v1/editor/${pageId}`,
				method: 'POST',
				data: {
					title: form.title,
					slug: form.slug,
					status: form.status,
					date: form.date,
					excerpt: form.excerpt,
					featuredImageId: form.featuredImageId || 0,
					seo: form.seo,
					designId: form.designId || 0,
					fieldValues: form.fieldValues || {},
				},
			});
			setForm({
				...saved,
				seo: { ...emptySeoMeta(), ...(saved.seo || {}) },
				fieldValues: saved.fieldValues || {},
			});
			setPreview(saved.seoPreview || { title: '', description: '' });
			setNotice(__('Page saved.', 'kpf-core'));
			if (saved.featuredImageId && receiveEntityRecords) {
				// Warm media entity cache for image previews after save.
				receiveEntityRecords('root', 'media', [saved.featuredImageId]);
			}
		} catch (err) {
			setError(err?.message || __('Failed to save page.', 'kpf-core'));
		} finally {
			setSaving(false);
		}
	}

	if (loading) {
		return (
			<div className="kpf-page-editor kpf-page-editor--loading">
				<Spinner />
			</div>
		);
	}

	if (error && !form) {
		return (
			<div className="kpf-page-editor">
				<Notice status="error" isDismissible={false}>
					{error}
				</Notice>
			</div>
		);
	}

	if (!form) {
		return null;
	}

	const schema = form.fieldSchema || [];

	return (
		<div className="kpf-page-editor">
			<div className="kpf-page-editor__toolbar">
				<a className="button" href={form.pagesUrl || config.pagesUrl}>
					{__('← All Pages', 'kpf-core')}
				</a>
				<div className="kpf-page-editor__toolbar-actions">
					{notice ? <span className="kpf-page-editor__notice">{notice}</span> : null}
					{error ? <span className="kpf-page-editor__notice is-error">{error}</span> : null}
					<Button variant="primary" onClick={save} isBusy={saving} disabled={saving}>
						{saving ? __('Saving…', 'kpf-core') : __('Save page', 'kpf-core')}
					</Button>
				</div>
			</div>

			<section className="kpf-page-editor__section">
				<TextControl
					label={
						<LabelWithTag tag={designTags.title}>
							{__('Page title', 'kpf-core')}
						</LabelWithTag>
					}
					value={form.title || ''}
					onChange={(title) => {
						const next = { title };
						if (!form.slug || form.slug === slugify(form.title)) {
							next.slug = slugify(title);
						}
						updateForm(next);
					}}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={
						<LabelWithTag tag={designTags.slug}>{__('Slug', 'kpf-core')}</LabelWithTag>
					}
					help={
						permalinkPreview
							? sprintf(__('Permalink preview: %s', 'kpf-core'), permalinkPreview)
							: __('URL-safe name for this page.', 'kpf-core')
					}
					value={form.slug || ''}
					onChange={(slug) => updateForm({ slug: slugify(slug) })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</section>

			<section className="kpf-page-editor__section">
				<SeoFields
					seo={form.seo}
					preview={livePreview}
					tags={tags}
					onChange={(seo) => updateForm({ seo })}
					designTags={designTags}
				/>
			</section>

			<section className="kpf-page-editor__section">
				<h2>{__('Page content fields', 'kpf-core')}</h2>
				{!form.hasDesign ? (
					<Notice status="warning" isDismissible={false}>
						{__(
							'No design is attached yet. Add placeholders like {{fields.hero_heading}} in a design, then attach it under Pages → Designs.',
							'kpf-core'
						)}
					</Notice>
				) : null}
				{form.hasDesign && schema.length === 0 ? (
					<Notice status="info" isDismissible={false}>
						{__(
							'This design has no editable page fields. Add {{fields.your_key}} placeholders in the design HTML to collect values here.',
							'kpf-core'
						)}
					</Notice>
				) : null}
				{schema.length > 0 ? (
					<>
						<p className="description">
							{__(
								'These fields come from placeholders in the attached design. Edit the design to add or remove fields.',
								'kpf-core'
							)}
						</p>
						<div className="kpf-page-editor__fields">
							{schema.map((field) => (
								<TextareaControl
									key={field.key}
									label={
										<LabelWithTag tag={`{{fields.${field.key}}}`}>
											{field.label || field.key}
										</LabelWithTag>
									}
									value={form.fieldValues?.[field.key] || ''}
									onChange={(value) => updateFieldValue(field.key, value)}
									__nextHasNoMarginBottom
								/>
							))}
						</div>
					</>
				) : null}
			</section>

			<section className="kpf-page-editor__section">
				<h2>{__('Page design', 'kpf-core')}</h2>
				{form.hasDesign ? (
					<Notice status="success" isDismissible={false}>
						{sprintf(
							__('Using design: %s', 'kpf-core'),
							form.designTitle || __('Untitled design', 'kpf-core')
						)}
					</Notice>
				) : (
					<Notice status="warning" isDismissible={false}>
						{__('No design file yet. Upload and attach one under Pages → Designs.', 'kpf-core')}
					</Notice>
				)}
				<p>
					<Button variant="secondary" href={form.designsUrl || config.designsUrl}>
						{__('Manage designs', 'kpf-core')}
					</Button>
				</p>
			</section>

			<section className="kpf-page-editor__section kpf-page-editor__section--split">
				<div>
					<h2>{__('Publish', 'kpf-core')}</h2>
					<SelectControl
						label={__('Status', 'kpf-core')}
						value={form.status || 'draft'}
						options={[
							{ label: __('Published', 'kpf-core'), value: 'publish' },
							{ label: __('Draft', 'kpf-core'), value: 'draft' },
							{ label: __('Pending review', 'kpf-core'), value: 'pending' },
							{ label: __('Private', 'kpf-core'), value: 'private' },
							{ label: __('Scheduled', 'kpf-core'), value: 'future' },
						]}
						onChange={(status) => updateForm({ status })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={
							<LabelWithTag tag={designTags.date}>
								{__('Publish date', 'kpf-core')}
							</LabelWithTag>
						}
						help={__('Local WordPress datetime (YYYY-MM-DD HH:MM:SS).', 'kpf-core')}
						value={form.date || ''}
						onChange={(date) => updateForm({ date })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</div>
				<div>
					<h2>
						<LabelWithTag tag={designTags['featuredImage.url']}>
							{__('Featured image', 'kpf-core')}
						</LabelWithTag>
					</h2>
					{mediaUrl ? (
						<img className="kpf-page-editor__featured" src={mediaUrl} alt="" />
					) : null}
					<div className="kpf-page-editor__image-actions">
						<Button
							variant="secondary"
							onClick={() =>
								openFeaturedImageLibrary((media) =>
									updateForm({
										featuredImageId: media.id || 0,
										featuredImageUrl: media.url || media.source_url || '',
									})
								)
							}
						>
							{form.featuredImageId
								? __('Replace featured image', 'kpf-core')
								: __('Choose featured image', 'kpf-core')}
						</Button>
						{form.featuredImageId ? (
							<Button
								variant="link"
								isDestructive
								onClick={() =>
									updateForm({ featuredImageId: 0, featuredImageUrl: '' })
								}
							>
								{__('Remove', 'kpf-core')}
							</Button>
						) : null}
					</div>
					<TextareaControl
						label={
							<LabelWithTag tag={designTags.excerpt}>
								{__('Excerpt', 'kpf-core')}
							</LabelWithTag>
						}
						help={__(
							'Short summary used by SEO and design placeholders when available.',
							'kpf-core'
						)}
						value={form.excerpt || ''}
						onChange={(excerpt) => updateForm({ excerpt })}
						__nextHasNoMarginBottom
					/>
				</div>
			</section>
		</div>
	);
}
