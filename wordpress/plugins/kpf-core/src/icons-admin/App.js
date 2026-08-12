import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	Notice,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import * as Lucide from 'lucide-react';
import { saveStylesheetClass } from './api';
	import {
	buildCopyFormats,
	defaultClassName,
	isZeroBox,
	normalizeClassName,
	normalizeCssBox,
	readViewBoxRatio,
	toKebabCase,
} from './copyFormats';
import { downloadIconPng, downloadIconSvg } from './exportPng';
import lucideCatalog from './lucideCatalog.json';
import './admin.scss';

apiFetch.use(apiFetch.createNonceMiddleware(window.kpfIconsAdmin?.nonce || ''));

const BOOT = window.kpfIconsAdmin || {};
const DEFAULTS = {
	size: 20,
	strokeWidth: 1.75,
	strokeLinecap: 'round',
	strokeLinejoin: 'round',
	color: 'currentColor',
	padding: '0',
	margin: '0',
	className: '',
	...(BOOT.defaults || {}),
};
const COLOR_TOKENS = BOOT.colorTokens || [
	{ label: 'Inherit (currentColor)', value: 'currentColor' },
];
const PAGE_SIZE = 96;
const SKIP = new Set(['Icon', 'createLucideIcon', 'LucideProvider']);
const LUCIDE_CATEGORIES = Array.isArray(lucideCatalog?.categories) ? lucideCatalog.categories : [];
const LUCIDE_ICON_META = lucideCatalog?.icons || {};
const LUCIDE_BY_CATEGORY = lucideCatalog?.byCategory || {};

function toPascalCase(kebab) {
	return String(kebab || '')
		.split('-')
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('');
}

/** Unique Lucide icon components (PascalCase), aliases deduped by identity. */
const ICON_NAMES = (() => {
	const seen = new Set();
	const names = [];
	for (const name of Object.keys(Lucide).sort((a, b) => a.localeCompare(b))) {
		if (!/^[A-Z]/.test(name) || name.startsWith('Lucide') || SKIP.has(name)) continue;
		const Comp = Lucide[name];
		if (!Comp || (typeof Comp !== 'function' && typeof Comp !== 'object')) continue;
		if (seen.has(Comp)) continue;
		seen.add(Comp);
		names.push(name);
	}
	return names;
})();

function matchesQuery(name, needle) {
	if (!needle) return true;
	const kebab = toKebabCase(name);
	if (name.toLowerCase().includes(needle) || kebab.includes(needle)) return true;
	const meta = LUCIDE_ICON_META[name];
	if (!meta) return false;
	if ((meta.tags || []).some((tag) => String(tag).toLowerCase().includes(needle))) return true;
	if ((meta.categories || []).some((cat) => String(cat).toLowerCase().includes(needle))) return true;
	return false;
}

async function copyText(text) {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return;
	}
	const ta = document.createElement('textarea');
	ta.value = text;
	document.body.appendChild(ta);
	ta.select();
	document.execCommand('copy');
	ta.remove();
}

function emptyConfig(pascal = 'Heart') {
	return {
		...DEFAULTS,
		className: defaultClassName(pascal).replace(/^\./, ''),
	};
}

/** True when the icon color needs a dark preview surface (e.g. on-brand / white). */
function isLightIconColor(value) {
	const v = String(value || '').trim().toLowerCase();
	if (!v) return false;
	if (v.includes('icon-on-brand') || v.includes('kpf-white')) return true;
	if (v === '#fff' || v === '#ffffff' || v === 'white' || v === 'rgb(255, 255, 255)') return true;
	return false;
}

/** Resolve CSS colors (including var()) against the live preview for PNG export. */
function resolvePreviewColor(value, rootEl) {
	const raw = String(value || 'currentColor').trim() || 'currentColor';
	if (raw === 'currentColor') return '#12090a';
	if (!rootEl || typeof window === 'undefined' || !raw.includes('var(')) return raw;
	const probe = document.createElement('span');
	probe.style.cssText = `color:${raw};position:absolute;left:-9999px;`;
	rootEl.appendChild(probe);
	const resolved = window.getComputedStyle(probe).color;
	probe.remove();
	return resolved && resolved !== 'rgba(0, 0, 0, 0)' ? resolved : raw;
}

