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
import { performanceApi } from './api';
import { FieldGroup, Section, Stat } from './components/Section';

const PRESET_META = window.kpfPerformanceAdmin?.presets || {
	off: {
		label: __('Off', 'kpf-core'),
		description: __('No caching.', 'kpf-core'),
	},
	light: {
		label: __('Light', 'kpf-core'),
		description: __('Safe browser caching.', 'kpf-core'),
	},
	balanced: {
		label: __('Balanced', 'kpf-core'),
		description: __('Recommended defaults.', 'kpf-core'),
	},
	aggressive: {
		label: __('Aggressive', 'kpf-core'),
		description: __('Maximum caching.', 'kpf-core'),
	},
};

const TTL_OPTIONS = (window.kpfPerformanceAdmin?.ttlOptions || []).map((option) => ({
	label: option.label,
	value: String(option.value),
}));

const DNS_PREFETCH_CATALOG = window.kpfPerformanceAdmin?.dnsPrefetch || [];
const DNS_PREFETCH_GROUPS = window.kpfPerformanceAdmin?.dnsPrefetchGroups || {};

const SECTION_COPY = {
	overview: {
		title: __('Performance', 'kpf-core'),
		description: __(
			'Choose a caching profile, then fine-tune media, code, pages, and CDN behavior.',
			'kpf-core'
		),
	},
	pages: {
		title: __('Pages & API', 'kpf-core'),
		description: __(
			'Control how long HTML, GraphQL, and REST responses stay cached.',
			'kpf-core'
		),
	},
	media: {
		title: __('Media', 'kpf-core'),
		description: __(
			'Image delivery, lazy loading, modern formats, and long-lived browser caching for media files.',
			'kpf-core'
		),
	},
	code: {
		title: __('Code', 'kpf-core'),
		description: __(
			'CSS and JavaScript optimization — minify, defer, combine, and browser cache for assets.',
			'kpf-core'
		),
	},
	browser: {
		title: __('Browser cache', 'kpf-core'),
		description: __(
			'HTTP Cache-Control headers for HTML, static files, and API responses.',
			'kpf-core'
		),
	},
	cdn: {
		title: __('CDN / edge', 'kpf-core'),
		description: __(
			'Edge caching and purge settings for Cloudflare, Fastly, Vercel, or a custom purge endpoint.',
			'kpf-core'
		),
	},
	advanced: {
		title: __('Advanced', 'kpf-core'),
		description: __(
			'Exclusions, WordPress housekeeping, debug headers, and manual cache purge.',
			'kpf-core'
		),
	},
};

function pageSlugForTab(tab) {
	return tab === 'overview' ? 'kpf-performance' : `kpf-performance-${tab}`;
}

function linkMatchesPage(href, page) {
	try {
		return new URL(href, window.location.origin).searchParams.get('page') === page;
	} catch (error) {
		return false;
	}
}

function syncSubmenu(tab) {
	const page = pageSlugForTab(tab);
	const url = new URL(window.location.href);
	if (url.searchParams.get('page') !== page) {
		url.searchParams.set('page', page);
		window.history.replaceState({}, '', url.toString());
	}

	document.querySelectorAll('#toplevel_page_kpf-performance .wp-submenu a').forEach((link) => {
		const item = link.closest('li');
		if (!item) {
			return;
		}
		const active = linkMatchesPage(link.getAttribute('href') || '', page);
		item.classList.toggle('current', active);
		link.classList.toggle('current', active);
		if (active) {
			link.setAttribute('aria-current', 'page');
		} else {
			link.removeAttribute('aria-current');
		}
	});
}

function formatTtl(seconds) {
	const value = Number(seconds) || 0;
	if (value <= 0) {
		return __('Off', 'kpf-core');
	}
	if (value < 60) {
		return `${value}s`;
	}
	if (value < 3600) {
		return `${Math.round(value / 60)}m`;
	}
	if (value < 86400) {
		return `${Math.round(value / 3600)}h`;
	}
	if (value < 604800) {
		return `${Math.round(value / 86400)}d`;
	}
	if (value < 31536000) {
		return `${Math.round(value / 604800)}w`;
	}
	return `${Math.round(value / 31536000)}y`;
}

