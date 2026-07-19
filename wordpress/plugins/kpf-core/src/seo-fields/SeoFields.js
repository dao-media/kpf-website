import {
	Button,
	PanelBody,
	SearchControl,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';
import './style.css';

export function emptySeoMeta() {
	return {
		title_template: null,
		description_template: null,
		canonical: null,
		robots_index: null,
		robots_follow: null,
		og_title: null,
		og_description: null,
		og_image_id: null,
		twitter_title: null,
		twitter_description: null,
		twitter_image_id: null,
		schema_type: null,
		custom_json_ld: null,
		show_in_sitemap: null,
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

function SocialImageField({ imageId, onChange }) {
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
					{imageId
						? __('Replace social image', 'kpf-core')
						: __('Choose social image', 'kpf-core')}
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

/**
 * Controlled SEO fields UI shared by the page editor and blog canvas SEO panel.
 */
export function SeoFields({
	seo,
	preview = { title: '', description: '' },
	tags = [],
	tagQuery = '',
	onTagQueryChange,
	onChange,
	className = '',
}) {
	const value = { ...emptySeoMeta(), ...(seo || {}) };

	function update(partial) {
		onChange({ ...value, ...partial });
	}

	const filteredTags = (tags || []).filter((tag) =>
		[tag.token, tag.label, tag.description, tag.invocation]
			.join(' ')
			.toLowerCase()
			.includes((tagQuery || '').toLowerCase())
	);

	async function copyTag(invocation) {
		try {
			await navigator.clipboard.writeText(invocation);
		} catch (error) {
			const input = document.createElement('input');
			input.value = invocation;
			document.body.appendChild(input);
			input.select();
			document.execCommand('copy');
			document.body.removeChild(input);
		}
	}

	return (
		<div className={`kpf-seo-editor kpf-seo-editor--main ${className}`.trim()}>
			<header className="kpf-seo-editor__header">
				<h2 className="kpf-seo-editor__heading">{__('Search & sharing', 'kpf-core')}</h2>
				<p className="kpf-seo-editor__intro">
					{__(
						'These settings change how this page may look in search results and social shares. Leave fields blank to use the site defaults.',
						'kpf-core'
					)}
				</p>
			</header>

			<div className="kpf-seo-editor__preview">
				<p className="kpf-seo-editor__preview-label">{__('Search preview', 'kpf-core')}</p>
				<p className="kpf-seo-editor__preview-title">{preview.title || '—'}</p>
				<p className="kpf-seo-editor__preview-description">
					{preview.description ||
						__('Add a description to see how this may appear in search results.', 'kpf-core')}
				</p>
			</div>

			<div className="kpf-seo-editor__grid">
				<TextControl
					label={__('Search title', 'kpf-core')}
					help={__(
						'Optional. Leave blank to use the default for this kind of page. You can use placeholders from the section below.',
						'kpf-core'
					)}
					value={value.title_template || ''}
					onChange={(next) => update({ title_template: next || null })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<TextareaControl
					label={__('Search description', 'kpf-core')}
					help={__(
						'Optional. This is the short summary search engines may show below the page title.',
						'kpf-core'
					)}
					value={value.description_template || ''}
					onChange={(next) => update({ description_template: next || null })}
					rows={4}
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={__('Preferred page address (advanced)', 'kpf-core')}
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
					label={__('Hide from the sitemap', 'kpf-core')}
					help={__(
						'Keep this off unless you specifically do not want this page listed in the XML sitemap.',
						'kpf-core'
					)}
					checked={value.show_in_sitemap === false}
					onChange={(checked) => update({ show_in_sitemap: checked ? false : null })}
				/>
			</div>

			<PanelBody title={__('Social sharing', 'kpf-core')} initialOpen>
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

			<PanelBody title={__('Automatic placeholders', 'kpf-core')} initialOpen={false}>
				<p>
					{__(
						'Copy a placeholder and paste it into a title or description pattern. It will be replaced with this page’s information.',
						'kpf-core'
					)}
				</p>
				{typeof onTagQueryChange === 'function' ? (
					<SearchControl
						value={tagQuery}
						onChange={onTagQueryChange}
						__nextHasNoMarginBottom
					/>
				) : null}
				<div className="kpf-seo-editor__tags">
					{filteredTags.map((tag) => (
						<div key={tag.token} className="kpf-seo-editor__tag">
							<div>
								<code>{tag.invocation}</code>
								<div>{tag.label}</div>
							</div>
							<Button
								size="compact"
								variant="secondary"
								onClick={() => copyTag(tag.invocation)}
							>
								{__('Copy', 'kpf-core')}
							</Button>
						</div>
					))}
				</div>
			</PanelBody>
		</div>
	);
}