export default function App() {
	const previewRef = useRef(null);
	const gridRef = useRef(null);
	const sentinelRef = useRef(null);
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState('all');
	const [selected, setSelected] = useState('Heart');
	const [mode, setMode] = useState('simple');
	const [config, setConfig] = useState(() => emptyConfig('Heart'));
	const [svgOuterHtml, setSvgOuterHtml] = useState('');
	const [iconRatio, setIconRatio] = useState('24 / 24');
	const [notice, setNotice] = useState(null);
	const [saving, setSaving] = useState(false);
	const [exporting, setExporting] = useState(null); // null | 'png' | 'svg'
	const [copyFormat, setCopyFormat] = useState('svg');
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

	const SelectedIcon = Lucide[selected] || Lucide.Heart;

	const categoryPool = useMemo(() => {
		if (category === 'all') return ICON_NAMES;
		const listed = LUCIDE_BY_CATEGORY[category] || [];
		// Keep only icons that exist in this Lucide React build.
		return listed.filter((name) => Lucide[name]);
	}, [category]);

	const filtered = useMemo(() => {
		const needle = query.trim().toLowerCase();
		// With a query, search the full library (name + Lucide tags/keywords +
		// category ids) so matches aren't limited to the active category chip.
		if (needle) {
			return ICON_NAMES.filter((name) => matchesQuery(name, needle));
		}
		return categoryPool;
	}, [query, categoryPool]);

	const visible = filtered.slice(0, visibleCount);
	const hasMore = visibleCount < filtered.length;

	// Reset lazy window whenever the filtered set changes.
	useEffect(() => {
		setVisibleCount(PAGE_SIZE);
		if (gridRef.current) {
			gridRef.current.scrollTop = 0;
		}
	}, [query, category]);

	// Infinite scroll: load the next page when the sentinel enters the grid viewport.
	useEffect(() => {
		const root = gridRef.current;
		const sentinel = sentinelRef.current;
		if (!root || !sentinel || !hasMore) return undefined;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					setVisibleCount((count) => Math.min(count + PAGE_SIZE, filtered.length));
				}
			},
			{ root, rootMargin: '240px 0px', threshold: 0 }
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [hasMore, filtered.length, visible.length]);

	const categoryCounts = useMemo(() => {
		const needle = query.trim().toLowerCase();
		const counts = { all: 0 };
		for (const name of ICON_NAMES) {
			if (!matchesQuery(name, needle)) continue;
			counts.all += 1;
			const cats = LUCIDE_ICON_META[name]?.categories || [];
			for (const id of cats) {
				counts[id] = (counts[id] || 0) + 1;
			}
		}
		return counts;
	}, [query]);

	useEffect(() => {
		const id = window.requestAnimationFrame(() => {
			const svg = previewRef.current?.querySelector('svg');
			if (!svg) {
				setSvgOuterHtml('');
				return;
			}
			setSvgOuterHtml(svg.outerHTML);
			setIconRatio(readViewBoxRatio(svg).ratio);
		});
		return () => window.cancelAnimationFrame(id);
	}, [selected, mode, config]);

	const formats = useMemo(() => {
		if (!svgOuterHtml) return null;
		return buildCopyFormats({
			pascal: selected,
			svgOuterHtml,
			mode,
			config: {
				...config,
				className: normalizeClassName(config.className, selected),
			},
		});
	}, [svgOuterHtml, selected, mode, config]);

	function selectIcon(name) {
		setSelected(name);
		setConfig((prev) => ({
			...prev,
			className: defaultClassName(name).replace(/^\./, ''),
		}));
		setNotice(null);
	}

	async function handleCopy(kind) {
		if (!formats) return;
		const map = {
			svg: formats.svg,
			html: formats.html,
			react: formats.react,
			reactDynamic: formats.reactDynamic,
			css: formats.css,
		};
		const text = map[kind];
		if (!text) return;
		try {
			await copyText(text);
			setNotice({
				status: 'success',
				message: sprintf(
					/* translators: %s: format name */
					__('Copied %s to clipboard.', 'kpf-core'),
					kind === 'reactDynamic' ? 'React (Icon)' : kind.toUpperCase()
				),
			});
		} catch (err) {
			setNotice({
				status: 'error',
				message: err?.message || __('Could not copy to clipboard.', 'kpf-core'),
			});
		}
	}

	async function handleSaveClass() {
		if (!formats) return;
		const name = formats.className;
		if (
			!window.confirm(
				sprintf(
					/* translators: %s: CSS class name */
					__(
						'Save %s to the global stylesheet tokens block? Existing class with the same name will be updated.',
						'kpf-core'
					),
					name
				)
			)
		) {
			return;
		}
		setSaving(true);
		setNotice(null);
		try {
			await saveStylesheetClass({
				name,
				css: formats.css,
				icon: toKebabCase(selected),
				config: {
					...config,
					strokeLinecap: 'round',
					strokeLinejoin: 'round',
					ratio: formats.ratio || iconRatio,
				},
			});
			setNotice({
				status: 'success',
				message: sprintf(
					/* translators: %s: CSS class name */
					__('Saved %s to the stylesheet.', 'kpf-core'),
					name
				),
			});
		} catch (err) {
			setNotice({
				status: 'error',
				message: err?.message || __('Could not save stylesheet class.', 'kpf-core'),
			});
		} finally {
			setSaving(false);
		}
	}

	function prepareExportMarkup() {
		if (!formats?.svg) return '';
		let markup = formats.svg;
		const resolved = resolvePreviewColor(
			mode === 'configured' ? config.color || 'currentColor' : 'currentColor',
			previewRef.current
		);
		return markup
			.replace(/stroke="currentColor"/g, `stroke="${resolved}"`)
			.replace(/color:\s*currentColor/g, `color: ${resolved}`)
			.replace(/color:\s*var\([^)]+\)/g, `color: ${resolved}`);
	}

	async function handleExportSvg() {
		if (!formats?.svg) return;
		setExporting('svg');
		setNotice(null);
		try {
			downloadIconSvg(prepareExportMarkup(), `kpf-icon-${toKebabCase(selected)}.svg`);
			setNotice({
				status: 'success',
				message: __('SVG downloaded.', 'kpf-core'),
			});
		} catch (err) {
			setNotice({
				status: 'error',
				message: err?.message || __('SVG export failed.', 'kpf-core'),
			});
		} finally {
			setExporting(null);
		}
	}

	async function handleExportPng() {
		if (!formats?.svg) return;
		setExporting('png');
		setNotice(null);
		try {
			await downloadIconPng(prepareExportMarkup(), `kpf-icon-${toKebabCase(selected)}.png`, 3);
			setNotice({
				status: 'success',
				message: __('PNG downloaded.', 'kpf-core'),
			});
		} catch (err) {
			setNotice({
				status: 'error',
				message: err?.message || __('PNG export failed.', 'kpf-core'),
			});
		} finally {
			setExporting(null);
		}
	}

	const previewSize = mode === 'configured' ? Number(config.size) || 20 : 48;
	const previewStroke = mode === 'configured' ? Number(config.strokeWidth) || 1.75 : 1.75;
	const previewColor = mode === 'configured' ? config.color || 'currentColor' : 'currentColor';
	// Lucide paths are designed for round caps/joins; other values jag arrow tips.
	const previewLinecap = 'round';
	const previewLinejoin = 'round';
	const previewPadding = mode === 'configured' ? normalizeCssBox(config.padding, '0') : '0';
	const previewMargin = mode === 'configured' ? normalizeCssBox(config.margin, '0') : '0';
	const previewClass = mode === 'configured'
		? normalizeClassName(config.className, selected).replace(/^\./, '')
		: 'kpf-icon';
	const hasPreviewMargin = mode === 'configured' && !isZeroBox(previewMargin);

	// Preview uses a framed wrapper for padding so Lucide’s width/height attrs
	// still fill the inset content box (SVG CSS padding is inconsistent across hosts).
	const previewCanvasStyle =
		mode === 'configured'
			? {
					width: `${previewSize}px`,
					height: `${previewSize}px`,
					padding: previewPadding,
					boxSizing: 'border-box',
					display: 'block',
					lineHeight: 0,
					overflow: 'hidden',
					color: previewColor,
				}
			: {
					width: `${previewSize}px`,
					height: `${previewSize}px`,
					boxSizing: 'border-box',
					display: 'block',
					lineHeight: 0,
					color: previewColor,
				};

	const previewSlotStyle = hasPreviewMargin ? { padding: previewMargin } : undefined;

	const previewProps =
		mode === 'configured'
			? {
					width: '100%',
					height: '100%',
					strokeWidth: previewStroke,
					color: 'currentColor',
					strokeLinecap: previewLinecap,
					strokeLinejoin: previewLinejoin,
					style: {
						width: '100%',
						height: '100%',
						display: 'block',
						overflow: 'visible',
					},
					'aria-hidden': true,
				}
			: {
					width: previewSize,
					height: previewSize,
					strokeWidth: previewStroke,
					color: 'currentColor',
					strokeLinecap: previewLinecap,
					strokeLinejoin: previewLinejoin,
					style: {
						width: `${previewSize}px`,
						height: `${previewSize}px`,
						display: 'block',
						color: previewColor,
					},
					'aria-hidden': true,
				};

	const previewTone =
		mode === 'configured' && isLightIconColor(previewColor) ? 'kpf-icons-preview--inverse' : '';

	const codePreview =
		copyFormat === 'svg'
			? formats?.svg
			: copyFormat === 'html'
				? formats?.html
				: copyFormat === 'react'
					? formats?.react
					: copyFormat === 'css'
						? formats?.css
						: formats?.reactDynamic;

	return (
		<div className="kpf-icons-shell">
			<header className="kpf-icons-header">
				<div>
					<p>{__('Design · Icons', 'kpf-core')}</p>
					<h1>{__('Icons', 'kpf-core')}</h1>
					<span>
						{__(
							'Browse the Lucide icon set, copy embed code, save a stylesheet class, or download SVG/PNG.',
							'kpf-core'
						)}
					</span>
				</div>
				<div className="kpf-icons-actions">
					{BOOT.stylesheetUrl ? (
						<Button variant="secondary" href={BOOT.stylesheetUrl}>
							{__('Open stylesheet', 'kpf-core')}
						</Button>
					) : null}
					{BOOT.tokensUrl ? (
						<Button variant="tertiary" href={BOOT.tokensUrl}>
							{__('Open tokens', 'kpf-core')}
						</Button>
					) : null}
				</div>
			</header>

			{notice ? (
				<Notice
					status={notice.status}
					isDismissible
					onRemove={() => setNotice(null)}
					className="kpf-icons-notice"
				>
					{notice.message}
				</Notice>
			) : null}

			<div className="kpf-icons-toolbar">
				<TextControl
					label={__('Search Lucide', 'kpf-core')}
					hideLabelFromVision
					placeholder={__('Search by name or keyword…', 'kpf-core')}
					value={query}
					onChange={setQuery}
					className="kpf-icons-search"
				/>
				<span className="kpf-icons-count">
					{sprintf(
						/* translators: 1: loaded count, 2: match count, 3: total icons */
						__('Loaded %1$d of %2$d matches (%3$d Lucide icons)', 'kpf-core'),
						visible.length,
						filtered.length,
						ICON_NAMES.length
					)}
					{category !== 'all'
						? sprintf(
								/* translators: %s: Lucide category title */
								__(' · Category: %s', 'kpf-core'),
								LUCIDE_CATEGORIES.find((c) => c.id === category)?.title || category
							)
						: ''}
				</span>
				<div
					className="kpf-icons-categories"
					role="toolbar"
					aria-label={__('Lucide categories', 'kpf-core')}
				>
					<button
						type="button"
						className={category === 'all' ? 'is-active' : undefined}
						aria-pressed={category === 'all'}
						onClick={() => setCategory('all')}
					>
						{__('All', 'kpf-core')}
						<span className="kpf-icons-categories__count">{categoryCounts.all || 0}</span>
					</button>
					{LUCIDE_CATEGORIES.map((cat) => {
						const CatIcon = Lucide[toPascalCase(cat.icon)] || null;
						const count = categoryCounts[cat.id] || 0;
						return (
							<button
								key={cat.id}
								type="button"
								className={category === cat.id ? 'is-active' : undefined}
								aria-pressed={category === cat.id}
								onClick={() => setCategory(cat.id)}
								title={cat.title}
							>
								{CatIcon ? (
									<span className="kpf-icons-categories__glyph" aria-hidden>
										<CatIcon size={14} strokeWidth={1.75} />
									</span>
								) : null}
								{cat.title}
								<span className="kpf-icons-categories__count">{count}</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="kpf-icons-layout">
				<div
					ref={gridRef}
					className="kpf-icons-grid"
					role="listbox"
					aria-label={__('Lucide icons', 'kpf-core')}
				>
					{visible.map((name) => {
						const Comp = Lucide[name];
						const active = name === selected;
						return (
							<button
								key={name}
								type="button"
								role="option"
								aria-selected={active}
								className={active ? 'is-active' : undefined}
								onClick={() => selectIcon(name)}
								title={name}
							>
								<span className="kpf-icons-grid__glyph">
									{Comp ? <Comp size={22} strokeWidth={1.75} aria-hidden /> : null}
								</span>
								<span className="kpf-icons-grid__label">{toKebabCase(name)}</span>
							</button>
						);
					})}
					{visible.length === 0 ? (
						<p className="kpf-icons-empty">{__('No icons match that search.', 'kpf-core')}</p>
					) : null}
					{hasMore ? (
						<div ref={sentinelRef} className="kpf-icons-sentinel" aria-hidden>
							<span>{__('Loading more icons…', 'kpf-core')}</span>
						</div>
					) : filtered.length > 0 ? (
						<p className="kpf-icons-empty kpf-icons-empty--end">
							{sprintf(
								/* translators: %d: number of icons */
								__('All %d matching Lucide icons loaded.', 'kpf-core'),
								filtered.length
							)}
						</p>
					) : null}
				</div>

				<aside className="kpf-icons-detail">
					<div className="kpf-icons-preview-block">
						<p className="kpf-icons-preview-label">{__('Live preview', 'kpf-core')}</p>
						<div className={`kpf-icons-preview ${previewTone}`.trim()} ref={previewRef}>
							<span
								className={`kpf-icons-preview__slot${hasPreviewMargin ? ' has-margin' : ''}`}
								style={previewSlotStyle}
							>
								<span
									className={`kpf-icons-preview__canvas${
										mode === 'configured' ? ` ${previewClass}` : ''
									}`}
									style={previewCanvasStyle}
								>
									{SelectedIcon ? <SelectedIcon {...previewProps} /> : null}
								</span>
							</span>
						</div>
						<ul className="kpf-icons-preview-props" aria-label={__('Applied properties', 'kpf-core')}>
							<li>
								<span>{__('Mode', 'kpf-core')}</span>
								<strong>
									{mode === 'configured'
										? __('Configured', 'kpf-core')
										: __('Simple (inherits parent)', 'kpf-core')}
								</strong>
							</li>
							<li>
								<span>{__('Canvas', 'kpf-core')}</span>
								<strong>{`${previewSize}×${previewSize}px`}</strong>
							</li>
							<li>
								<span>{__('Aspect', 'kpf-core')}</span>
								<strong>{iconRatio}</strong>
							</li>
							<li>
								<span>{__('Stroke', 'kpf-core')}</span>
								<strong>{previewStroke}</strong>
							</li>
							<li>
								<span>{__('Caps / join', 'kpf-core')}</span>
								<strong>{__('round (Lucide)', 'kpf-core')}</strong>
							</li>
							<li>
								<span>{__('Color', 'kpf-core')}</span>
								<strong className="kpf-icons-preview-props__color">
									<span
										className="kpf-icons-swatch"
										style={{
											background:
												previewColor === 'currentColor' ? '#12090a' : previewColor,
										}}
										aria-hidden
									/>
									{previewColor}
								</strong>
							</li>
							<li>
								<span>{__('Padding', 'kpf-core')}</span>
								<strong>{previewPadding}</strong>
							</li>
							<li>
								<span>{__('Margin', 'kpf-core')}</span>
								<strong>{previewMargin}</strong>
							</li>
							<li>
								<span>{__('Class', 'kpf-core')}</span>
								<strong>
									<code>.{previewClass}</code>
								</strong>
							</li>
						</ul>
					</div>
					<h2>{selected}</h2>
					<p className="kpf-icons-meta">
						<code>{toKebabCase(selected)}</code>
						{' · '}
						<span>{__('Lucide', 'kpf-core')}</span>
					</p>

					<div className="kpf-icons-mode">
						<ToggleControl
							label={__('Configured embed', 'kpf-core')}
							help={
								mode === 'configured'
									? __(
											'Bake stroke, color, spacing, and class into the Lucide snippet.',
											'kpf-core'
										)
									: __('Simple copy inherits color and size from the parent.', 'kpf-core')
							}
							checked={mode === 'configured'}
							onChange={(on) => setMode(on ? 'configured' : 'simple')}
						/>
					</div>

					{mode === 'configured' ? (
						<div className="kpf-icons-config">
							<TextControl
								label={__('Stroke weight', 'kpf-core')}
								help={__(
									'Lucide icons are drawn for round caps and joins — those stay locked so arrow tips stay smooth.',
									'kpf-core'
								)}
								type="number"
								step="0.05"
								min="0.5"
								max="4"
								value={String(config.strokeWidth)}
								onChange={(v) =>
									setConfig((c) => ({ ...c, strokeWidth: Number(v) || c.strokeWidth }))
								}
							/>
							<SelectControl
								label={__('Color', 'kpf-core')}
								value={
									COLOR_TOKENS.some((t) => t.value === config.color)
										? config.color
										: '__custom__'
								}
								options={[
									...COLOR_TOKENS.map((t) => ({ label: t.label, value: t.value })),
									{ label: __('Custom…', 'kpf-core'), value: '__custom__' },
								]}
								onChange={(color) =>
									setConfig((c) => ({
										...c,
										color: color === '__custom__' ? c.color || '#12090a' : color,
									}))
								}
							/>
							<TextControl
								label={__('Custom color', 'kpf-core')}
								help={__(
									'Hex, rgb(), or a CSS variable such as var(--kpf-color-icon-brand).',
									'kpf-core'
								)}
								value={config.color}
								onChange={(color) => setConfig((c) => ({ ...c, color }))}
							/>
							<TextControl
								label={__('Canvas size (px)', 'kpf-core')}
								help={__(
									'Outer box. Padding insets inside this canvas so the glyph scales down.',
									'kpf-core'
								)}
								type="number"
								min="12"
								max="128"
								value={String(config.size)}
								onChange={(v) => setConfig((c) => ({ ...c, size: Number(v) || c.size }))}
							/>
							<TextControl
								label={__('Padding', 'kpf-core')}
								help={__(
									'Insets the glyph inside the canvas. Use units (8px, 0.25rem) or a bare number (becomes px).',
									'kpf-core'
								)}
								value={config.padding}
								onChange={(padding) => setConfig((c) => ({ ...c, padding }))}
							/>
							<TextControl
								label={__('Margin', 'kpf-core')}
								help={__(
									'Space outside the canvas. Shown as the soft ring around the dashed box.',
									'kpf-core'
								)}
								value={config.margin}
								onChange={(margin) => setConfig((c) => ({ ...c, margin }))}
							/>
							<TextControl
								label={__('Class name', 'kpf-core')}
								help={__('Used when saving CSS to the stylesheet.', 'kpf-core')}
								value={config.className}
								onChange={(className) => setConfig((c) => ({ ...c, className }))}
							/>
						</div>
					) : null}

					<div className="kpf-icons-copy">
						<div className="kpf-icons-copy__tabs" role="tablist">
							{[
								{ id: 'svg', label: 'SVG' },
								{ id: 'html', label: 'HTML' },
								{ id: 'react', label: 'React' },
								{ id: 'reactDynamic', label: 'Icon.js' },
								{ id: 'css', label: 'CSS' },
							].map((tab) => (
								<button
									key={tab.id}
									type="button"
									role="tab"
									aria-selected={copyFormat === tab.id}
									className={copyFormat === tab.id ? 'is-active' : undefined}
									onClick={() => setCopyFormat(tab.id)}
								>
									{tab.label}
								</button>
							))}
						</div>
						<pre className="kpf-icons-code">{codePreview || '…'}</pre>
						<div className="kpf-icons-actions">
							<Button
								variant="primary"
								disabled={!formats}
								onClick={() => handleCopy(copyFormat)}
							>
								{__('Copy code', 'kpf-core')}
							</Button>
							<Button
								variant="secondary"
								isBusy={saving}
								disabled={!formats || saving || mode !== 'configured'}
								onClick={handleSaveClass}
							>
								{__('Add class to stylesheet', 'kpf-core')}
							</Button>
							<Button
								variant="tertiary"
								isBusy={exporting === 'svg'}
								disabled={!formats || Boolean(exporting)}
								onClick={handleExportSvg}
							>
								{__('Download SVG', 'kpf-core')}
							</Button>
							<Button
								variant="tertiary"
								isBusy={exporting === 'png'}
								disabled={!formats || Boolean(exporting)}
								onClick={handleExportPng}
							>
								{__('Download PNG', 'kpf-core')}
							</Button>
						</div>
					</div>
				</aside>
			</div>
		</div>
	);
}