function TtlSelect({ label, help, value, onChange }) {
	const options =
		TTL_OPTIONS.length > 0
			? TTL_OPTIONS
			: [
					{ label: __('No cache (0)', 'kpf-core'), value: '0' },
					{ label: __('1 minute', 'kpf-core'), value: '60' },
					{ label: __('1 hour', 'kpf-core'), value: '3600' },
					{ label: __('1 day', 'kpf-core'), value: '86400' },
					{ label: __('7 days', 'kpf-core'), value: '604800' },
					{ label: __('30 days', 'kpf-core'), value: '2592000' },
					{ label: __('1 year', 'kpf-core'), value: '31536000' },
				];

	const stringValue = String(value ?? 0);
	const hasOption = options.some((option) => option.value === stringValue);
	const selectOptions = hasOption
		? options
		: [...options, { label: `${__('Custom', 'kpf-core')}: ${stringValue}s`, value: stringValue }];

	return (
		<SelectControl
			label={label}
			help={help}
			value={stringValue}
			options={selectOptions}
			onChange={(next) => onChange(Number(next))}
			__next40pxDefaultSize
			__nextHasNoMarginBottom
		/>
	);
}

function DnsPrefetchPicker({ enabled, selected, onToggleHost, onSelectGroup, onClearGroup }) {
	const selectedSet = useMemo(() => new Set(selected || []), [selected]);

	const grouped = useMemo(() => {
		const map = {};
		DNS_PREFETCH_CATALOG.forEach((item) => {
			if (!map[item.group]) {
				map[item.group] = [];
			}
			map[item.group].push(item);
		});
		return map;
	}, []);

	if (!enabled) {
		return (
			<p className="kpf-perf-note">
				{__('Turn on DNS prefetch above to choose which third-party hosts to resolve early.', 'kpf-core')}
			</p>
		);
	}

	return (
		<div className="kpf-perf-dns">
			{Object.entries(DNS_PREFETCH_GROUPS).map(([groupKey, groupLabel]) => {
				const items = grouped[groupKey] || [];
				if (items.length === 0) {
					return null;
				}
				const hosts = items.map((item) => item.host);
				const selectedCount = hosts.filter((host) => selectedSet.has(host)).length;

				return (
					<div key={groupKey} className="kpf-perf-dns__group">
						<div className="kpf-perf-dns__group-header">
							<h4>{groupLabel}</h4>
							<div className="kpf-perf-dns__group-actions">
								<span className="kpf-perf-dns__count">
									{selectedCount}/{items.length}
								</span>
								<Button
									variant="link"
									onClick={() => onSelectGroup(hosts)}
									__next40pxDefaultSize
								>
									{__('All', 'kpf-core')}
								</Button>
								<Button
									variant="link"
									onClick={() => onClearGroup(hosts)}
									__next40pxDefaultSize
								>
									{__('None', 'kpf-core')}
								</Button>
							</div>
						</div>
						<div className="kpf-perf-dns__list">
							{items.map((item) => (
								<CheckboxControl
									key={item.id}
									label={
										<span className="kpf-perf-dns__label">
											<strong>{item.label}</strong>
											<code>{item.host}</code>
											<span>{item.description}</span>
										</span>
									}
									checked={selectedSet.has(item.host)}
									onChange={() => onToggleHost(item.host)}
									__nextHasNoMarginBottom
								/>
							))}
						</div>
					</div>
				);
			})}
		</div>
	);
}

