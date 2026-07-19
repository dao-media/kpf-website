import { useEffect, useMemo, useState } from '@wordpress/element';
import {
	Button,
	Notice,
	Spinner,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { accessibilityApi } from './api';
import { FieldGroup, Section, Stat } from './components/Section';

const PRESET_META = window.kpfAccessibilityAdmin?.presets || {
	off: {
		label: __('Off', 'kpf-core'),
		description: __('No accessibility utilities.', 'kpf-core'),
	},
	essential: {
		label: __('Essential', 'kpf-core'),
		description: __('Skip link and focus rings.', 'kpf-core'),
	},
	recommended: {
		label: __('Recommended', 'kpf-core'),
		description: __('Balanced defaults for most sites.', 'kpf-core'),
	},
	strict: {
		label: __('Strict', 'kpf-core'),
		description: __('Stronger focus and forced reduced motion.', 'kpf-core'),
	},
};

const SECTION_COPY = {
	overview: {
		title: __('Accessibility', 'kpf-core'),
		description: __(
			'Apply a profile, then fine-tune navigation, content, media, motion, and forms for the public site.',
			'kpf-core'
		),
	},
	navigation: {
		title: __('Navigation', 'kpf-core'),
		description: __('Skip links, focus rings, and keyboard landmarks.', 'kpf-core'),
	},
	content: {
		title: __('Content', 'kpf-core'),
		description: __('Document language, link underlines, and SPA route announcements.', 'kpf-core'),
	},
	media: {
		title: __('Media', 'kpf-core'),
		description: __('Respect reduced motion for autoplay and animated media.', 'kpf-core'),
	},
	motion: {
		title: __('Motion', 'kpf-core'),
		description: __('Honor prefers-reduced-motion or force reduced motion sitewide.', 'kpf-core'),
	},
	forms: {
		title: __('Forms', 'kpf-core'),
		description: __('Visible focus on controls and a polite live region for status messages.', 'kpf-core'),
	},
	advanced: {
		title: __('Advanced', 'kpf-core'),
		description: __('Custom accessibility CSS and temporary debug outlines.', 'kpf-core'),
	},
};

function pageSlugForTab(tab) {
	return tab === 'overview' ? 'kpf-accessibility' : `kpf-accessibility-${tab}`;
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

	document.querySelectorAll('#toplevel_page_kpf-accessibility .wp-submenu a').forEach((link) => {
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

function yesNo(value) {
	return value ? __('On', 'kpf-core') : __('Off', 'kpf-core');
}

export default function App() {
	const [settings, setSettings] = useState(null);
	const [saved, setSaved] = useState(null);
	const [status, setStatus] = useState(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [applying, setApplying] = useState(false);
	const [notice, setNotice] = useState(null);
	const [activeTab, setActiveTab] = useState(
		window.kpfAccessibilityAdmin?.initialTab || 'overview'
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
					accessibilityApi.getSettings(),
					accessibilityApi.getStatus(),
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
						message: error?.message || __('Could not load accessibility settings.', 'kpf-core'),
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

	useEffect(() => {
		function onClick(event) {
			const link = event.target.closest('#toplevel_page_kpf-accessibility .wp-submenu a');
			if (!link) {
				return;
			}
			const href = link.getAttribute('href') || '';
			const page = new URL(href, window.location.origin).searchParams.get('page') || '';
			const prefix = 'kpf-accessibility-';
			let tab = 'overview';
			if (page === 'kpf-accessibility') {
				tab = 'overview';
			} else if (page.startsWith(prefix)) {
				tab = page.slice(prefix.length);
			}
			if (!SECTION_COPY[tab]) {
				return;
			}
			event.preventDefault();
			setActiveTab(tab);
		}

		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	}, []);

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

	async function save() {
		setSaving(true);
		setNotice(null);
		try {
			const next = await accessibilityApi.saveSettings(settings);
			setSettings(next);
			setSaved(next);
			const nextStatus = await accessibilityApi.getStatus();
			setStatus(nextStatus);
			setNotice({
				status: 'success',
				message: __('Accessibility settings saved.', 'kpf-core'),
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
			const next = await accessibilityApi.applyPreset(preset);
			setSettings(next);
			setSaved(next);
			const nextStatus = await accessibilityApi.getStatus();
			setStatus(nextStatus);
			setNotice({
				status: 'success',
				message: __('Accessibility preset applied and saved.', 'kpf-core'),
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

	const copy = SECTION_COPY[activeTab] || SECTION_COPY.overview;

	if (loading || !settings) {
		return (
			<div className="kpf-a11y">
				<div className="kpf-a11y-loading">
					<Spinner />
				</div>
			</div>
		);
	}

	const checklist = [
		{ label: __('Skip link', 'kpf-core'), on: status?.skip_link },
		{ label: __('Focus ring', 'kpf-core'), on: status?.focus_ring },
		{ label: __('Route announcer', 'kpf-core'), on: status?.route_announcer },
		{ label: __('Underline links', 'kpf-core'), on: status?.underline_links },
		{ label: __('Reduced motion', 'kpf-core'), on: status?.reduced_motion },
		{ label: __('Form focus', 'kpf-core'), on: status?.forms_focus },
	];

	return (
		<div className="kpf-a11y">
			<header className="kpf-a11y__header">
				<div className="kpf-a11y__header-copy">
					<h1>{copy.title}</h1>
					<p>{copy.description}</p>
				</div>
				<div className="kpf-a11y__header-actions">
					{dirty ? <span className="kpf-a11y__dirty">{__('Unsaved', 'kpf-core')}</span> : null}
					<Button variant="primary" onClick={save} isBusy={saving} disabled={saving || !dirty}>
						{__('Save changes', 'kpf-core')}
					</Button>
				</div>
			</header>

			{notice ? (
				<div className="kpf-a11y__notices">
					<Notice status={notice.status} onRemove={() => setNotice(null)}>
						{notice.message}
					</Notice>
				</div>
			) : null}

			<div className="kpf-a11y__layout">
				{activeTab === 'overview' ? (
					<>
						<Section
							title={__('Profiles', 'kpf-core')}
							description={__(
								'One click applies a complete set of utilities to the public site.',
								'kpf-core'
							)}
						>
							<div className="kpf-a11y-presets">
								{Object.entries(PRESET_META).map(([key, meta]) => (
									<button
										key={key}
										type="button"
										className={`kpf-a11y-preset ${
											settings.preset === key ? 'is-active' : ''
										}`}
										onClick={() => applyPreset(key)}
										disabled={applying}
									>
										<p className="kpf-a11y-preset__label">{meta.label}</p>
										<p className="kpf-a11y-preset__desc">{meta.description}</p>
									</button>
								))}
								{settings.preset === 'custom' ? (
									<div className="kpf-a11y-preset is-custom is-active" aria-current="true">
										<p className="kpf-a11y-preset__label">{__('Custom', 'kpf-core')}</p>
										<p className="kpf-a11y-preset__desc">
											{__('You have customized individual toggles.', 'kpf-core')}
										</p>
									</div>
								) : null}
							</div>
						</Section>

						<Section title={__('Status', 'kpf-core')}>
							<div className="kpf-a11y-stats">
								<Stat
									label={__('Active profile', 'kpf-core')}
									value={
										PRESET_META[settings.preset]?.label ||
										__('Custom', 'kpf-core')
									}
								/>
								<Stat
									label={__('Skip link', 'kpf-core')}
									value={yesNo(status?.skip_link)}
								/>
								<Stat
									label={__('Focus ring', 'kpf-core')}
									value={yesNo(status?.focus_ring)}
								/>
								<Stat
									label={__('Reduced motion', 'kpf-core')}
									value={yesNo(status?.reduced_motion)}
								/>
							</div>
							<ul className="kpf-a11y-checklist">
								{checklist.map((item) => (
									<li key={item.label}>
										<span
											className={`kpf-a11y-checklist__mark ${item.on ? '' : 'is-off'}`}
											aria-hidden="true"
										>
											{item.on ? '✓' : '–'}
										</span>
										<span>{item.label}</span>
									</li>
								))}
							</ul>
						</Section>
					</>
				) : null}

				{activeTab === 'navigation' ? (
					<Section title={__('Keyboard & landmarks', 'kpf-core')}>
						<FieldGroup
							title={__('Skip link', 'kpf-core')}
							help={__(
								'Adds a “Skip to content” link that appears on keyboard focus.',
								'kpf-core'
							)}
						>
							<ToggleControl
								label={__('Enable skip link', 'kpf-core')}
								checked={Boolean(settings.navigation.skip_link)}
								onChange={(value) => patch('navigation', 'skip_link', value)}
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={__('Skip target', 'kpf-core')}
								help={__('CSS id selector for main content, e.g. #main', 'kpf-core')}
								value={settings.navigation.skip_target || '#main'}
								onChange={(value) => patch('navigation', 'skip_target', value)}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</FieldGroup>
						<FieldGroup
							title={__('Focus ring', 'kpf-core')}
							help={__('High-contrast outline for keyboard focus.', 'kpf-core')}
						>
							<ToggleControl
								label={__('Enable focus ring', 'kpf-core')}
								checked={Boolean(settings.navigation.focus_ring)}
								onChange={(value) => patch('navigation', 'focus_ring', value)}
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={__('Ring color', 'kpf-core')}
								value={settings.navigation.focus_ring_color || '#2271b1'}
								onChange={(value) => patch('navigation', 'focus_ring_color', value)}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
							<TextControl
								label={__('Ring width (px)', 'kpf-core')}
								type="number"
								min={1}
								max={8}
								value={String(settings.navigation.focus_ring_width || 3)}
								onChange={(value) =>
									patch('navigation', 'focus_ring_width', Number(value) || 3)
								}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</FieldGroup>
					</Section>
				) : null}

				{activeTab === 'content' ? (
					<Section title={__('Reading & announcements', 'kpf-core')}>
						<FieldGroup title={__('Language', 'kpf-core')}>
							<TextControl
								label={__('Document language', 'kpf-core')}
								help={__('BCP 47 code such as en or en-US.', 'kpf-core')}
								value={settings.content.language || 'en'}
								onChange={(value) => patch('content', 'language', value)}
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						</FieldGroup>
						<FieldGroup title={__('Links', 'kpf-core')}>
							<ToggleControl
								label={__('Underline body content links', 'kpf-core')}
								checked={Boolean(settings.content.underline_links)}
								onChange={(value) => patch('content', 'underline_links', value)}
								__nextHasNoMarginBottom
							/>
						</FieldGroup>
						<FieldGroup
							title={__('Route announcer', 'kpf-core')}
							help={__(
								'Announces page title changes to screen readers during client-side navigation.',
								'kpf-core'
							)}
						>
							<ToggleControl
								label={__('Announce route changes', 'kpf-core')}
								checked={Boolean(settings.content.route_announcer)}
								onChange={(value) => patch('content', 'route_announcer', value)}
								__nextHasNoMarginBottom
							/>
						</FieldGroup>
					</Section>
				) : null}

				{activeTab === 'media' ? (
					<Section title={__('Media playback', 'kpf-core')}>
						<FieldGroup
							help={__(
								'When the visitor prefers reduced motion, pause autoplaying video and animated media.',
								'kpf-core'
							)}
						>
							<ToggleControl
								label={__('Block autoplay under reduced motion', 'kpf-core')}
								checked={Boolean(settings.media.block_autoplay_reduced_motion)}
								onChange={(value) =>
									patch('media', 'block_autoplay_reduced_motion', value)
								}
								__nextHasNoMarginBottom
							/>
						</FieldGroup>
					</Section>
				) : null}

				{activeTab === 'motion' ? (
					<Section title={__('Motion preferences', 'kpf-core')}>
						<FieldGroup>
							<ToggleControl
								label={__('Honor prefers-reduced-motion', 'kpf-core')}
								help={__(
									'Shorten or disable non-essential transitions when the OS requests it.',
									'kpf-core'
								)}
								checked={Boolean(settings.motion.honor_prefers_reduced_motion)}
								onChange={(value) =>
									patch('motion', 'honor_prefers_reduced_motion', value)
								}
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={__('Force reduced motion for everyone', 'kpf-core')}
								help={__(
									'Applies reduced-motion styles sitewide, regardless of OS preference.',
									'kpf-core'
								)}
								checked={Boolean(settings.motion.force_reduce_motion)}
								onChange={(value) => patch('motion', 'force_reduce_motion', value)}
								__nextHasNoMarginBottom
							/>
						</FieldGroup>
					</Section>
				) : null}

				{activeTab === 'forms' ? (
					<Section title={__('Form controls', 'kpf-core')}>
						<FieldGroup>
							<ToggleControl
								label={__('Enhanced focus on inputs', 'kpf-core')}
								checked={Boolean(settings.forms.enhanced_focus)}
								onChange={(value) => patch('forms', 'enhanced_focus', value)}
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={__('Polite status live region', 'kpf-core')}
								help={__(
									'Mounts an aria-live region forms and scripts can announce into.',
									'kpf-core'
								)}
								checked={Boolean(settings.forms.status_live_region)}
								onChange={(value) => patch('forms', 'status_live_region', value)}
								__nextHasNoMarginBottom
							/>
						</FieldGroup>
					</Section>
				) : null}

				{activeTab === 'advanced' ? (
					<Section title={__('Advanced utilities', 'kpf-core')}>
						<FieldGroup title={__('Custom CSS', 'kpf-core')}>
							<TextareaControl
								label={__('Additional accessibility CSS', 'kpf-core')}
								help={__('Injected after the generated utility styles.', 'kpf-core')}
								value={settings.advanced.custom_css || ''}
								onChange={(value) => patch('advanced', 'custom_css', value)}
								rows={8}
								__nextHasNoMarginBottom
							/>
						</FieldGroup>
						<FieldGroup title={__('Debug', 'kpf-core')}>
							<ToggleControl
								label={__('Outline interactive elements', 'kpf-core')}
								help={__(
									'Temporary visual outlines for auditing focusable controls. Turn off on production.',
									'kpf-core'
								)}
								checked={Boolean(settings.advanced.debug_outlines)}
								onChange={(value) => patch('advanced', 'debug_outlines', value)}
								__nextHasNoMarginBottom
							/>
						</FieldGroup>
					</Section>
				) : null}
			</div>
		</div>
	);
}
