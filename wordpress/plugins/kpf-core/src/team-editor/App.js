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
import { SeoFields, emptySeoMeta } from '../seo-fields/SeoFields';

void coreStore;

const config = window.kpfTeamEditor || {};
const SOCIAL_TYPES = config.socialTypes || [
	'facebook',
	'instagram',
	'twitter',
	'linkedin',
	'youtube',
	'tiktok',
	'threads',
	'website',
	'other',
];

const SOCIAL_LABELS = {
	facebook: 'Facebook',
	instagram: 'Instagram',
	twitter: 'X / Twitter',
	linkedin: 'LinkedIn',
	youtube: 'YouTube',
	tiktok: 'TikTok',
	threads: 'Threads',
	website: 'Website',
	other: 'Other',
};

const EMPTY_PROFILE = {
	version: 1,
	job_title: '',
	short_summary: '',
	email: '',
	phone: '',
	social_links: [],
};

apiFetch.use(apiFetch.createNonceMiddleware(config.nonce || ''));

function openProfileImageLibrary(onSelect) {
	if (!window.wp?.media) {
		return;
	}
	const frame = window.wp.media({
		title: __('Choose profile photo', 'kpf-core'),
		button: { text: __('Use photo', 'kpf-core') },
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

function compactSlug(value) {
	return String(value || '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '');
}

export default function App({ memberId }) {
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
					apiFetch({ path: `/kpf-team/v1/editor/${memberId}` }),
					apiFetch({ path: '/kpf-seo/v1/tags' }).catch(() => ({ tags: [] })),
				]);
				if (cancelled) return;
				setForm({
					...payload,
					profile: { ...EMPTY_PROFILE, ...(payload.profile || {}) },
					seo: { ...emptySeoMeta(), ...(payload.seo || {}) },
				});
				setPreview(payload.seoPreview || { title: '', description: '' });
				setTags(tagPayload.tags || []);
			} catch (err) {
				if (!cancelled) {
					setError(
						err?.message || __('Failed to load team member editor.', 'kpf-core')
					);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, [memberId]);

	useEffect(() => {
		if (!form || !memberId) return undefined;
		let cancelled = false;
		const handle = setTimeout(() => {
			apiFetch({
				path: `/kpf-seo/v1/resolve/${memberId}`,
				method: 'POST',
				data: {
					seo: form.seo || {},
					title: form.title || '',
					excerpt: form.profile?.short_summary || form.content || '',
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
		memberId,
		form?.seo?.title_template,
		form?.seo?.description_template,
		form?.seo?.og_title,
		form?.seo?.og_description,
		form?.seo?.og_image_id,
		form?.seo?.focus_keyphrase,
		form?.title,
		form?.profile?.short_summary,
		form?.content,
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
		const pathPrefix = form?.profilePath || '/profile/';
		const slug = form?.slug || compactSlug(form?.title || '');
		if (!slug) return '';
		if (form?.link) {
			try {
				const url = new URL(form.link);
				return `${url.origin}${pathPrefix}${slug}/`;
			} catch {
				// Fall through.
			}
		}
		return `${pathPrefix}${slug}/`;
	}, [form?.link, form?.profilePath, form?.slug, form?.title]);

	function updateForm(partial) {
		setForm((current) => (current ? { ...current, ...partial } : current));
		setNotice('');
	}

	function updateProfile(partial) {
		setForm((current) =>
			current
				? {
						...current,
						profile: { ...EMPTY_PROFILE, ...(current.profile || {}), ...partial },
					}
				: current
		);
		setNotice('');
	}

	const links = Array.isArray(form?.profile?.social_links)
		? form.profile.social_links
		: [];

	function updateLink(index, patch) {
		const next = links.map((row, i) => (i === index ? { ...row, ...patch } : row));
		updateProfile({ social_links: next });
	}

	function addLink(type) {
		updateProfile({
			social_links: [...links, { type: type || 'website', url: '', label: '' }],
		});
	}

	function removeLink(index) {
		updateProfile({ social_links: links.filter((_, i) => i !== index) });
	}

	async function save() {
		if (!form) return;
		setSaving(true);
		setError('');
		setNotice('');
		try {
			const saved = await apiFetch({
				path: `/kpf-team/v1/editor/${memberId}`,
				method: 'POST',
				data: {
					title: form.title,
					slug: form.slug,
					status: form.status,
					content: form.content,
					featuredImageId: form.featuredImageId || 0,
					profile: form.profile,
					seo: form.seo,
				},
			});
			setForm({
				...saved,
				profile: { ...EMPTY_PROFILE, ...(saved.profile || {}) },
				seo: { ...emptySeoMeta(), ...(saved.seo || {}) },
			});
			setPreview(saved.seoPreview || { title: '', description: '' });
			setNotice(__('Team member saved.', 'kpf-core'));
			if (saved.featuredImageId && receiveEntityRecords) {
				receiveEntityRecords('root', 'media', [saved.featuredImageId]);
			}
		} catch (err) {
			setError(err?.message || __('Failed to save team member.', 'kpf-core'));
		} finally {
			setSaving(false);
		}
	}

	if (loading) {
		return (
			<div className="kpf-team-editor kpf-team-editor--loading">
				<Spinner />
			</div>
		);
	}

	if (error && !form) {
		return (
			<div className="kpf-team-editor">
				<Notice status="error" isDismissible={false}>
					{error}
				</Notice>
			</div>
		);
	}

	if (!form) {
		return null;
	}

	const profile = { ...EMPTY_PROFILE, ...(form.profile || {}) };

	return (
		<div className="kpf-team-editor">
			<div className="kpf-team-editor__toolbar">
				<a className="button" href={form.teamUrl || config.teamUrl}>
					{__('← Manage Team', 'kpf-core')}
				</a>
				<div className="kpf-team-editor__toolbar-actions">
					{notice ? <span className="kpf-team-editor__notice">{notice}</span> : null}
					{error ? (
						<span className="kpf-team-editor__notice is-error">{error}</span>
					) : null}
					<Button variant="primary" onClick={save} isBusy={saving} disabled={saving}>
						{saving ? __('Saving…', 'kpf-core') : __('Save', 'kpf-core')}
					</Button>
				</div>
			</div>

			<section className="kpf-team-editor__section">
				<TextControl
					label={__('Name', 'kpf-core')}
					value={form.title || ''}
					onChange={(title) => {
						const next = { title };
						const currentCompact = compactSlug(form.title);
						if (!form.slug || form.slug === currentCompact) {
							next.slug = compactSlug(title);
						}
						updateForm(next);
					}}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={__('Profile URL slug', 'kpf-core')}
					help={
						permalinkPreview
							? sprintf(__('Permalink preview: %s', 'kpf-core'), permalinkPreview)
							: __(
									'Compact path like firstnamelastname (no spaces or hyphens).',
									'kpf-core'
								)
					}
					value={form.slug || ''}
					onChange={(slug) => updateForm({ slug: compactSlug(slug) })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</section>

			<section className="kpf-team-editor__section">
				<h2>{__('Profile', 'kpf-core')}</h2>
				<TextControl
					label={__('Title', 'kpf-core')}
					help={__('Role or position, e.g. Board Chair.', 'kpf-core')}
					value={profile.job_title || ''}
					onChange={(job_title) => updateProfile({ job_title })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<TextareaControl
					label={__('Short summary', 'kpf-core')}
					help={__('A brief blurb for cards and listings.', 'kpf-core')}
					value={profile.short_summary || ''}
					onChange={(short_summary) => updateProfile({ short_summary })}
					rows={3}
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={__('Email', 'kpf-core')}
					type="email"
					value={profile.email || ''}
					onChange={(email) => updateProfile({ email })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={__('Phone number', 'kpf-core')}
					type="tel"
					value={profile.phone || ''}
					onChange={(phone) => updateProfile({ phone })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</section>

			<section className="kpf-team-editor__section">
				<h2>{__('Biography', 'kpf-core')}</h2>
				<TextareaControl
					label={__('Full biography', 'kpf-core')}
					hideLabelFromVision
					help={__('Shown on the public profile page.', 'kpf-core')}
					value={form.content || ''}
					onChange={(content) => updateForm({ content })}
					rows={10}
					__nextHasNoMarginBottom
				/>
			</section>

			<section className="kpf-team-editor__section">
				<h2>{__('Social media links', 'kpf-core')}</h2>
				{links.map((link, index) => (
					<div key={`social-${index}`} className="kpf-team-editor__social-card">
						<SelectControl
							label={__('Link type', 'kpf-core')}
							value={link.type || 'website'}
							options={SOCIAL_TYPES.map((type) => ({
								label: SOCIAL_LABELS[type] || type,
								value: type,
							}))}
							onChange={(type) => updateLink(index, { type })}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={__('URL', 'kpf-core')}
							value={link.url || ''}
							onChange={(url) => updateLink(index, { url })}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						{'other' === link.type ? (
							<TextControl
								label={__('Label', 'kpf-core')}
								value={link.label || ''}
								onChange={(label) => updateLink(index, { label })}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						) : null}
						<Button variant="link" isDestructive onClick={() => removeLink(index)}>
							{__('Remove link', 'kpf-core')}
						</Button>
					</div>
				))}
				<div className="kpf-team-editor__social-add">
					<SelectControl
						label={__('Add a link', 'kpf-core')}
						value=""
						options={[
							{ label: __('Choose type…', 'kpf-core'), value: '' },
							...SOCIAL_TYPES.map((type) => ({
								label: SOCIAL_LABELS[type] || type,
								value: type,
							})),
						]}
						onChange={(type) => {
							if (type) addLink(type);
						}}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</div>
			</section>

			<section className="kpf-team-editor__section">
				<SeoFields
					seo={form.seo}
					preview={livePreview}
					tags={tags}
					onChange={(seo) => updateForm({ seo })}
				/>
			</section>

			<section className="kpf-team-editor__section kpf-team-editor__section--split">
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
				</div>
				<div>
					<h2>{__('Profile photo', 'kpf-core')}</h2>
					{mediaUrl ? (
						<img className="kpf-team-editor__featured" src={mediaUrl} alt="" />
					) : null}
					<div className="kpf-team-editor__image-actions">
						<Button
							variant="secondary"
							onClick={() =>
								openProfileImageLibrary((media) =>
									updateForm({
										featuredImageId: media.id || 0,
										featuredImageUrl: media.url || media.source_url || '',
									})
								)
							}
						>
							{form.featuredImageId
								? __('Replace photo', 'kpf-core')
								: __('Choose photo', 'kpf-core')}
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
				</div>
			</section>
		</div>
	);
}