export default function App() {
	const [settings, setSettings] = useState(null);
	const [saved, setSaved] = useState(null);
	const [status, setStatus] = useState(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [applying, setApplying] = useState(false);
	const [purging, setPurging] = useState(false);
	const [notice, setNotice] = useState(null);
	const [activeTab, setActiveTab] = useState(
		window.kpfPerformanceAdmin?.initialTab || 'overview'
	);

	const dirty = useMemo(() => {
		if (!settings || !saved) {
			return false;
		}
		return JSON.stringify(settings) !== JSON.stringify(saved);
	}, [settings, saved]);

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				const [nextSettings, nextStatus] = await Promise.all([
					performanceApi.getSettings(),
					performanceApi.getStatus(),
				]);
				if (cancelled) {
					return;
				}
				setSettings(nextSettings);
				setSaved(nextSettings);
				setStatus(nextStatus);
			} catch (error) {
				if (!cancelled) {
					setNotice({
						status: 'error',
						message: error?.message || __('Could not load performance settings.', 'kpf-core'),
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

	useEffect(() => {
		syncSubmenu(activeTab);
	}, [activeTab]);

	function patch(section, key, value) {
		setSettings((current) => ({
			...current,
			preset: 'custom',
			[section]: {
				...current[section],
				[key]: value,
			},
		}));
	}

	function toggleDnsHost(host) {
		const current = settings.code?.dns_prefetch_hosts || [];
		const next = current.includes(host)
			? current.filter((item) => item !== host)
			: [...current, host];
		patch('code', 'dns_prefetch_hosts', next);
	}

	function selectDnsGroup(hosts) {
		const current = new Set(settings.code?.dns_prefetch_hosts || []);
		hosts.forEach((host) => current.add(host));
		patch('code', 'dns_prefetch_hosts', [...current]);
	}

	function clearDnsGroup(hosts) {
		const remove = new Set(hosts);
		const next = (settings.code?.dns_prefetch_hosts || []).filter((host) => !remove.has(host));
		patch('code', 'dns_prefetch_hosts', next);
	}

	async function save() {
		setSaving(true);
		setNotice(null);
		try {
			const next = await performanceApi.saveSettings(settings);
			setSettings(next);
			setSaved(next);
			const nextStatus = await performanceApi.getStatus();
			setStatus(nextStatus);
			setNotice({
				status: 'success',
				message: __('Performance settings saved.', 'kpf-core'),
			});
		} catch (error) {
			setNotice({
				status: 'error',
				message: error?.message || __('Could not save settings.', 'kpf-core'),
			});
		} finally {
			setSaving(false);
		}
	}

	async function applyPreset(preset) {
		setApplying(true);
		setNotice(null);
		try {
			const next = await performanceApi.applyPreset(preset);
			setSettings(next);
			setSaved(next);
			const nextStatus = await performanceApi.getStatus();
			setStatus(nextStatus);
			setNotice({
				status: 'success',
				message: __('Caching preset applied and saved.', 'kpf-core'),
			});
		} catch (error) {
			setNotice({
				status: 'error',
				message: error?.message || __('Could not apply preset.', 'kpf-core'),
			});
		} finally {
			setApplying(false);
		}
	}

	async function purgeCache() {
		setPurging(true);
		setNotice(null);
		try {
			const result = await performanceApi.purge('all');
			const nextStatus = await performanceApi.getStatus();
			setStatus(nextStatus);
			setNotice({
				status: 'success',
				message: result?.message || __('Cache purged.', 'kpf-core'),
			});
		} catch (error) {
			setNotice({
				status: 'error',
				message: error?.message || __('Could not purge cache.', 'kpf-core'),
			});
		} finally {
			setPurging(false);
		}
	}

	const copy = SECTION_COPY[activeTab] || SECTION_COPY.overview;

	if (loading || !settings) {
		return (
			<div className="kpf-perf">
				<div className="kpf-perf-loading">
					<Spinner />
				</div>
			</div>
		);
	}

	return (
		<div className="kpf-perf">
			<header className="kpf-perf__header">
				<div className="kpf-perf__header-copy">
					<h1>{copy.title}</h1>
					<p>{copy.description}</p>
				</div>
				<div className="kpf-perf__header-actions">
					{dirty ? <span className="kpf-perf__dirty">{__('Unsaved', 'kpf-core')}</span> : null}
					<Button variant="secondary" onClick={purgeCache} isBusy={purging} disabled={purging}>
						{__('Purge cache', 'kpf-core')}
					</Button>
					<Button variant="primary" onClick={save} isBusy={saving} disabled={saving || !dirty}>
						{__('Save changes', 'kpf-core')}
					</Button>
				</div>
			</header>

			{notice ? (
				<div className="kpf-perf__notices">
					<Notice status={notice.status} isDismissible onRemove={() => setNotice(null)}>
						{notice.message}
					</Notice>
				</div>
			) : null}

			{activeTab === 'overview' && (
				<div className="kpf-perf__layout">
					<Section
						title={__('Caching profile', 'kpf-core')}
						description={__(
							'Start with a profile, then open Media, Code, Pages, and the other menus for full control. Changing any individual setting switches you to Custom.',
							'kpf-core'
						)}
					>
						<div className="kpf-perf-presets">
							{Object.entries(PRESET_META).map(([key, meta]) => (
								<button
									key={key}
									type="button"
									className={`kpf-perf-preset${settings.preset === key ? ' is-active' : ''}`}
									disabled={applying}
									onClick={() => applyPreset(key)}
								>
									<p className="kpf-perf-preset__label">{meta.label}</p>
									<p className="kpf-perf-preset__desc">{meta.description}</p>
								</button>
							))}
							<div
								className={`kpf-perf-preset is-custom${settings.preset === 'custom' ? ' is-active' : ''}`}
								aria-current={settings.preset === 'custom' ? 'true' : undefined}
							>
								<p className="kpf-perf-preset__label">{__('Custom', 'kpf-core')}</p>
								<p className="kpf-perf-preset__desc">
									{__(
										'Granular mix of settings. Applied automatically when you edit any control.',
										'kpf-core'
									)}
								</p>
							</div>
						</div>
					</Section>

					<Section title={__('Current status', 'kpf-core')}>
						<div className="kpf-perf-stats">
							<Stat
								label={__('Profile', 'kpf-core')}
								value={
									settings.preset === 'custom'
										? __('Custom', 'kpf-core')
										: PRESET_META[settings.preset]?.label || settings.preset
								}
							/>
							<Stat
								label={__('Pages', 'kpf-core')}
								value={
									settings.pages?.enabled
										? formatTtl(settings.pages.ttl)
										: __('Off', 'kpf-core')
								}
							/>
							<Stat
								label={__('Media', 'kpf-core')}
								value={
									settings.media?.enabled
										? formatTtl(settings.media.browser_ttl)
										: __('Off', 'kpf-core')
								}
							/>
							<Stat
								label={__('Code', 'kpf-core')}
								value={
									settings.code?.enabled
										? formatTtl(settings.code.browser_ttl)
										: __('Off', 'kpf-core')
								}
							/>
							<Stat
								label={__('Object cache', 'kpf-core')}
								value={
									status?.object_cache
										? __('Active', 'kpf-core')
										: __('Not detected', 'kpf-core')
								}
							/>
							<Stat
								label={__('CDN', 'kpf-core')}
								value={
									settings.cdn?.enabled
										? settings.cdn.provider || __('On', 'kpf-core')
										: __('Off', 'kpf-core')
								}
							/>
						</div>
						<p className="kpf-perf-note">
							{__(
								'These settings are stored in WordPress and exposed to the frontend via /kpf-performance/v1/public/config so Next.js or an edge layer can honor TTLs and exclusions.',
								'kpf-core'
							)}
						</p>
					</Section>
				</div>
			)}

			{activeTab === 'pages' && (
				<div className="kpf-perf__layout">
					<Section title={__('Page & API caching', 'kpf-core')}>
						<FieldGroup
							title={__('Page cache', 'kpf-core')}
							help={__('How long rendered pages and edge HTML may be reused.', 'kpf-core')}
						>
							<ToggleControl
								label={__('Enable page caching', 'kpf-core')}
								checked={!!settings.pages.enabled}
								onChange={(value) => patch('pages', 'enabled', value)}
							/>
							<TtlSelect
								label={__('Page cache TTL', 'kpf-core')}
								help={__('Time-to-live for cached HTML responses.', 'kpf-core')}
								value={settings.pages.ttl}
								onChange={(value) => patch('pages', 'ttl', value)}
							/>
							<TtlSelect
								label={__('Stale while revalidate', 'kpf-core')}
								help={__(
									'Serve a slightly stale response while a fresh one is generated.',
									'kpf-core'
								)}
								value={settings.pages.stale_while_revalidate}
								onChange={(value) => patch('pages', 'stale_while_revalidate', value)}
							/>
							<ToggleControl
								label={__('Cache logged-in users', 'kpf-core')}
								help={__('Usually leave off for personalized dashboards or stores.', 'kpf-core')}
								checked={!!settings.pages.cache_logged_in}
								onChange={(value) => patch('pages', 'cache_logged_in', value)}
							/>
							<ToggleControl
								label={__('Cache URLs with query strings', 'kpf-core')}
								help={__('Aggressive: may cache filtered or tracked URLs separately.', 'kpf-core')}
								checked={!!settings.pages.cache_query_strings}
								onChange={(value) => patch('pages', 'cache_query_strings', value)}
							/>
						</FieldGroup>
						<FieldGroup
							title={__('API responses', 'kpf-core')}
							help={__('TTLs applied to GraphQL and REST for the headless frontend.', 'kpf-core')}
						>
							<TtlSelect
								label={__('GraphQL TTL', 'kpf-core')}
								value={settings.pages.graphql_ttl}
								onChange={(value) => patch('pages', 'graphql_ttl', value)}
							/>
							<TtlSelect
								label={__('REST API TTL', 'kpf-core')}
								value={settings.pages.rest_ttl}
								onChange={(value) => patch('pages', 'rest_ttl', value)}
							/>
						</FieldGroup>
						<FieldGroup
							title={__('Exclusions', 'kpf-core')}
							help={__('One path prefix per line. Matching URLs skip page cache.', 'kpf-core')}
						>
							<TextareaControl
								label={__('Exclude paths', 'kpf-core')}
								value={settings.pages.exclude_paths || ''}
								onChange={(value) => patch('pages', 'exclude_paths', value)}
								rows={6}
								__nextHasNoMarginBottom
							/>
						</FieldGroup>
					</Section>
				</div>
			)}

			{activeTab === 'media' && (
				<div className="kpf-perf__layout">
					<Section title={__('Media caching & delivery', 'kpf-core')}>
						<FieldGroup title={__('Caching', 'kpf-core')}>
							<ToggleControl
								label={__('Enable media optimizations', 'kpf-core')}
								checked={!!settings.media.enabled}
								onChange={(value) => patch('media', 'enabled', value)}
							/>
							<TtlSelect
								label={__('Browser cache for media', 'kpf-core')}
								help={__('How long browsers keep images and other uploads.', 'kpf-core')}
								value={settings.media.browser_ttl}
								onChange={(value) => patch('media', 'browser_ttl', value)}
							/>
						</FieldGroup>
						<FieldGroup title={__('Loading', 'kpf-core')}>
							<ToggleControl
								label={__('Lazy-load images', 'kpf-core')}
								checked={!!settings.media.lazy_load}
								onChange={(value) => patch('media', 'lazy_load', value)}
							/>
							<ToggleControl
								label={__('Prefer native lazy loading', 'kpf-core')}
								checked={!!settings.media.lazy_load_native}
								onChange={(value) => patch('media', 'lazy_load_native', value)}
							/>
							<ToggleControl
								label={__('Responsive image sizes', 'kpf-core')}
								checked={!!settings.media.responsive_images}
								onChange={(value) => patch('media', 'responsive_images', value)}
							/>
						</FieldGroup>
						<FieldGroup title={__('Formats', 'kpf-core')}>
							<ToggleControl
								label={__('Prefer WebP when available', 'kpf-core')}
								checked={!!settings.media.prefer_webp}
								onChange={(value) => patch('media', 'prefer_webp', value)}
							/>
							<ToggleControl
								label={__('Prefer AVIF when available', 'kpf-core')}
								help={__('Aggressive: smaller files, fewer browser edge cases.', 'kpf-core')}
								checked={!!settings.media.prefer_avif}
								onChange={(value) => patch('media', 'prefer_avif', value)}
							/>
							<ToggleControl
								label={__('Strip EXIF metadata on upload', 'kpf-core')}
								checked={!!settings.media.strip_exif}
								onChange={(value) => patch('media', 'strip_exif', value)}
							/>
						</FieldGroup>
						<FieldGroup title={__('Media CDN', 'kpf-core')}>
							<TextControl
								label={__('Media CDN base URL', 'kpf-core')}
								help={__('Optional. Example: https://cdn.example.com', 'kpf-core')}
								value={settings.media.cdn_url || ''}
								onChange={(value) => patch('media', 'cdn_url', value)}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						</FieldGroup>
					</Section>
				</div>
			)}

			{activeTab === 'code' && (
				<div className="kpf-perf__layout">
					<Section title={__('CSS & JavaScript', 'kpf-core')}>
						<FieldGroup title={__('Asset caching', 'kpf-core')}>
							<ToggleControl
								label={__('Enable code optimizations', 'kpf-core')}
								checked={!!settings.code.enabled}
								onChange={(value) => patch('code', 'enabled', value)}
							/>
							<TtlSelect
								label={__('Browser cache for CSS/JS', 'kpf-core')}
								value={settings.code.browser_ttl}
								onChange={(value) => patch('code', 'browser_ttl', value)}
							/>
						</FieldGroup>
						<FieldGroup
							title={__('Minify & combine', 'kpf-core')}
							help={__(
								'Minify is usually safe. Combining files can conflict with modern module loaders — use carefully.',
								'kpf-core'
							)}
						>
							<ToggleControl
								label={__('Minify CSS', 'kpf-core')}
								checked={!!settings.code.minify_css}
								onChange={(value) => patch('code', 'minify_css', value)}
							/>
							<ToggleControl
								label={__('Minify JavaScript', 'kpf-core')}
								checked={!!settings.code.minify_js}
								onChange={(value) => patch('code', 'minify_js', value)}
							/>
							<ToggleControl
								label={__('Combine CSS files', 'kpf-core')}
								checked={!!settings.code.combine_css}
								onChange={(value) => patch('code', 'combine_css', value)}
							/>
							<ToggleControl
								label={__('Combine JavaScript files', 'kpf-core')}
								checked={!!settings.code.combine_js}
								onChange={(value) => patch('code', 'combine_js', value)}
							/>
						</FieldGroup>
						<FieldGroup title={__('Loading strategy', 'kpf-core')}>
							<ToggleControl
								label={__('Defer JavaScript', 'kpf-core')}
								checked={!!settings.code.defer_js}
								onChange={(value) => patch('code', 'defer_js', value)}
							/>
							<ToggleControl
								label={__('Delay JavaScript until interaction', 'kpf-core')}
								help={__('Aggressive: can improve LCP but may break early interactions.', 'kpf-core')}
								checked={!!settings.code.delay_js}
								onChange={(value) => patch('code', 'delay_js', value)}
							/>
							<ToggleControl
								label={__('Remove unused CSS', 'kpf-core')}
								checked={!!settings.code.remove_unused_css}
								onChange={(value) => patch('code', 'remove_unused_css', value)}
							/>
							<ToggleControl
								label={__('Critical CSS', 'kpf-core')}
								checked={!!settings.code.critical_css}
								onChange={(value) => patch('code', 'critical_css', value)}
							/>
							<ToggleControl
								label={__('Preload fonts', 'kpf-core')}
								checked={!!settings.code.preload_fonts}
								onChange={(value) => patch('code', 'preload_fonts', value)}
							/>
						</FieldGroup>
						<FieldGroup
							title={__('DNS prefetch', 'kpf-core')}
							help={__(
								'Resolve third-party hostnames early so fonts, analytics, embeds, and CDNs connect faster when used. Only enable hosts you actually load.',
								'kpf-core'
							)}
						>
							<ToggleControl
								label={__('Enable DNS prefetch hints', 'kpf-core')}
								checked={!!settings.code.prefetch_dns}
								onChange={(value) => patch('code', 'prefetch_dns', value)}
							/>
							<DnsPrefetchPicker
								enabled={!!settings.code.prefetch_dns}
								selected={settings.code.dns_prefetch_hosts || []}
								onToggleHost={toggleDnsHost}
								onSelectGroup={selectDnsGroup}
								onClearGroup={clearDnsGroup}
							/>
						</FieldGroup>
					</Section>
				</div>
			)}

			{activeTab === 'browser' && (
				<div className="kpf-perf__layout">
					<Section title={__('Browser Cache-Control', 'kpf-core')}>
						<FieldGroup title={__('Headers', 'kpf-core')}>
							<ToggleControl
								label={__('Send browser cache headers', 'kpf-core')}
								checked={!!settings.browser.enabled}
								onChange={(value) => patch('browser', 'enabled', value)}
							/>
							<TtlSelect
								label={__('HTML TTL', 'kpf-core')}
								help={__('0 with must-revalidate keeps HTML fresh while allowing validators.', 'kpf-core')}
								value={settings.browser.html_ttl}
								onChange={(value) => patch('browser', 'html_ttl', value)}
							/>
							<ToggleControl
								label={__('HTML must-revalidate', 'kpf-core')}
								checked={!!settings.browser.html_must_revalidate}
								onChange={(value) => patch('browser', 'html_must_revalidate', value)}
							/>
							<TtlSelect
								label={__('Static assets TTL', 'kpf-core')}
								value={settings.browser.static_ttl}
								onChange={(value) => patch('browser', 'static_ttl', value)}
							/>
							<TtlSelect
								label={__('API TTL (fallback)', 'kpf-core')}
								value={settings.browser.api_ttl}
								onChange={(value) => patch('browser', 'api_ttl', value)}
							/>
							<ToggleControl
								label={__('Enable ETag', 'kpf-core')}
								checked={!!settings.browser.etag}
								onChange={(value) => patch('browser', 'etag', value)}
							/>
							<ToggleControl
								label={__('Vary: Accept-Encoding', 'kpf-core')}
								checked={!!settings.browser.vary_encoding}
								onChange={(value) => patch('browser', 'vary_encoding', value)}
							/>
						</FieldGroup>
					</Section>
				</div>
			)}

			{activeTab === 'cdn' && (
				<div className="kpf-perf__layout">
					<Section title={__('CDN / edge cache', 'kpf-core')}>
						<FieldGroup title={__('Provider', 'kpf-core')}>
							<ToggleControl
								label={__('Enable CDN / edge settings', 'kpf-core')}
								checked={!!settings.cdn.enabled}
								onChange={(value) => patch('cdn', 'enabled', value)}
							/>
							<SelectControl
								label={__('Provider', 'kpf-core')}
								value={settings.cdn.provider || 'none'}
								options={[
									{ label: __('None', 'kpf-core'), value: 'none' },
									{ label: 'Cloudflare', value: 'cloudflare' },
									{ label: 'Fastly', value: 'fastly' },
									{ label: 'Vercel', value: 'vercel' },
									{ label: __('Custom purge URL', 'kpf-core'), value: 'custom' },
								]}
								onChange={(value) => patch('cdn', 'provider', value)}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<TtlSelect
								label={__('Edge TTL', 'kpf-core')}
								value={settings.cdn.edge_ttl}
								onChange={(value) => patch('cdn', 'edge_ttl', value)}
							/>
						</FieldGroup>
						<FieldGroup
							title={__('Purge webhook', 'kpf-core')}
							help={__(
								'Optional. Fired when you click Purge cache (via the kpf_performance_purge action).',
								'kpf-core'
							)}
						>
							<TextControl
								label={__('Purge URL', 'kpf-core')}
								value={settings.cdn.purge_url || ''}
								onChange={(value) => patch('cdn', 'purge_url', value)}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={__('Purge token', 'kpf-core')}
								type="password"
								value={settings.cdn.purge_token || ''}
								onChange={(value) => patch('cdn', 'purge_token', value)}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						</FieldGroup>
					</Section>
				</div>
			)}

			{activeTab === 'advanced' && (
				<div className="kpf-perf__layout">
					<Section title={__('Advanced controls', 'kpf-core')}>
						<FieldGroup title={__('WordPress housekeeping', 'kpf-core')}>
							<ToggleControl
								label={__('Show object-cache status', 'kpf-core')}
								checked={!!settings.advanced.object_cache_hint}
								onChange={(value) => patch('advanced', 'object_cache_hint', value)}
							/>
							<ToggleControl
								label={__('Slow admin Heartbeat (60s)', 'kpf-core')}
								checked={!!settings.advanced.heartbeat_limit}
								onChange={(value) => patch('advanced', 'heartbeat_limit', value)}
							/>
							<ToggleControl
								label={__('Disable emoji scripts', 'kpf-core')}
								checked={!!settings.advanced.disable_emojis}
								onChange={(value) => patch('advanced', 'disable_emojis', value)}
							/>
							<ToggleControl
								label={__('Disable oEmbed discovery', 'kpf-core')}
								checked={!!settings.advanced.disable_embeds}
								onChange={(value) => patch('advanced', 'disable_embeds', value)}
							/>
							<SelectControl
								label={__('Limit post revisions', 'kpf-core')}
								help={__('0 keeps WordPress default (unlimited unless defined elsewhere).', 'kpf-core')}
								value={String(settings.advanced.limit_revisions ?? 0)}
								options={[
									{ label: __('Unlimited / default', 'kpf-core'), value: '0' },
									{ label: '3', value: '3' },
									{ label: '5', value: '5' },
									{ label: '10', value: '10' },
									{ label: '25', value: '25' },
								]}
								onChange={(value) => patch('advanced', 'limit_revisions', Number(value))}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						</FieldGroup>
						<FieldGroup
							title={__('Cookie exclusions', 'kpf-core')}
							help={__('Cookie name prefixes that should bypass cache. One per line.', 'kpf-core')}
						>
							<TextareaControl
								label={__('Exclude cookies', 'kpf-core')}
								value={settings.advanced.exclude_cookies || ''}
								onChange={(value) => patch('advanced', 'exclude_cookies', value)}
								rows={5}
								__nextHasNoMarginBottom
							/>
						</FieldGroup>
						<FieldGroup title={__('Diagnostics', 'kpf-core')}>
							<ToggleControl
								label={__('Send X-KPF-Cache debug headers', 'kpf-core')}
								checked={!!settings.advanced.debug_headers}
								onChange={(value) => patch('advanced', 'debug_headers', value)}
							/>
							<div className="kpf-perf-actions">
								<Button variant="secondary" onClick={purgeCache} isBusy={purging} disabled={purging}>
									{__('Purge all caches now', 'kpf-core')}
								</Button>
							</div>
							{status?.last_purged ? (
								<p className="kpf-perf-note">
									{__('Last purged:', 'kpf-core')} {status.last_purged}
								</p>
							) : null}
						</FieldGroup>
					</Section>
				</div>
			)}
		</div>
	);
}
