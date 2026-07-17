import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useEffect, useMemo, useState } from '@wordpress/element';
import {
	Button,
	PanelBody,
	SearchControl,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';

apiFetch.use(apiFetch.createNonceMiddleware(window.kpfSeoEditor?.nonce || ''));

const META_KEY = window.kpfSeoEditor?.metaKey || '_kpf_seo';

function emptyMeta() {
	return {
		title_template: null,
		description_template: null,
		canonical: null,
		robots_index: null,
		robots_follow: null,
		og_title: null,
		og_description: null,
		twitter_title: null,
		twitter_description: null,
		schema_type: null,
		custom_json_ld: null,
		show_in_sitemap: null,
		custom_meta: [],
	};
}

function SeoEditorPanel() {
	const postType = useSelect((select) => select('core/editor').getCurrentPostType(), []);
	const postId = useSelect((select) => select('core/editor').getCurrentPostId(), []);
	const [meta, setMeta] = useEntityProp('postType', postType, 'meta');
	const [tags, setTags] = useState([]);
	const [query, setQuery] = useState('');
	const [preview, setPreview] = useState({ title: '', description: '' });

	const seo = useMemo(() => ({ ...emptyMeta(), ...(meta?.[META_KEY] || {}) }), [meta]);

	useEffect(() => {
		apiFetch({ path: '/kpf-seo/v1/tags' })
			.then((response) => setTags(response.tags || []))
			.catch(() => setTags([]));
	}, []);

	useEffect(() => {
		if (!postId) return;
		const handle = setTimeout(() => {
			apiFetch({ path: `/kpf-seo/v1/resolve/${postId}` })
				.then((response) =>
					setPreview({
						title: response.title || '',
						description: response.description || '',
					})
				)
				.catch(() => setPreview({ title: '', description: '' }));
		}, 400);
		return () => clearTimeout(handle);
	}, [postId, seo.title_template, seo.description_template]);

	function updateSeo(partial) {
		setMeta({
			...meta,
			[META_KEY]: {
				...seo,
				...partial,
			},
		});
	}

	const filteredTags = tags.filter((tag) =>
		[tag.token, tag.label, tag.description, tag.invocation]
			.join(' ')
			.toLowerCase()
			.includes(query.toLowerCase())
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
		<PluginDocumentSettingPanel
			name="kpf-seo"
			title={__('Search & sharing', 'kpf-core')}
			className="kpf-seo-editor-panel"
		>
			<p>
				{__(
					'These settings change how this page may look in search results and social shares. Leave fields blank to use the site defaults.',
					'kpf-core'
				)}
			</p>
			<p>
				<strong>{__('Current search title', 'kpf-core')}:</strong> {preview.title || '—'}
			</p>
			<p>
				<strong>{__('Current search description', 'kpf-core')}:</strong>{' '}
				{preview.description || '—'}
			</p>

			<TextControl
				label={__('Custom search-title pattern', 'kpf-core')}
				help={__(
					'Optional. Leave blank to use the default for this kind of page. You can use placeholders from the section below.',
					'kpf-core'
				)}
				value={seo.title_template || ''}
				onChange={(value) => updateSeo({ title_template: value || null })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			<TextareaControl
				label={__('Custom search-description pattern', 'kpf-core')}
				help={__(
					'Optional. This is the short summary search engines may show below the page title.',
					'kpf-core'
				)}
				value={seo.description_template || ''}
				onChange={(value) => updateSeo({ description_template: value || null })}
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={__('Preferred page address (advanced)', 'kpf-core')}
				help={__(
					'Usually leave this blank. Use it only when the same content exists at more than one address and search engines should prefer a specific one.',
					'kpf-core'
				)}
				value={seo.canonical || ''}
				onChange={(value) => updateSeo({ canonical: value || null })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			<ToggleControl
				label={__('Hide this page from search results', 'kpf-core')}
				help={__(
					'Use this for private, temporary, or duplicate pages. It asks search engines not to list this page.',
					'kpf-core'
				)}
				checked={seo.robots_index === false}
				onChange={(checked) => updateSeo({ robots_index: checked ? false : null })}
			/>
			<ToggleControl
				label={__('Ask search engines not to follow links on this page', 'kpf-core')}
				help={__('Advanced: usually leave this off.', 'kpf-core')}
				checked={seo.robots_follow === false}
				onChange={(checked) => updateSeo({ robots_follow: checked ? false : null })}
			/>
			<TextControl
				label={__('Custom social-sharing title', 'kpf-core')}
				help={__(
					'Optional. Used when this page is shared on Facebook, LinkedIn, and similar services.',
					'kpf-core'
				)}
				value={seo.og_title || ''}
				onChange={(value) => updateSeo({ og_title: value || null })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			<TextareaControl
				label={__('Custom social-sharing description', 'kpf-core')}
				help={__('Optional. Leave blank to use the search description.', 'kpf-core')}
				value={seo.og_description || ''}
				onChange={(value) => updateSeo({ og_description: value || null })}
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={__('Page information type (advanced)', 'kpf-core')}
				help={__(
					'Usually leave this blank. A developer may set values such as WebPage, Article, or BlogPosting.',
					'kpf-core'
				)}
				value={seo.schema_type || ''}
				onChange={(value) => updateSeo({ schema_type: value || null })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			<TextareaControl
				label={__('Custom structured data code (expert only)', 'kpf-core')}
				help={__(
					'Leave blank unless a developer gives you validated JSON-LD code.',
					'kpf-core'
				)}
				value={seo.custom_json_ld || ''}
				onChange={(value) => updateSeo({ custom_json_ld: value || null })}
				__nextHasNoMarginBottom
			/>

			<PanelBody title={__('Automatic placeholders', 'kpf-core')} initialOpen={false}>
				<p>
					{__(
						'Copy a placeholder and paste it into a title or description pattern. It will be replaced with this page’s information.',
						'kpf-core'
					)}
				</p>
				<SearchControl value={query} onChange={setQuery} __nextHasNoMarginBottom />
				<div style={{ maxHeight: 220, overflow: 'auto', marginTop: 8 }}>
					{filteredTags.map((tag) => (
						<div
							key={tag.token}
							style={{
								display: 'flex',
								justifyContent: 'space-between',
								gap: 8,
								marginBottom: 8,
							}}
						>
							<div>
								<code>{tag.invocation}</code>
								<div>{tag.label}</div>
							</div>
							<Button size="compact" variant="secondary" onClick={() => copyTag(tag.invocation)}>
								{__('Copy', 'kpf-core')}
							</Button>
						</div>
					))}
				</div>
			</PanelBody>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin('kpf-seo-editor', {
	render: SeoEditorPanel,
	icon: 'chart-area',
});
