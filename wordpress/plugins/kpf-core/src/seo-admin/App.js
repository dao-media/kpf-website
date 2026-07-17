import { useEffect, useMemo, useState } from '@wordpress/element';
import {
	Button,
	CheckboxControl,
	Notice,
	SelectControl,
	Spinner,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { seoApi } from './api';
import { FieldGroup, Section, Stat } from './components/Section';
import TagLibrary from './components/TagLibrary';
import TemplateField from './components/TemplateField';

const emptyRedirect = {
	source_path: '',
	target_url: '',
	status_code: 301,
	is_regex: false,
	is_enabled: true,
	notes: '',
};

const ROBOTS_EXTRA_EXAMPLE =
	window.kpfSeoAdmin?.robotsExtraExample ||
	`User-agent: BadBot
Disallow: /

User-agent: *
Disallow: /private/
Disallow: /drafts/`;

const AI_USER_AGENTS = window.kpfSeoAdmin?.aiUserAgents || [
	'GPTBot',
	'ChatGPT-User',
	'OAI-SearchBot',
	'Google-Extended',
	'ClaudeBot',
	'anthropic-ai',
	'Applebot-Extended',
	'PerplexityBot',
	'Bytespider',
	'CCBot',
	'Amazonbot',
];

const SECTION_COPY = {
	dashboard: {
		title: __('Dashboard', 'kpf-core'),
		description: __(
			'A quick look at the public site settings that affect search results and sharing.',
			'kpf-core'
		),
	},
	global: {
		title: __('Site defaults', 'kpf-core'),
		description: __(
			'These choices apply everywhere unless a content type or individual page overrides them.',
			'kpf-core'
		),
	},
	types: {
		title: __('Content types', 'kpf-core'),
		description: __(
			'Set different search defaults for each kind of content. Blank fields keep using the site defaults.',
			'kpf-core'
		),
	},
	social: {
		title: __('Social sharing', 'kpf-core'),
		description: __(
			'Control the preview shown when someone shares a page. Individual pages can still use their own title, description, and image.',
			'kpf-core'
		),
	},
	schema: {
		title: __('Structured data', 'kpf-core'),
		description: __(
			'Behind-the-scenes information that helps search engines understand the organization and each page.',
			'kpf-core'
		),
	},
	sitemaps: {
		title: __('Sitemap & robots', 'kpf-core'),
		description: __(
			'Help search engines and AI crawlers find public pages, and optionally add expert robots.txt rules.',
			'kpf-core'
		),
	},
	redirects: {
		title: __('Redirects', 'kpf-core'),
		description: __(
			'Send visitors from an old web address to a new one after a page moves.',
			'kpf-core'
		),
	},
	tags: {
		title: __('Placeholders', 'kpf-core'),
		description: __(
			'Copy a placeholder, then paste it into a page-title or description pattern so wording updates automatically.',
			'kpf-core'
		),
	},
};

function buildRobotsPreview(settings) {
	if (!settings) {
		return '';
	}

	const lines = ['User-agent: *'];
	lines.push(settings.global?.robots_index ? 'Allow: /' : 'Disallow: /');

	const aiMode = settings.sitemaps?.ai_crawlers || 'allow';
	if (aiMode === 'allow' || aiMode === 'block') {
		lines.push('');
		lines.push('# AI agents and content scanners');
		AI_USER_AGENTS.forEach((agent) => {
			lines.push(`User-agent: ${agent}`);
			lines.push(aiMode === 'allow' ? 'Allow: /' : 'Disallow: /');
			lines.push('');
		});
	}

	const extra = (settings.sitemaps?.robots_extra || '').trim();
	if (extra) {
		lines.push('# Custom rules');
		lines.push(extra);
		lines.push('');
	}

	if (settings.sitemaps?.enabled) {
		const frontend = String(settings.global?.frontend_url || '').replace(/\/$/, '');
		lines.push(`Sitemap: ${frontend}/sitemap.xml`);
	}

	return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`;
}

function pageSlugForTab(tab) {
	return tab === 'dashboard' ? 'kpf-seo' : `kpf-seo-${tab}`;
}

function linkMatchesPage(href, page) {
	try {
		return new URL(href, window.location.origin).searchParams.get('page') === page;
	} catch (error) {
		const match = String(href).match(/[?&]page=([^&]+)/);
		return match ? decodeURIComponent(match[1]) === page : false;
	}
}

function syncAdminUrl(tab) {
	const url = new URL(window.location.href);
	const page = pageSlugForTab(tab);
	url.searchParams.set('page', page);
	window.history.replaceState({}, '', url);

	document.querySelectorAll('#adminmenu .wp-submenu li').forEach((item) => {
		const link = item.querySelector('a');
		if (!link) return;
		const isCurrent = linkMatchesPage(link.getAttribute('href') || '', page);
		item.classList.toggle('current', isCurrent);
		if (isCurrent) {
			link.setAttribute('aria-current', 'page');
		} else {
			link.removeAttribute('aria-current');
		}
	});
}

export default function App() {
	const [settings, setSettings] = useState(null);
	const [tags, setTags] = useState([]);
	const [redirects, setRedirects] = useState([]);
	const [conflicts, setConflicts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [dirty, setDirty] = useState(false);
	const [notice, setNotice] = useState(null);
	const [selectedType, setSelectedType] = useState('post');
	const [redirectForm, setRedirectForm] = useState(emptyRedirect);
	const [activeTab] = useState(window.kpfSeoAdmin?.initialTab || 'dashboard');

	const postTypes = window.kpfSeoAdmin?.postTypes || [];
	const sectionMeta = SECTION_COPY[activeTab] || SECTION_COPY.dashboard;

	useEffect(() => {
		syncAdminUrl(activeTab);
	}, [activeTab]);

	useEffect(() => {
		async function boot() {
			try {
				const [settingsRes, tagsRes, redirectsRes, conflictsRes] = await Promise.all([
					seoApi.getSettings(),
					seoApi.getTags(),
					seoApi.getRedirects(),
					seoApi.getConflicts(),
				]);
				setSettings(settingsRes);
				setTags(tagsRes.tags || []);
				setRedirects(redirectsRes.redirects || []);
				setConflicts(conflictsRes.conflicts || []);
				if (postTypes[0]?.name) {
					setSelectedType(postTypes[0].name);
				}
			} catch (error) {
				setNotice({
					status: 'error',
					message: error?.message || __('Failed to load SEO settings.', 'kpf-core'),
				});
			} finally {
				setLoading(false);
			}
		}
		boot();
	}, []);

	useEffect(() => {
		const onBeforeUnload = (event) => {
			if (!dirty) return;
			event.preventDefault();
			event.returnValue = '';
		};
		window.addEventListener('beforeunload', onBeforeUnload);
		return () => window.removeEventListener('beforeunload', onBeforeUnload);
	}, [dirty]);

	const typeOptions = useMemo(
		() =>
			postTypes.map((type) => ({
				label: type.label,
				value: type.name,
			})),
		[postTypes]
	);

	function updateSettings(next) {
		setSettings(next);
		setDirty(true);
	}

	function patchGlobal(key, value) {
		updateSettings({
			...settings,
			global: {
				...settings.global,
				[key]: value,
			},
		});
	}

	function patchType(key, value) {
		updateSettings({
			...settings,
			post_types: {
				...settings.post_types,
				[selectedType]: {
					...(settings.post_types[selectedType] || {}),
					[key]: value,
				},
			},
		});
	}

	function patchSection(section, key, value) {
		updateSettings({
			...settings,
			[section]: {
				...settings[section],
				[key]: value,
			},
		});
	}

	async function save() {
		setSaving(true);
		setNotice(null);
		try {
			const saved = await seoApi.saveSettings(settings);
			setSettings(saved);
			setDirty(false);
			setNotice({
				status: 'success',
				message: __('SEO settings saved.', 'kpf-core'),
			});
		} catch (error) {
			setNotice({
				status: 'error',
				message: error?.message || __('Unable to save settings.', 'kpf-core'),
			});
		} finally {
			setSaving(false);
		}
	}

	async function createRedirect(event) {
		event.preventDefault();
		try {
			const created = await seoApi.createRedirect(redirectForm);
			setRedirects((current) => [created, ...current]);
			setRedirectForm(emptyRedirect);
			setNotice({
				status: 'success',
				message: __('Redirect created.', 'kpf-core'),
			});
		} catch (error) {
			setNotice({
				status: 'error',
				message: error?.message || __('Unable to create redirect.', 'kpf-core'),
			});
		}
	}

	async function removeRedirect(id) {
		await seoApi.deleteRedirect(id);
		setRedirects((current) => current.filter((item) => item.id !== id));
	}

	if (loading || !settings) {
		return (
			<div className="kpf-seo kpf-seo-loading">
				<Spinner />
			</div>
		);
	}

	const selected = settings.post_types?.[selectedType] || {};
	const frontendUrl = String(settings.global.frontend_url || '').replace(/\/$/, '');
	const showSave = activeTab !== 'tags' && activeTab !== 'redirects';

	return (
		<div className="kpf-seo">
			<header className="kpf-seo__header">
				<div className="kpf-seo__header-copy">
					<h1>{sectionMeta.title}</h1>
					<p>{sectionMeta.description}</p>
				</div>
				{showSave ? (
					<div className="kpf-seo__header-actions">
						{dirty ? (
							<span className="kpf-seo__dirty">{__('Unsaved', 'kpf-core')}</span>
						) : null}
						<Button
							variant="primary"
							isBusy={saving}
							disabled={!dirty || saving}
							onClick={save}
						>
							{__('Save changes', 'kpf-core')}
						</Button>
					</div>
				) : null}
			</header>

			{(notice || conflicts.length > 0) && (
				<div className="kpf-seo__notices">
					{notice ? (
						<Notice status={notice.status} onRemove={() => setNotice(null)}>
							{notice.message}
						</Notice>
					) : null}
					{conflicts.length > 0 ? (
						<Notice status="warning" isDismissible={false}>
							{__(
								'Another SEO plugin is active. Using two SEO tools can create duplicate or conflicting search information. Please disable:',
								'kpf-core'
							)}{' '}
							{conflicts.join(', ')}
						</Notice>
					) : null}
				</div>
			)}

			{activeTab === 'dashboard' && (
				<div className="kpf-seo__layout">
					<Section
						title={__('Getting started', 'kpf-core')}
						description={__(
							'Start with Site defaults. Use placeholders such as %%title%% when wording should change automatically for each page.',
							'kpf-core'
						)}
					>
						<div className="kpf-seo-stats">
							<Stat label={__('Frontend URL', 'kpf-core')} value={frontendUrl || '—'} />
							<Stat
								label={__('Sitemap', 'kpf-core')}
								value={
									settings.sitemaps.enabled
										? `${frontendUrl}/sitemap.xml`
										: __('Disabled', 'kpf-core')
								}
							/>
							<Stat
								label={__('Redirect rules', 'kpf-core')}
								value={String(redirects.length)}
							/>
							<Stat
								label={__('Placeholders', 'kpf-core')}
								value={String(tags.length)}
							/>
						</div>
					</Section>
				</div>
			)}

			{activeTab === 'global' && (
				<div className="kpf-seo__layout kpf-seo__layout--split">
					<Section title={__('Search appearance', 'kpf-core')}>
						<TextControl
							label={__('Site name shown to search engines', 'kpf-core')}
							help={__(
								'Leave blank to use the site name already saved in WordPress.',
								'kpf-core'
							)}
							value={settings.global.site_title}
							onChange={(value) => patchGlobal('site_title', value)}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<TextareaControl
							label={__('Short description of the site', 'kpf-core')}
							help={__(
								'One or two sentences that explain the foundation. Leave blank to use the WordPress tagline.',
								'kpf-core'
							)}
							value={settings.global.site_description}
							onChange={(value) => patchGlobal('site_description', value)}
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={__('Divider used in page titles', 'kpf-core')}
							help={__('Separates a page name from the site name. Default is |.', 'kpf-core')}
							value={settings.global.separator}
							onChange={(value) => patchGlobal('separator', value)}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={__('Public website address', 'kpf-core')}
							help={__(
								'The address visitors use for the finished website, not the WordPress admin address.',
								'kpf-core'
							)}
							value={settings.global.frontend_url}
							onChange={(value) => patchGlobal('frontend_url', value)}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<TemplateField
							label={__('Default page-title pattern', 'kpf-core')}
							help={__(
								'Builds the title shown in search results. Example: %%title%% %%sep%% %%sitename%%.',
								'kpf-core'
							)}
							value={settings.global.title_template}
							onChange={(value) => patchGlobal('title_template', value)}
						/>
						<TemplateField
							label={__('Default search-description pattern', 'kpf-core')}
							help={__(
								'Builds the short summary under a search result. %%excerpt%% uses the page excerpt.',
								'kpf-core'
							)}
							value={settings.global.description_template}
							onChange={(value) => patchGlobal('description_template', value)}
							multiline
						/>
						<FieldGroup title={__('Indexing', 'kpf-core')}>
							<ToggleControl
								label={__('Allow pages to appear in search results', 'kpf-core')}
								help={__('Keep this on for a public website.', 'kpf-core')}
								checked={!!settings.global.robots_index}
								onChange={(value) => patchGlobal('robots_index', value)}
							/>
							<ToggleControl
								label={__('Allow search engines to follow links', 'kpf-core')}
								help={__('Keep this on so related pages can be discovered.', 'kpf-core')}
								checked={!!settings.global.robots_follow}
								onChange={(value) => patchGlobal('robots_follow', value)}
							/>
							<ToggleControl
								label={__('Prevent cached copies in search results', 'kpf-core')}
								help={__('Advanced: usually leave this off.', 'kpf-core')}
								checked={!!settings.global.robots_noarchive}
								onChange={(value) => patchGlobal('robots_noarchive', value)}
							/>
							<ToggleControl
								label={__('Hide text previews in search results', 'kpf-core')}
								help={__('Advanced: usually leave this off.', 'kpf-core')}
								checked={!!settings.global.robots_nosnippet}
								onChange={(value) => patchGlobal('robots_nosnippet', value)}
							/>
						</FieldGroup>
					</Section>
					<Section
						title={__('Placeholders', 'kpf-core')}
						description={__('Click Copy, then paste into a title or description pattern.', 'kpf-core')}
					>
						<TagLibrary tags={tags} compact />
					</Section>
				</div>
			)}

			{activeTab === 'types' && (
				<div className="kpf-seo__layout">
					<Section>
						<SelectControl
							label={__('Content type', 'kpf-core')}
							value={selectedType}
							options={typeOptions}
							onChange={setSelectedType}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<TemplateField
							label={__('Page-title pattern for this content type', 'kpf-core')}
							help={__('Leave blank to keep using the site default.', 'kpf-core')}
							value={selected.title_template || ''}
							onChange={(value) => patchType('title_template', value === '' ? null : value)}
						/>
						<TemplateField
							label={__('Search-description pattern for this content type', 'kpf-core')}
							help={__('Leave blank to keep using the site default.', 'kpf-core')}
							value={selected.description_template || ''}
							onChange={(value) =>
								patchType('description_template', value === '' ? null : value)
							}
							multiline
						/>
						<FieldGroup title={__('Advanced', 'kpf-core')}>
							<TextControl
								label={__('URL prefix', 'kpf-core')}
								help={__(
									'Optional word before these items in their web addresses. Leave blank unless you have a specific URL plan. Does not change Posts or Pages.',
									'kpf-core'
								)}
								value={selected.slug_prefix || ''}
								onChange={(value) => patchType('slug_prefix', value)}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<SelectControl
								label={__('What kind of page is this?', 'kpf-core')}
								help={__(
									'Gives search engines extra context. Use WebPage for general pages and Article for written stories.',
									'kpf-core'
								)}
								value={selected.schema_type || 'WebPage'}
								options={[
									{ label: 'WebPage', value: 'WebPage' },
									{ label: 'Article', value: 'Article' },
									{ label: 'BlogPosting', value: 'BlogPosting' },
									{ label: 'NewsArticle', value: 'NewsArticle' },
								]}
								onChange={(value) => patchType('schema_type', value)}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={__('List this content type in the sitemap', 'kpf-core')}
								help={__('Keep this on for public content.', 'kpf-core')}
								checked={selected.show_in_sitemap !== false}
								onChange={(value) => patchType('show_in_sitemap', value)}
							/>
						</FieldGroup>
					</Section>
				</div>
			)}

			{activeTab === 'social' && (
				<div className="kpf-seo__layout">
					<Section>
						<SelectControl
							label={__('Default X/Twitter preview size', 'kpf-core')}
							help={__(
								'Large image works best when most pages have a good photo.',
								'kpf-core'
							)}
							value={settings.global.twitter_card}
							options={[
								{ label: __('Summary', 'kpf-core'), value: 'summary' },
								{
									label: __('Large image', 'kpf-core'),
									value: 'summary_large_image',
								},
							]}
							onChange={(value) => patchGlobal('twitter_card', value)}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={__('Site’s X/Twitter username', 'kpf-core')}
							help={__('Optional. Include the @ symbol, for example @KPF.', 'kpf-core')}
							value={settings.global.twitter_site}
							onChange={(value) => patchGlobal('twitter_site', value)}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<FieldGroup title={__('Advanced', 'kpf-core')}>
							<TextControl
								label={__('Default sharing-image Media Library ID', 'kpf-core')}
								help={__(
									'Number from the image’s Media Library URL. Used when a page has no sharing image.',
									'kpf-core'
								)}
								value={String(settings.global.og_default_image_id || 0)}
								onChange={(value) =>
									patchGlobal('og_default_image_id', Number(value) || 0)
								}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={__('Facebook App ID', 'kpf-core')}
								help={__('Optional. Leave blank unless a Facebook app exists for the site.', 'kpf-core')}
								value={settings.social.facebook_app_id}
								onChange={(value) => patchSection('social', 'facebook_app_id', value)}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={__('Default social-sharing content type', 'kpf-core')}
								help={__('Use website for general pages and article for stories.', 'kpf-core')}
								value={settings.social.og_type_default}
								onChange={(value) => patchSection('social', 'og_type_default', value)}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						</FieldGroup>
					</Section>
				</div>
			)}

			{activeTab === 'schema' && (
				<div className="kpf-seo__layout">
					<Section>
						<TextControl
							label={__('Organization’s full name', 'kpf-core')}
							help={__('Leave blank to use the site name.', 'kpf-core')}
							value={settings.schema.organization_name}
							onChange={(value) => patchSection('schema', 'organization_name', value)}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={__('Organization’s website address', 'kpf-core')}
							help={__('Leave blank to use the public website address.', 'kpf-core')}
							value={settings.schema.organization_url}
							onChange={(value) => patchSection('schema', 'organization_url', value)}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={__('Logo Media Library ID', 'kpf-core')}
							help={__('Number from the logo’s Media Library URL. Use 0 if not ready.', 'kpf-core')}
							value={String(settings.schema.organization_logo || 0)}
							onChange={(value) =>
								patchSection('schema', 'organization_logo', Number(value) || 0)
							}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<FieldGroup title={__('Recommended data', 'kpf-core')}>
							<ToggleControl
								label={__('Tell search engines about the website', 'kpf-core')}
								checked={!!settings.schema.enable_website}
								onChange={(value) => patchSection('schema', 'enable_website', value)}
							/>
							<ToggleControl
								label={__('Tell search engines about each page', 'kpf-core')}
								checked={!!settings.schema.enable_webpage}
								onChange={(value) => patchSection('schema', 'enable_webpage', value)}
							/>
							<ToggleControl
								label={__('Mark posts and stories as articles', 'kpf-core')}
								checked={!!settings.schema.enable_article}
								onChange={(value) => patchSection('schema', 'enable_article', value)}
							/>
							<ToggleControl
								label={__('Describe each page’s place in the site', 'kpf-core')}
								help={__('Sometimes called breadcrumb data.', 'kpf-core')}
								checked={!!settings.schema.enable_breadcrumbs}
								onChange={(value) => patchSection('schema', 'enable_breadcrumbs', value)}
							/>
						</FieldGroup>
						<FieldGroup title={__('Expert', 'kpf-core')}>
							<TextareaControl
								label={__('Custom structured data code', 'kpf-core')}
								help={__(
									'Leave blank unless a developer gives you validated JSON-LD. Invalid code is ignored.',
									'kpf-core'
								)}
								value={settings.schema.custom_json_ld || ''}
								onChange={(value) => patchSection('schema', 'custom_json_ld', value)}
								__nextHasNoMarginBottom
							/>
						</FieldGroup>
					</Section>
				</div>
			)}

			{activeTab === 'sitemaps' && (
				<div className="kpf-seo__layout kpf-seo__layout--split">
					<div className="kpf-seo__layout">
						<Section title={__('Sitemap', 'kpf-core')}>
							<ToggleControl
								label={__('Create a sitemap for the public website', 'kpf-core')}
								help={__('Recommended. Available at /sitemap.xml.', 'kpf-core')}
								checked={!!settings.sitemaps.enabled}
								onChange={(value) => patchSection('sitemaps', 'enabled', value)}
							/>
							<ToggleControl
								label={__('Include important images in the sitemap', 'kpf-core')}
								checked={!!settings.sitemaps.include_images}
								onChange={(value) => patchSection('sitemaps', 'include_images', value)}
							/>
							<FieldGroup
								title={__('Leave out of the sitemap', 'kpf-core')}
								help={__(
									'Check only content that should not appear in search results.',
									'kpf-core'
								)}
							>
								{postTypes.map((type) => (
									<CheckboxControl
										key={type.name}
										label={type.label}
										checked={(settings.sitemaps.exclude_post_types || []).includes(
											type.name
										)}
										onChange={(checked) => {
											const current = new Set(
												settings.sitemaps.exclude_post_types || []
											);
											if (checked) {
												current.add(type.name);
											} else {
												current.delete(type.name);
											}
											patchSection(
												'sitemaps',
												'exclude_post_types',
												Array.from(current)
											);
										}}
									/>
								))}
							</FieldGroup>
						</Section>
						<Section title={__('AI agents & robots.txt', 'kpf-core')}>
							<SelectControl
								label={__('AI agents and scanners', 'kpf-core')}
								help={__(
									'Controls well-known AI crawlers such as GPTBot, ClaudeBot, and PerplexityBot.',
									'kpf-core'
								)}
								value={settings.sitemaps.ai_crawlers || 'allow'}
								options={[
									{
										label: __('Allow AI agents to crawl and scan', 'kpf-core'),
										value: 'allow',
									},
									{
										label: __('Block AI agents and training crawlers', 'kpf-core'),
										value: 'block',
									},
									{
										label: __('No special AI rules', 'kpf-core'),
										value: 'off',
									},
								]}
								onChange={(value) => patchSection('sitemaps', 'ai_crawlers', value)}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<TextareaControl
								label={__('Extra crawler instructions', 'kpf-core')}
								help={__(
									'Expert only. Added after the automatic rules.',
									'kpf-core'
								)}
								value={settings.sitemaps.robots_extra || ''}
								onChange={(value) => patchSection('sitemaps', 'robots_extra', value)}
								__nextHasNoMarginBottom
							/>
							<FieldGroup
								title={__('Example rules', 'kpf-core')}
								help={__('Paste rules like these into the field above.', 'kpf-core')}
							>
								<pre className="kpf-seo-code">{ROBOTS_EXTRA_EXAMPLE}</pre>
								<div className="kpf-seo-actions">
									<Button
										variant="secondary"
										onClick={() =>
											patchSection('sitemaps', 'robots_extra', ROBOTS_EXTRA_EXAMPLE)
										}
									>
										{__('Insert example', 'kpf-core')}
									</Button>
								</div>
							</FieldGroup>
						</Section>
					</div>
					<Section
						title={__('robots.txt preview', 'kpf-core')}
						description={__(
							'What crawlers will see at /robots.txt after you save.',
							'kpf-core'
						)}
					>
						<pre className="kpf-seo-code kpf-seo-code--dark">
							{buildRobotsPreview(settings)}
						</pre>
					</Section>
				</div>
			)}

			{activeTab === 'redirects' && (
				<div className="kpf-seo__layout kpf-seo__layout--split">
					<Section title={__('Add redirect', 'kpf-core')}>
						<form onSubmit={createRedirect} className="kpf-seo__layout">
							<TextControl
								label={__('Old page path', 'kpf-core')}
								help={__('Example: /old-event-page', 'kpf-core')}
								value={redirectForm.source_path}
								onChange={(value) =>
									setRedirectForm((current) => ({
										...current,
										source_path: value,
									}))
								}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={__('New destination address', 'kpf-core')}
								help={__('Full address, for example https://example.org/new-page.', 'kpf-core')}
								value={redirectForm.target_url}
								onChange={(value) =>
									setRedirectForm((current) => ({
										...current,
										target_url: value,
									}))
								}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<SelectControl
								label={__('Redirect type', 'kpf-core')}
								help={__(
									'Use Permanent (301) for a lasting move. Use Temporary only when the old page will return.',
									'kpf-core'
								)}
								value={String(redirectForm.status_code)}
								options={[
									{ label: __('Permanent (301)', 'kpf-core'), value: '301' },
									{ label: __('Temporary (302)', 'kpf-core'), value: '302' },
									{ label: __('Temporary, preserve request (307)', 'kpf-core'), value: '307' },
									{ label: __('Permanent, preserve request (308)', 'kpf-core'), value: '308' },
								]}
								onChange={(value) =>
									setRedirectForm((current) => ({
										...current,
										status_code: Number(value),
									}))
								}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={__('Use an advanced path pattern', 'kpf-core')}
								help={__('Expert only. Leave off for normal redirects.', 'kpf-core')}
								checked={!!redirectForm.is_regex}
								onChange={(value) =>
									setRedirectForm((current) => ({
										...current,
										is_regex: value,
									}))
								}
							/>
							<TextareaControl
								label={__('Notes', 'kpf-core')}
								help={__('Optional internal reminder. Visitors never see this.', 'kpf-core')}
								value={redirectForm.notes}
								onChange={(value) =>
									setRedirectForm((current) => ({
										...current,
										notes: value,
									}))
								}
								__nextHasNoMarginBottom
							/>
							<div className="kpf-seo-actions">
								<Button variant="primary" type="submit">
									{__('Add redirect', 'kpf-core')}
								</Button>
							</div>
						</form>
					</Section>
					<Section title={__('Existing redirects', 'kpf-core')}>
						{redirects.length === 0 ? (
							<p className="kpf-tag-library__empty">
								{__('No redirects yet.', 'kpf-core')}
							</p>
						) : (
							<div className="kpf-seo-table-wrap">
								<table className="widefat striped">
									<thead>
										<tr>
											<th>{__('Source', 'kpf-core')}</th>
											<th>{__('Target', 'kpf-core')}</th>
											<th>{__('Code', 'kpf-core')}</th>
											<th>{__('Hits', 'kpf-core')}</th>
											<th />
										</tr>
									</thead>
									<tbody>
										{redirects.map((redirect) => (
											<tr key={redirect.id}>
												<td>
													<code>{redirect.source_path}</code>
													{redirect.is_regex ? ' (regex)' : ''}
												</td>
												<td>{redirect.target_url}</td>
												<td>{redirect.status_code}</td>
												<td>{redirect.hit_count}</td>
												<td>
													<Button
														variant="link"
														isDestructive
														onClick={() => removeRedirect(redirect.id)}
													>
														{__('Delete', 'kpf-core')}
													</Button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</Section>
				</div>
			)}

			{activeTab === 'tags' && (
				<div className="kpf-seo__layout">
					<Section>
						<TagLibrary tags={tags} />
					</Section>
				</div>
			)}
		</div>
	);
}
