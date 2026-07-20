import {
	Button,
	PanelBody,
	SelectControl,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import LabelWithTag from '../design-tags/LabelWithTag';
import SeoPlaceholderGuide from './SeoPlaceholderGuide';
import './style.css';

export function emptySeoMeta() {
	return {
		title_template: null,
		description_template: null,
		canonical: null,
		robots_index: null,
		robots_follow: null,
		robots_noarchive: null,
		robots_nosnippet: null,
		og_title: null,
		og_description: null,
		og_image_id: null,
		twitter_title: null,
		twitter_description: null,
		twitter_image_id: null,
		schema_type: null,
		custom_json_ld: null,
		show_in_sitemap: null,
		primary_category_id: null,
		primary_topic_id: null,
		focus_keyphrase: null,
		custom_meta: [],
	};
}

function openImageLibrary(onSelect) {
	if (!window.wp?.media) {
		return;
	}
	const frame = window.wp.media({
		title: __('Choose social image', 'kpf-core'),
		button: { text: __('Use image', 'kpf-core') },
		multiple: false,
		library: { type: 'image' },
	});
	frame.on('select', () => {
		const attachment = frame.state().get('selection').first()?.toJSON();
		if (attachment?.id) {
			onSelect(attachment);
		}
	});
	frame.open();
}

function SocialImageField({ imageId, onChange, label }) {
	const imageUrl = useSelect(
		(select) => {
			if (!imageId) return '';
			const media = select('core')?.getMedia?.(imageId);
			return media?.source_url || media?.media_details?.sizes?.medium?.source_url || '';
		},
		[imageId]
	);

	return (
		<div className="kpf-seo-editor__image">
			{imageUrl ? <img src={imageUrl} alt="" /> : null}
			<div className="kpf-seo-editor__image-actions">
				<Button variant="secondary" onClick={() => openImageLibrary((media) => onChange(media.id || null))}>
					{imageId ? label.replaceImage : label.chooseImage}
				</Button>
				{imageId ? (
					<Button variant="link" isDestructive onClick={() => onChange(null)}>
						{__('Remove', 'kpf-core')}
					</Button>
				) : null}
			</div>
		</div>
	);
}

function useAssignedTermOptions(taxonomy, attribute) {
	return useSelect(
		(select) => {
			const editor = select('core/editor');
			const core = select('core');
			if (!editor?.getEditedPostAttribute || !core?.getEntityRecord) {
				return [];
			}
			const ids = editor.getEditedPostAttribute(attribute) || [];
			return ids
				.map((id) => {
					const term = core.getEntityRecord('taxonomy', taxonomy, id);
					if (!term) return null;
					return { label: term.name, value: String(term.id) };
				})
				.filter(Boolean);
		},
		[taxonomy, attribute]
	);
}

function PrimaryTermSelect({ label, help, options, value, onChange, emptyHelp }) {
	if (!options.length) {
		return (
			<div className="kpf-seo-editor__term-empty-wrap">
				<div className="kpf-seo-editor__term-label">{label}</div>
				<p className="description kpf-seo-editor__term-empty">{emptyHelp}</p>
			</div>
		);
	}

	return (
		<SelectControl
			label={label}
			help={help}
			value={value ? String(value) : ''}
			options={[
				{ label: __('Use first assigned', 'kpf-core'), value: '' },
				...options,
			]}
			onChange={(next) => onChange(next ? Number(next) : null)}
			__next40pxDefaultSize
			__nextHasNoMarginBottom
		/>
	);
}

function FocusKeyphraseHint({ keyphrase, title, description }) {
	const phrase = (keyphrase || '').trim().toLowerCase();
	if (!phrase) {
		return null;
	}

	const inTitle = (title || '').toLowerCase().includes(phrase);
	const inDescription = (description || '').toLowerCase().includes(phrase);

	return (
		<ul className="kpf-seo-editor__keyphrase-hints">
			<li className={inTitle ? 'is-ok' : 'is-warn'}>
				{inTitle
					? __('Focus keyphrase appears in the search title.', 'kpf-core')
					: __('Focus keyphrase is missing from the search title.', 'kpf-core')}
			</li>
			<li className={inDescription ? 'is-ok' : 'is-warn'}>
				{inDescription
					? __('Focus keyphrase appears in the search description.', 'kpf-core')
					: __('Focus keyphrase is missing from the search description.', 'kpf-core')}
			</li>
		</ul>
	);
}

function OpenGraphPreview({ preview }) {
	const og = preview?.openGraph || {};
	const title = og.title || preview?.title || '—';
	const description =
		og.description ||
		preview?.description ||
		__('Add a description to see how this may appear when shared.', 'kpf-core');
	const imageUrl = og.imageUrl || '';
	let host = '';
	try {
		host = og.url ? new URL(og.url).hostname.replace(/^www\./, '') : '';
	} catch (error) {
		host = '';
	}

	return (
		<div className="kpf-seo-editor__og-preview">
			<p className="kpf-seo-editor__preview-label">{__('Open Graph preview', 'kpf-core')}</p>
			<div className="kpf-seo-editor__og-card">
				{imageUrl ? (
					<img className="kpf-seo-editor__og-image" src={imageUrl} alt="" />
				) : (
					<div className="kpf-seo-editor__og-image is-empty">
						{__('No social image yet', 'kpf-core')}
					</div>
				)}
				<div className="kpf-seo-editor__og-body">
					{host ? <p className="kpf-seo-editor__og-host">{host}</p> : null}
					<p className="kpf-seo-editor__og-title">{title}</p>
					<p className="kpf-seo-editor__og-description">{description}</p>
				</div>
			</div>
		</div>
	);
}

/**
 * Controlled SEO fields UI shared by the page editor and blog canvas SEO panel.
 *
 * @param {object} props
 * @param {Record<string, string>} [props.designTags] Optional design Mustache tags keyed by SEO field.
 * @param {boolean} [props.collapseDetailsByDefault] When true, keep only previews visible and collapse edit fields.
 */
export function SeoFields({
	seo,
	preview = { title: '', description: '', openGraph: null },
	tags = [],
	onChange,
	className = '',
	compact = false,
	collapseDetailsByDefault = false,
	designTags = null,
}) {
	const value = { ...emptySeoMeta(), ...(seo || {}) };
	const tagsMap = designTags && typeof designTags === 'object' ? designTags : {};
	const categoryOptions = useAssignedTermOptions('category', 'categories');
	const topicOptions = useAssignedTermOptions('post_tag', 'tags');
	const supportsTaxonomies = useSelect((select) => {
		const editor = select('core/editor');
		if (!editor?.getCurrentPostType) {
			return { categories: false, tags: false };
		}
		const postType = editor.getCurrentPostType();
		const type = select('core')?.getPostType?.(postType);
		const taxonomies = type?.taxonomies || [];
		return {
			categories: taxonomies.includes('category'),
			tags: taxonomies.includes('post_tag'),
		};
	}, []);

	function update(partial) {
		onChange({ ...value, ...partial });
	}

	const details = (
		<>
			<div className="kpf-seo-editor__grid">
				<TextControl
					label={
						<LabelWithTag tag="%%focuskw%%">
							{__('Focus keyphrase', 'kpf-core')}
						</LabelWithTag>
					}
					help={__(
						'The main phrase you want this page to rank for. Paste %%focuskw%% into a title or description pattern to reuse it.',
						'kpf-core'
					)}
					value={value.focus_keyphrase || ''}
					onChange={(next) => update({ focus_keyphrase: next || null })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</div>
			<FocusKeyphraseHint
				keyphrase={value.focus_keyphrase}
				title={preview?.title || value.title_template}
				description={preview?.description || value.description_template}
			/>

			{(supportsTaxonomies.categories || supportsTaxonomies.tags) && (
				<div className="kpf-seo-editor__grid">
					{supportsTaxonomies.categories ? (
						<PrimaryTermSelect
							label={
								<LabelWithTag tag="%%category%%">
									{__('Primary category', 'kpf-core')}
								</LabelWithTag>
							}
							help={__(
								'Controls %%category%% in title/description patterns, breadcrumbs, Open Graph article:section, and structured data. Assign categories in the Document sidebar first.',
								'kpf-core'
							)}
							options={categoryOptions}
							value={value.primary_category_id}
							onChange={(primary_category_id) => update({ primary_category_id })}
							emptyHelp={__(
								'Assign at least one category to choose a primary category.',
								'kpf-core'
							)}
						/>
					) : null}
					{supportsTaxonomies.tags ? (
						<PrimaryTermSelect
							label={
								<LabelWithTag tag="%%tag%%">
									{__('Primary topic', 'kpf-core')}
								</LabelWithTag>
							}
							help={__(
								'Controls %%tag%% in title/description patterns and article keywords. Assign topics in the Document sidebar first.',
								'kpf-core'
							)}
							options={topicOptions}
							value={value.primary_topic_id}
							onChange={(primary_topic_id) => update({ primary_topic_id })}
							emptyHelp={__(
								'Assign at least one topic to choose a primary topic.',
								'kpf-core'
							)}
						/>
					) : null}
				</div>
			)}

			<div className="kpf-seo-editor__grid">
				<TextControl
					label={
						<LabelWithTag tag={tagsMap['seo.title']}>
							{__('Search title', 'kpf-core')}
						</LabelWithTag>
					}
					help={__(
						'Optional. Leave blank to use the default for this kind of page. You can use placeholders such as %%title%%, %%category%%, or %%focuskw%%.',
						'kpf-core'
					)}
					value={value.title_template || ''}
					onChange={(next) => update({ title_template: next || null })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<TextareaControl
					label={
						<LabelWithTag tag={tagsMap['seo.description']}>
							{__('Search description', 'kpf-core')}
						</LabelWithTag>
					}
					help={__(
						'Optional. Short summary for search results. Placeholders like %%excerpt%%, %%tag%%, and %%focuskw%% work here too.',
						'kpf-core'
					)}
					value={value.description_template || ''}
					onChange={(next) => update({ description_template: next || null })}
					rows={4}
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={
						<LabelWithTag tag={tagsMap['seo.canonical']}>
							{__('Preferred page address (advanced)', 'kpf-core')}
						</LabelWithTag>
					}
					help={__(
						'Usually leave this blank. Use it only when the same content exists at more than one address and search engines should prefer a specific one.',
						'kpf-core'
					)}
					value={value.canonical || ''}
					onChange={(next) => update({ canonical: next || null })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</div>

			<div className="kpf-seo-editor__toggles">
				<ToggleControl
					label={__('Hide this page from search results', 'kpf-core')}
					help={__(
						'Use this for private, temporary, or duplicate pages. It asks search engines not to list this page.',
						'kpf-core'
					)}
					checked={value.robots_index === false}
					onChange={(checked) => update({ robots_index: checked ? false : null })}
				/>
				<ToggleControl
					label={__('Ask search engines not to follow links on this page', 'kpf-core')}
					help={__('Advanced: usually leave this off.', 'kpf-core')}
					checked={value.robots_follow === false}
					onChange={(checked) => update({ robots_follow: checked ? false : null })}
				/>
				<ToggleControl
					label={__('Ask search engines not to show a cached copy', 'kpf-core')}
					help={__('Adds the noarchive robots directive.', 'kpf-core')}
					checked={value.robots_noarchive === true}
					onChange={(checked) => update({ robots_noarchive: checked ? true : null })}
				/>
				<ToggleControl
					label={__('Ask search engines not to show a text snippet', 'kpf-core')}
					help={__('Adds the nosnippet robots directive.', 'kpf-core')}
					checked={value.robots_nosnippet === true}
					onChange={(checked) => update({ robots_nosnippet: checked ? true : null })}
				/>
				<ToggleControl
					label={__('Hide from the sitemap', 'kpf-core')}
					help={__(
						'Keep this off unless you specifically do not want this page listed in the XML sitemap.',
						'kpf-core'
					)}
					checked={value.show_in_sitemap === false}
					onChange={(checked) => update({ show_in_sitemap: checked ? false : null })}
				/>
			</div>

			<PanelBody
				title={__('Social sharing', 'kpf-core')}
				initialOpen={!collapseDetailsByDefault}
			>
				<div className="kpf-seo-editor__grid">
					<TextControl
						label={__('Social title', 'kpf-core')}
						help={__(
							'Optional. Used when this page is shared on Facebook, LinkedIn, and similar services.',
							'kpf-core'
						)}
						value={value.og_title || ''}
						onChange={(next) => update({ og_title: next || null })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<TextareaControl
						label={__('Social description', 'kpf-core')}
						help={__('Optional. Leave blank to use the search description.', 'kpf-core')}
						value={value.og_description || ''}
						onChange={(next) => update({ og_description: next || null })}
						__nextHasNoMarginBottom
					/>
				</div>
				<p className="description">
					{__(
						'Social image. Leave empty to use the featured image or the site default.',
						'kpf-core'
					)}
				</p>
				<SocialImageField
					imageId={value.og_image_id || 0}
					onChange={(og_image_id) => update({ og_image_id: og_image_id || null })}
					label={{
						chooseImage: __('Choose social image', 'kpf-core'),
						replaceImage: __('Replace social image', 'kpf-core'),
					}}
				/>
			</PanelBody>

			<PanelBody title={__('Twitter / X', 'kpf-core')} initialOpen={false}>
				<div className="kpf-seo-editor__grid">
					<TextControl
						label={__('Twitter title', 'kpf-core')}
						help={__('Optional. Leave blank to use the social title.', 'kpf-core')}
						value={value.twitter_title || ''}
						onChange={(next) => update({ twitter_title: next || null })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<TextareaControl
						label={__('Twitter description', 'kpf-core')}
						help={__('Optional. Leave blank to use the social description.', 'kpf-core')}
						value={value.twitter_description || ''}
						onChange={(next) => update({ twitter_description: next || null })}
						__nextHasNoMarginBottom
					/>
				</div>
				<p className="description">
					{__('Optional Twitter image. Leave empty to use the social image.', 'kpf-core')}
				</p>
				<SocialImageField
					imageId={value.twitter_image_id || 0}
					onChange={(twitter_image_id) => update({ twitter_image_id: twitter_image_id || null })}
					label={{
						chooseImage: __('Choose Twitter image', 'kpf-core'),
						replaceImage: __('Replace Twitter image', 'kpf-core'),
					}}
				/>
			</PanelBody>

			<PanelBody title={__('Advanced', 'kpf-core')} initialOpen={false}>
				<div className="kpf-seo-editor__grid">
					<TextControl
						label={__('Page information type', 'kpf-core')}
						help={__(
							'Usually leave this blank. A developer may set values such as WebPage, Article, or BlogPosting.',
							'kpf-core'
						)}
						value={value.schema_type || ''}
						onChange={(next) => update({ schema_type: next || null })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<TextareaControl
						label={__('Custom structured data code (expert only)', 'kpf-core')}
						help={__(
							'Leave blank unless a developer gives you validated JSON-LD code.',
							'kpf-core'
						)}
						value={value.custom_json_ld || ''}
						onChange={(next) => update({ custom_json_ld: next || null })}
						__nextHasNoMarginBottom
					/>
				</div>
			</PanelBody>
		</>
	);

	return (
		<div
			className={`kpf-seo-editor kpf-seo-editor--main ${compact ? 'kpf-seo-editor--compact' : ''} ${
				collapseDetailsByDefault ? 'kpf-seo-editor--collapsible' : ''
			} ${className}`.trim()}
		>
			{compact ? (
				<div className="kpf-seo-editor__intro-row">
					<p className="kpf-seo-editor__intro">
						{__(
							'Leave fields blank to use the site defaults for this blog.',
							'kpf-core'
						)}
					</p>
					<SeoPlaceholderGuide tags={tags} />
				</div>
			) : (
				<header className="kpf-seo-editor__header">
					<div className="kpf-seo-editor__header-top">
						<h2 className="kpf-seo-editor__heading">{__('Search & sharing', 'kpf-core')}</h2>
						<SeoPlaceholderGuide tags={tags} />
					</div>
					<p className="kpf-seo-editor__intro">
						{__(
							'These settings change how this page may look in search results and social shares. Leave fields blank to use the site defaults. Use Review Dynamic Tags to browse every valid token.',
							'kpf-core'
						)}
					</p>
				</header>
			)}

			<div className="kpf-seo-editor__previews">
				<div className="kpf-seo-editor__preview">
					<p className="kpf-seo-editor__preview-label">{__('Search preview', 'kpf-core')}</p>
					<p className="kpf-seo-editor__preview-title">{preview.title || '—'}</p>
					<p className="kpf-seo-editor__preview-description">
						{preview.description ||
							__('Add a description to see how this may appear in search results.', 'kpf-core')}
					</p>
				</div>
				{!compact ? <OpenGraphPreview preview={preview} /> : null}
			</div>

			{collapseDetailsByDefault ? (
				<PanelBody
					className="kpf-seo-editor__details"
					title={__('Edit search & sharing', 'kpf-core')}
					initialOpen={false}
				>
					{details}
				</PanelBody>
			) : (
				details
			)}
		</div>
	);
}
