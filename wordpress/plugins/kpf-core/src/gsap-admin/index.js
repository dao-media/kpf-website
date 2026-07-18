import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	CheckboxControl,
	Notice,
	RangeControl,
	SelectControl,
	Spinner,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { createRoot, useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import './admin.scss';

gsap.registerPlugin(CustomEase, DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin);
apiFetch.use(apiFetch.createNonceMiddleware(window.kpfGsapAdmin?.nonce || ''));

const REST_BASE = (window.kpfGsapAdmin?.restBase || '/wp-json/kpf-interactions/v1').replace(/\/$/, '');

/** GSAP values stay as-is; labels are motion-friendly names for editors. */
const EASE_OPTIONS = [
	{ value: 'power1.out', label: __('Soft landing', 'kpf-core') },
	{ value: 'power2.out', label: __('Gentle landing', 'kpf-core') },
	{ value: 'power3.out', label: __('Sharp landing', 'kpf-core') },
	{ value: 'power4.out', label: __('Dramatic landing', 'kpf-core') },
	{ value: 'power2.inOut', label: __('Smooth both ends', 'kpf-core') },
	{ value: 'back.out(1.7)', label: __('Overshoot', 'kpf-core') },
	{ value: 'bounce.out', label: __('Bounce', 'kpf-core') },
	{ value: 'elastic.out(1, 0.3)', label: __('Spring', 'kpf-core') },
	{ value: 'circ.inOut', label: __('Circular arc', 'kpf-core') },
	{ value: 'expo.out', label: __('Explosive start', 'kpf-core') },
	{ value: 'none', label: __('Constant speed', 'kpf-core') },
	{ value: 'custom', label: __('Custom curve', 'kpf-core') },
];

function easeLabel(value) {
	return EASE_OPTIONS.find((option) => option.value === value)?.label || value;
}

const PROPERTY_FIELDS = [
	{ key: 'x', label: __('Move X', 'kpf-core'), unit: 'px' },
	{ key: 'y', label: __('Move Y', 'kpf-core'), unit: 'px' },
	{ key: 'scale', label: __('Scale', 'kpf-core'), step: 0.05 },
	{ key: 'rotation', label: __('Rotate', 'kpf-core'), unit: '°' },
	{ key: 'skewX', label: __('Skew X', 'kpf-core'), unit: '°' },
	{ key: 'opacity', label: __('Opacity', 'kpf-core'), step: 0.05 },
];

function defaults() {
	return {
		version: 1,
		active: true,
		selector: '.animate-me',
		trigger: 'load',
		method: 'from',
		duration: 0.8,
		delay: 0,
		ease: 'power2.out',
		customBezier: '0.25,0.1,0.25,1',
		stagger: 0,
		repeat: 0,
		yoyo: false,
		from: { y: 28, autoAlpha: 0 },
		to: { y: 0, autoAlpha: 1 },
		keyframes: [],
		svg: {
			effect: 'none',
			drawFrom: '0% 0%',
			drawTo: '0% 100%',
			morphTarget: '',
			pathSelector: '',
			autoRotate: false,
			transformOrigin: '50% 50%',
		},
		scroll: { start: 'top 85%', end: 'bottom 20%', scrub: 0, once: true },
	};
}

function newAnimation() {
	return { id: 0, name: __('New animation', 'kpf-core'), config: defaults() };
}

function normalize(animation) {
	const base = defaults();
	return {
		...animation,
		config: {
			...base,
			...(animation?.config || {}),
			from: { ...base.from, ...(animation?.config?.from || {}) },
			to: { ...base.to, ...(animation?.config?.to || {}) },
			svg: { ...base.svg, ...(animation?.config?.svg || {}) },
			scroll: { ...base.scroll, ...(animation?.config?.scroll || {}) },
			keyframes: Array.isArray(animation?.config?.keyframes) ? animation.config.keyframes : [],
		},
	};
}

function PropertyGrid({ title, values, onChange }) {
	return (
		<fieldset className="kpf-motion-properties">
			<legend>{title}</legend>
			<div className="kpf-property-grid">
				{PROPERTY_FIELDS.map((field) => (
					<label key={field.key}>
						<span>{field.label}</span>
						<div>
							<input
								type="number"
								step={field.step || 1}
								value={values?.[field.key] ?? ''}
								placeholder="—"
								onChange={(event) =>
									onChange({
										...values,
										[field.key]: event.target.value === '' ? '' : Number(event.target.value),
									})
								}
							/>
							{field.unit ? <small>{field.unit}</small> : null}
						</div>
					</label>
				))}
			</div>
		</fieldset>
	);
}

function clamp(value, min, max) {
	return Math.min(max, Math.max(min, value));
}

function parseBezier(value) {
	const points = String(value || '0.25,0.1,0.25,1')
		.split(',')
		.map((item) => Number(item.trim()));
	while (points.length < 4) points.push(0);
	return [
		clamp(Number.isFinite(points[0]) ? points[0] : 0.25, 0, 1),
		clamp(Number.isFinite(points[1]) ? points[1] : 0.1, -2, 2),
		clamp(Number.isFinite(points[2]) ? points[2] : 0.25, 0, 1),
		clamp(Number.isFinite(points[3]) ? points[3] : 1, -2, 2),
	];
}

function BezierEditor({ value, onChange }) {
	const svgRef = useRef(null);
	const dragRef = useRef(null);
	const pointsRef = useRef(parseBezier(value));
	const onChangeRef = useRef(onChange);
	const [dragging, setDragging] = useState(null);
	const points = parseBezier(value);
	pointsRef.current = points;
	onChangeRef.current = onChange;
	const [x1, y1, x2, y2] = points;

	const commitPoints = (next) => {
		onChangeRef.current(
			[
				clamp(next[0], 0, 1),
				clamp(next[1], -2, 2),
				clamp(next[2], 0, 1),
				clamp(next[3], -2, 2),
			]
				.map((point) => Number(point.toFixed(3)))
				.join(',')
		);
	};

	const setPoint = (index, next) => {
		const updated = points.slice();
		updated[index] = Number(next);
		commitPoints(updated);
	};

	useEffect(() => {
		function clientToBezier(clientX, clientY) {
			const svg = svgRef.current;
			if (!svg) return null;
			const point = svg.createSVGPoint();
			point.x = clientX;
			point.y = clientY;
			const matrix = svg.getScreenCTM();
			if (!matrix) return null;
			const local = point.matrixTransform(matrix.inverse());
			return {
				x: clamp((local.x - 10) / 120, 0, 1),
				y: clamp((110 - local.y) / 100, -2, 2),
			};
		}

		function onPointerMove(event) {
			const handle = dragRef.current;
			if (handle === null) return;
			const next = clientToBezier(event.clientX, event.clientY);
			if (!next) return;
			event.preventDefault();
			const updated = pointsRef.current.slice();
			if (handle === 0) {
				updated[0] = next.x;
				updated[1] = next.y;
			} else {
				updated[2] = next.x;
				updated[3] = next.y;
			}
			commitPoints(updated);
		}

		function onPointerUp() {
			dragRef.current = null;
			setDragging(null);
		}

		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('pointercancel', onPointerUp);
		return () => {
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('pointercancel', onPointerUp);
		};
	}, []);

	const startDrag = (handle) => (event) => {
		event.preventDefault();
		event.stopPropagation();
		dragRef.current = handle;
		setDragging(handle);
	};

	const hx1 = 10 + x1 * 120;
	const hy1 = 110 - y1 * 100;
	const hx2 = 10 + x2 * 120;
	const hy2 = 110 - y2 * 100;
	const path = `M 10 110 C ${hx1} ${hy1}, ${hx2} ${hy2}, 130 10`;

	return (
		<div className={`kpf-bezier-editor${dragging !== null ? ' is-dragging' : ''}`}>
			<div className="kpf-bezier-graph">
				<svg
					ref={svgRef}
					viewBox="0 0 140 120"
					role="img"
					aria-label={__('Custom easing curve. Drag the handles to reshape the motion.', 'kpf-core')}
				>
					<path className="kpf-bezier-grid" d="M10 10V110H130" />
					<line x1="10" y1="110" x2={hx1} y2={hy1} />
					<line x1="130" y1="10" x2={hx2} y2={hy2} />
					<path className="kpf-bezier-curve" d={path} />
					{[
						{ handle: 0, cx: hx1, cy: hy1, label: __('Start handle', 'kpf-core') },
						{ handle: 1, cx: hx2, cy: hy2, label: __('End handle', 'kpf-core') },
					].map(({ handle, cx, cy, label }) => (
						<g
							key={handle}
							className={`kpf-bezier-handle${dragging === handle ? ' is-active' : ''}`}
							onPointerDown={startDrag(handle)}
							style={{ cursor: dragging === handle ? 'grabbing' : 'grab' }}
						>
							<circle className="kpf-bezier-handle-hit" cx={cx} cy={cy} r="12" />
							<circle className="kpf-bezier-handle-knob" cx={cx} cy={cy} r="5" />
							<title>{label}</title>
						</g>
					))}
				</svg>
				<p className="kpf-bezier-hint">
					{__('Drag the orange handles to reshape the curve.', 'kpf-core')}
				</p>
			</div>
			<div className="kpf-bezier-inputs">
				{[
					{ label: __('Start X', 'kpf-core'), index: 0 },
					{ label: __('Start Y', 'kpf-core'), index: 1 },
					{ label: __('End X', 'kpf-core'), index: 2 },
					{ label: __('End Y', 'kpf-core'), index: 3 },
				].map(({ label, index }) => (
					<label key={label}>
						<span>{label}</span>
						<input
							type="number"
							step="0.05"
							min={index % 2 === 0 ? 0 : -2}
							max={index % 2 === 0 ? 1 : 2}
							value={points[index]}
							onChange={(event) => setPoint(index, event.target.value)}
						/>
					</label>
				))}
			</div>
			<code>cubic-bezier({value})</code>
		</div>
	);
}

function KeyframeEditor({ frames, onChange }) {
	function update(index, patch) {
		onChange(frames.map((frame, frameIndex) => (frameIndex === index ? { ...frame, ...patch } : frame)));
	}
	function move(index, direction) {
		const target = index + direction;
		if (target < 0 || target >= frames.length) return;
		const next = frames.slice();
		[next[index], next[target]] = [next[target], next[index]];
		onChange(next);
	}

	return (
		<div className="kpf-keyframes">
			<div className="kpf-section-heading">
				<div>
					<h3>{__('Keyframe sequence', 'kpf-core')}</h3>
					<p>{__('Build a multi-step timeline. Each frame begins after the previous frame.', 'kpf-core')}</p>
				</div>
				<Button
					variant="secondary"
					onClick={() =>
						onChange([
							...frames,
							{ duration: 0.5, ease: 'power1.out', props: { x: 0, y: 0, scale: 1, opacity: 1 } },
						])
					}
					disabled={frames.length >= 12}
				>
					{__('Add keyframe', 'kpf-core')}
				</Button>
			</div>
			{frames.length === 0 ? (
				<div className="kpf-empty-keyframes">
					<strong>{__('No keyframes yet', 'kpf-core')}</strong>
					<span>{__('Add at least two frames to create a sequence.', 'kpf-core')}</span>
				</div>
			) : null}
			{frames.map((frame, index) => (
				<article className="kpf-keyframe-card" key={`frame-${index}`}>
					<header>
						<span className="kpf-keyframe-number">{index + 1}</span>
						<strong>{sprintf(__('Keyframe %d', 'kpf-core'), index + 1)}</strong>
						<div>
							<button type="button" onClick={() => move(index, -1)} disabled={index === 0}>↑</button>
							<button type="button" onClick={() => move(index, 1)} disabled={index === frames.length - 1}>↓</button>
							<button
								type="button"
								className="is-destructive"
								onClick={() => onChange(frames.filter((_, frameIndex) => frameIndex !== index))}
							>
								×
							</button>
						</div>
					</header>
					<div className="kpf-keyframe-timing">
						<TextControl
							label={__('Duration (seconds)', 'kpf-core')}
							type="number"
							min="0.01"
							step="0.05"
							value={frame.duration}
							onChange={(value) => update(index, { duration: Number(value) })}
						/>
						<SelectControl
							label={__('Ease', 'kpf-core')}
							value={frame.ease}
							options={EASE_OPTIONS.filter((ease) => ease.value !== 'custom')}
							onChange={(ease) => update(index, { ease })}
						/>
					</div>
					<PropertyGrid
						title={__('Frame properties', 'kpf-core')}
						values={frame.props || {}}
						onChange={(props) => update(index, { props })}
					/>
				</article>
			))}
		</div>
	);
}

function SvgEditor({ value, onChange }) {
	const svg = { ...defaults().svg, ...(value || {}) };
	const update = (patch) => onChange({ ...svg, ...patch });

	return (
		<div className="kpf-svg-editor">
			<div className="kpf-section-heading">
				<div>
					<h3>{__('Animate SVG artwork', 'kpf-core')}</h3>
					<p>
						{__(
							'Target paths and shapes inside an uploaded SVG design. Core transforms work automatically; these effects add drawing, morphing, and motion paths.',
							'kpf-core'
						)}
					</p>
				</div>
			</div>
			<SelectControl
				label={__('SVG effect', 'kpf-core')}
				value={svg.effect}
				options={[
					{ label: __('Core transforms only', 'kpf-core'), value: 'none' },
					{ label: __('Draw a stroke', 'kpf-core'), value: 'draw' },
					{ label: __('Morph into another shape', 'kpf-core'), value: 'morph' },
					{ label: __('Follow a motion path', 'kpf-core'), value: 'motionPath' },
				]}
				onChange={(effect) => update({ effect })}
			/>
			<TextControl
				label={__('Transform origin', 'kpf-core')}
				help={__('Examples: 50% 50%, left center, or 120 80 for SVG coordinates.', 'kpf-core')}
				value={svg.transformOrigin}
				onChange={(transformOrigin) => update({ transformOrigin })}
			/>
			{svg.effect === 'draw' ? (
				<div className="kpf-svg-effect-fields">
					<TextControl
						label={__('Visible stroke at start', 'kpf-core')}
						help={__('Use a range such as 0% 0% or 20% 40%.', 'kpf-core')}
						value={svg.drawFrom}
						onChange={(drawFrom) => update({ drawFrom })}
					/>
					<TextControl
						label={__('Visible stroke at end', 'kpf-core')}
						value={svg.drawTo}
						onChange={(drawTo) => update({ drawTo })}
					/>
				</div>
			) : null}
			{svg.effect === 'morph' ? (
				<TextControl
					label={__('Destination shape selector', 'kpf-core')}
					help={__('Target another path in the same SVG, for example #heart-shape.', 'kpf-core')}
					value={svg.morphTarget}
					onChange={(morphTarget) => update({ morphTarget })}
				/>
			) : null}
			{svg.effect === 'motionPath' ? (
				<>
					<TextControl
						label={__('Motion path selector', 'kpf-core')}
						help={__('Target a path in the same SVG, for example #orbit-path.', 'kpf-core')}
						value={svg.pathSelector}
						onChange={(pathSelector) => update({ pathSelector })}
					/>
					<ToggleControl
						label={__('Rotate target to follow the path', 'kpf-core')}
						checked={svg.autoRotate}
						onChange={(autoRotate) => update({ autoRotate })}
					/>
				</>
			) : null}
			<div className="kpf-svg-guidance">
				<strong>{__('How to target SVG elements', 'kpf-core')}</strong>
				<p>
					{__(
						'Give a path or group an ID/class in the SVG source, then use that selector in Target & trigger. Keep a visible stroke on paths that use DrawSVG.',
						'kpf-core'
					)}
				</p>
			</div>
		</div>
	);
}

function Sidebar({ animations, selectedId, filter, onFilter, onSelect, onCreate, onToggle }) {
	const [query, setQuery] = useState('');
	const visible = animations.filter((animation) => {
		if (filter === 'active' && !animation.active) return false;
		if (filter === 'inactive' && animation.active) return false;
		const needle = query.trim().toLowerCase();
		return !needle || `${animation.name} ${animation.selector}`.toLowerCase().includes(needle);
	});

	return (
		<aside className="kpf-animation-sidebar">
			<div className="kpf-animation-sidebar-header">
				<div>
					<p>{__('Interaction library', 'kpf-core')}</p>
					<h2>{__('Animations', 'kpf-core')}</h2>
				</div>
				<Button
					variant="primary"
					onClick={onCreate}
					aria-label={__('Create animation', 'kpf-core')}
				>
					<span className="kpf-add-icon" aria-hidden="true" />
				</Button>
			</div>
			<input
				type="search"
				value={query}
				onChange={(event) => setQuery(event.target.value)}
				placeholder={__('Search animations…', 'kpf-core')}
				aria-label={__('Search animations', 'kpf-core')}
			/>
			<div className="kpf-animation-filters">
				{['all', 'active', 'inactive'].map((value) => (
					<button
						type="button"
						className={filter === value ? 'is-active' : ''}
						onClick={() => onFilter(value)}
						key={value}
					>
						{value === 'all'
							? __('All', 'kpf-core')
							: value === 'active'
								? __('Active', 'kpf-core')
								: __('Inactive', 'kpf-core')}
					</button>
				))}
			</div>
			<div className="kpf-animation-list">
				{visible.length === 0 ? (
					<p className="kpf-animation-empty">{__('No animations in this view.', 'kpf-core')}</p>
				) : null}
				{visible.map((animation) => (
					<button
						type="button"
						className={`kpf-animation-list-item ${selectedId === animation.id ? 'is-selected' : ''}`}
						onClick={() => onSelect(animation)}
						key={animation.id}
					>
						<span className={`kpf-animation-status-dot ${animation.active ? 'is-active' : ''}`} />
						<span>
							<strong>{animation.name}</strong>
							<code>{animation.selector || __('No selector', 'kpf-core')}</code>
						</span>
						<input
							type="checkbox"
							checked={animation.active}
							onChange={(event) => onToggle(animation, event.target.checked)}
							onClick={(event) => event.stopPropagation()}
							aria-label={sprintf(__('Toggle %s', 'kpf-core'), animation.name)}
						/>
					</button>
				))}
			</div>
			<footer>
				<span><i className="is-live" /> {animations.filter((item) => item.active).length} {__('active', 'kpf-core')}</span>
				<span><i /> {animations.filter((item) => !item.active).length} {__('inactive', 'kpf-core')}</span>
			</footer>
		</aside>
	);
}

function Builder({ animation, onSaved, onDeleted }) {
	const [draft, setDraft] = useState(normalize(animation));
	const [tab, setTab] = useState('target');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState('');
	const [notice, setNotice] = useState('');
	const previewRef = useRef(null);
	const previewSvgRef = useRef(null);
	const previewMorphRef = useRef(null);
	const previewPathRef = useRef(null);
	const tweenRef = useRef(null);

	useEffect(() => {
		setDraft(normalize(animation));
		setError('');
		setNotice('');
	}, [animation]);

	const config = draft.config;
	const dirty = JSON.stringify(draft) !== JSON.stringify(normalize(animation));

	function updateConfig(patch) {
		setDraft((current) => ({ ...current, config: { ...current.config, ...patch } }));
	}

	function preview() {
		const svgEffect = config.svg?.effect || 'none';
		const target = svgEffect === 'none' ? previewRef.current : previewSvgRef.current;
		if (!target) return;
		tweenRef.current?.kill();
		gsap.set(target, { clearProps: 'all' });
		const ease =
			config.ease === 'custom'
				? CustomEase.create(`kpf-preview-${Date.now()}`, config.customBezier)
				: config.ease;
		const common = {
			duration: config.duration,
			delay: 0,
			ease,
			repeat: config.repeat,
			yoyo: config.yoyo,
		};
		if (svgEffect === 'draw') {
			tweenRef.current = gsap.fromTo(
				target,
				{ drawSVG: config.svg.drawFrom },
				{ drawSVG: config.svg.drawTo, transformOrigin: config.svg.transformOrigin, ...common }
			);
			return;
		}
		if (svgEffect === 'morph') {
			tweenRef.current = gsap.to(target, {
				morphSVG: { shape: previewMorphRef.current, type: 'rotational' },
				transformOrigin: config.svg.transformOrigin,
				...common,
			});
			return;
		}
		if (svgEffect === 'motionPath') {
			tweenRef.current = gsap.to(target, {
				motionPath: {
					path: previewPathRef.current,
					align: previewPathRef.current,
					alignOrigin: [0.5, 0.5],
					autoRotate: config.svg.autoRotate,
				},
				...common,
			});
			return;
		}
		if (config.method === 'fromTo') {
			tweenRef.current = gsap.fromTo(target, config.from, { ...config.to, ...common });
		} else if (config.method === 'to') {
			tweenRef.current = gsap.to(target, { ...config.to, ...common });
		} else if (config.method === 'keyframes') {
			tweenRef.current = gsap.to(target, {
				keyframes: config.keyframes.map((frame) => ({
					...frame.props,
					duration: frame.duration,
					ease: frame.ease,
				})),
				repeat: config.repeat,
				yoyo: config.yoyo,
			});
		} else {
			tweenRef.current = gsap.from(target, { ...config.from, ...common });
		}
	}

	async function save() {
		if (!draft.name.trim()) {
			setError(__('Give this animation a name.', 'kpf-core'));
			return;
		}
		try {
			document.querySelector(config.selector);
		} catch {
			setError(__('Enter a valid CSS selector, such as .hero-title or #donate-button.', 'kpf-core'));
			return;
		}
		if (!config.selector.trim()) {
			setError(__('Add a CSS selector to target.', 'kpf-core'));
			return;
		}
		if (config.method === 'keyframes' && config.keyframes.length < 2) {
			setError(__('Keyframe animations need at least two frames.', 'kpf-core'));
			return;
		}

		setSaving(true);
		setError('');
		setNotice('');
		try {
			const result = await apiFetch({
				url: draft.id
					? `${REST_BASE}/animations/${draft.id}`
					: `${REST_BASE}/animations`,
				method: 'POST',
				data: { name: draft.name, config },
			});
			setDraft(normalize(result));
			onSaved(result);
			setNotice(__('Animation saved and published to the frontend.', 'kpf-core'));
		} catch (err) {
			setError(err?.message || __('Could not save this animation.', 'kpf-core'));
		} finally {
			setSaving(false);
		}
	}

	async function remove() {
		if (!draft.id || !window.confirm(__('Delete this animation permanently?', 'kpf-core'))) return;
		setSaving(true);
		try {
			await apiFetch({ url: `${REST_BASE}/animations/${draft.id}`, method: 'DELETE' });
			onDeleted(draft.id);
		} catch (err) {
			setError(err?.message || __('Could not delete this animation.', 'kpf-core'));
			setSaving(false);
		}
	}

	const tabs = [
		['target', __('Target & trigger', 'kpf-core')],
		['motion', __('Motion', 'kpf-core')],
		['timing', __('Timing & easing', 'kpf-core')],
		['keyframes', __('Keyframes', 'kpf-core')],
		['svg', __('SVG', 'kpf-core')],
	];

	return (
		<main className="kpf-animation-builder">
			<header className="kpf-builder-header">
				<div>
					<p>{draft.id ? __('Editing interaction', 'kpf-core') : __('New interaction', 'kpf-core')}</p>
					<input
						value={draft.name}
						onChange={(event) => setDraft({ ...draft, name: event.target.value })}
						aria-label={__('Animation name', 'kpf-core')}
					/>
					<span className={dirty ? 'is-dirty' : ''}>
						{dirty ? __('Unsaved changes', 'kpf-core') : __('Saved', 'kpf-core')}
					</span>
				</div>
				<div>
					<ToggleControl
						label={config.active ? __('Active', 'kpf-core') : __('Inactive', 'kpf-core')}
						checked={config.active}
						onChange={(active) => updateConfig({ active })}
					/>
					{draft.id ? (
						<Button variant="tertiary" isDestructive onClick={remove} disabled={saving}>
							{__('Delete', 'kpf-core')}
						</Button>
					) : null}
					<Button variant="primary" onClick={save} isBusy={saving} disabled={saving}>
						{draft.id ? __('Save animation', 'kpf-core') : __('Create animation', 'kpf-core')}
					</Button>
				</div>
			</header>

			{error ? <Notice status="error" onRemove={() => setError('')}>{error}</Notice> : null}
			{notice ? <Notice status="success" onRemove={() => setNotice('')}>{notice}</Notice> : null}

			<div className="kpf-builder-body">
				<section className="kpf-builder-controls">
					<nav className="kpf-builder-tabs" aria-label={__('Animation settings', 'kpf-core')}>
						{tabs.map(([value, label]) => (
							<button
								type="button"
								className={tab === value ? 'is-active' : ''}
								onClick={() => setTab(value)}
								key={value}
							>
								{label}
							</button>
						))}
					</nav>

					<div className="kpf-builder-panel">
						{tab === 'target' ? (
							<>
								<div className="kpf-section-heading">
									<div>
										<h3>{__('Choose what moves', 'kpf-core')}</h3>
										<p>{__('Attach this interaction to any CSS class, ID, or data attribute.', 'kpf-core')}</p>
									</div>
								</div>
								<TextControl
									label={__('CSS selector', 'kpf-core')}
									help={__('Examples: .hero-title, #donate-button, [data-animate=\"card\"]', 'kpf-core')}
									value={config.selector}
									onChange={(selector) => updateConfig({ selector })}
								/>
								<SelectControl
									label={__('Starts when', 'kpf-core')}
									value={config.trigger}
									options={[
										{ label: __('Page loads', 'kpf-core'), value: 'load' },
										{ label: __('Element enters the viewport', 'kpf-core'), value: 'in-view' },
										{ label: __('Pointer hovers over element', 'kpf-core'), value: 'hover' },
										{ label: __('Element is clicked', 'kpf-core'), value: 'click' },
									]}
									onChange={(trigger) => updateConfig({ trigger })}
								/>
								{config.trigger === 'in-view' ? (
									<div className="kpf-scroll-settings">
										<TextControl
											label={__('Scroll start', 'kpf-core')}
											value={config.scroll.start}
											onChange={(start) => updateConfig({ scroll: { ...config.scroll, start } })}
										/>
										<TextControl
											label={__('Scroll end', 'kpf-core')}
											value={config.scroll.end}
											onChange={(end) => updateConfig({ scroll: { ...config.scroll, end } })}
										/>
										<RangeControl
											label={__('Scroll scrub (0 = play once)', 'kpf-core')}
											min={0}
											max={3}
											step={0.1}
											value={config.scroll.scrub}
											onChange={(scrub) => updateConfig({ scroll: { ...config.scroll, scrub } })}
										/>
										<CheckboxControl
											label={__('Run only once', 'kpf-core')}
											checked={config.scroll.once}
											onChange={(once) => updateConfig({ scroll: { ...config.scroll, once } })}
										/>
									</div>
								) : null}
							</>
						) : null}

						{tab === 'motion' ? (
							<>
								<div className="kpf-section-heading">
									<div>
										<h3>{__('Build the movement', 'kpf-core')}</h3>
										<p>{__('Transforms and opacity stay smooth and GPU-friendly.', 'kpf-core')}</p>
									</div>
								</div>
								<SelectControl
									label={__('Animation model', 'kpf-core')}
									value={config.method}
									options={[
										{ label: __('Entrance — animate from a starting state', 'kpf-core'), value: 'from' },
										{ label: __('Exit/change — animate to an ending state', 'kpf-core'), value: 'to' },
										{ label: __('From → To — define both states', 'kpf-core'), value: 'fromTo' },
										{ label: __('Keyframe sequence', 'kpf-core'), value: 'keyframes' },
									]}
									onChange={(method) => updateConfig({ method })}
								/>
								{config.method !== 'keyframes' && config.method !== 'to' ? (
									<PropertyGrid
										title={__('Starting state', 'kpf-core')}
										values={config.from}
										onChange={(from) => updateConfig({ from })}
									/>
								) : null}
								{config.method !== 'keyframes' && config.method !== 'from' ? (
									<PropertyGrid
										title={__('Ending state', 'kpf-core')}
										values={config.to}
										onChange={(to) => updateConfig({ to })}
									/>
								) : null}
								{config.method === 'keyframes' ? (
									<Button variant="secondary" onClick={() => setTab('keyframes')}>
										{__('Open keyframe editor', 'kpf-core')}
									</Button>
								) : null}
							</>
						) : null}

						{tab === 'timing' ? (
							<>
								<div className="kpf-section-heading">
									<div>
										<h3>{__('Shape the timing', 'kpf-core')}</h3>
										<p>{__('Control speed, sequencing, repeats, and the feel of acceleration.', 'kpf-core')}</p>
									</div>
								</div>
								<div className="kpf-timing-grid">
									<TextControl
										label={__('Duration (seconds)', 'kpf-core')}
										type="number"
										min="0.01"
										step="0.05"
										value={config.duration}
										onChange={(duration) => updateConfig({ duration: Number(duration) })}
									/>
									<TextControl
										label={__('Delay (seconds)', 'kpf-core')}
										type="number"
										min="0"
										step="0.05"
										value={config.delay}
										onChange={(delay) => updateConfig({ delay: Number(delay) })}
									/>
									<TextControl
										label={__('Stagger multiple matches', 'kpf-core')}
										type="number"
										min="0"
										step="0.05"
										value={config.stagger}
										onChange={(stagger) => updateConfig({ stagger: Number(stagger) })}
									/>
									<TextControl
										label={__('Repeat count (-1 = forever)', 'kpf-core')}
										type="number"
										min="-1"
										max="20"
										value={config.repeat}
										onChange={(repeat) => updateConfig({ repeat: Number(repeat) })}
									/>
								</div>
								<ToggleControl
									label={__('Yoyo — reverse on every repeat', 'kpf-core')}
									checked={config.yoyo}
									onChange={(yoyo) => updateConfig({ yoyo })}
								/>
								<SelectControl
									label={__('Easing', 'kpf-core')}
									help={__(
										'Landing = slows into place. Overshoot/Bounce/Spring add personality. Custom curve lets you drag the handles.',
										'kpf-core'
									)}
									value={config.ease}
									options={EASE_OPTIONS}
									onChange={(ease) => updateConfig({ ease })}
								/>
								{config.ease === 'custom' ? (
									<BezierEditor
										value={config.customBezier}
										onChange={(customBezier) => updateConfig({ customBezier })}
									/>
								) : null}
							</>
						) : null}

						{tab === 'keyframes' ? (
							<KeyframeEditor
								frames={config.keyframes}
								onChange={(keyframes) => updateConfig({ keyframes, method: 'keyframes' })}
							/>
						) : null}

						{tab === 'svg' ? (
							<SvgEditor value={config.svg} onChange={(svg) => updateConfig({ svg })} />
						) : null}
					</div>
				</section>

				<aside className="kpf-preview-panel">
					<header>
						<div>
							<p>{__('Live preview', 'kpf-core')}</p>
							<h3>{__('Motion stage', 'kpf-core')}</h3>
						</div>
						<Button variant="secondary" onClick={preview}>{__('Replay', 'kpf-core')}</Button>
					</header>
					<div className="kpf-preview-stage">
						<div className="kpf-preview-grid" />
						<div
							className="kpf-preview-target"
							ref={previewRef}
							hidden={config.svg?.effect !== 'none'}
						>
							<span>{__('Preview target', 'kpf-core')}</span>
							<code>{config.selector || '.animate-me'}</code>
						</div>
						<svg
							className="kpf-preview-svg"
							viewBox="0 0 260 180"
							hidden={config.svg?.effect === 'none'}
							aria-label={__('SVG animation preview', 'kpf-core')}
						>
							<path
								ref={previewPathRef}
								className="kpf-preview-motion-path"
								d="M28 132 C70 18 188 18 232 132"
							/>
							<path
								ref={previewMorphRef}
								className="kpf-preview-morph-shape"
								d="M130 42 C158 8 222 28 218 82 C214 128 166 151 130 166 C94 151 46 128 42 82 C38 28 102 8 130 42 Z"
							/>
							<path
								ref={previewSvgRef}
								className="kpf-preview-svg-target"
								d="M55 118 C76 38 184 38 205 118 C174 96 86 96 55 118 Z"
							/>
						</svg>
					</div>
					<div className="kpf-preview-summary">
						<div><span>{__('Trigger', 'kpf-core')}</span><strong>{config.trigger}</strong></div>
						<div><span>{__('Model', 'kpf-core')}</span><strong>{config.method}</strong></div>
						<div><span>{__('Duration', 'kpf-core')}</span><strong>{config.duration}s</strong></div>
						<div><span>{__('Ease', 'kpf-core')}</span><strong>{easeLabel(config.ease)}</strong></div>
					</div>
					<p className="kpf-motion-accessibility">
						<span>◐</span>
						{__('Frontend animations automatically respect reduced-motion preferences.', 'kpf-core')}
					</p>
				</aside>
			</div>
		</main>
	);
}

function App() {
	const [animations, setAnimations] = useState([]);
	const [selected, setSelected] = useState(null);
	const [filter, setFilter] = useState('all');
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState('');

	useEffect(() => {
		apiFetch({ url: `${REST_BASE}/animations` })
			.then((response) => {
				const items = response.animations || [];
				setAnimations(items);
				setSelected(items[0] || newAnimation());
			})
			.catch((err) => setError(err?.message || __('Could not load animations.', 'kpf-core')))
			.finally(() => setLoading(false));
	}, []);

	function upsert(animation) {
		setAnimations((current) => {
			const exists = current.some((item) => item.id === animation.id);
			return exists
				? current.map((item) => (item.id === animation.id ? animation : item))
				: [animation, ...current];
		});
		setSelected(animation);
	}

	async function toggle(animation, active) {
		const optimistic = { ...animation, active, config: { ...animation.config, active } };
		upsert(optimistic);
		try {
			const saved = await apiFetch({
				url: `${REST_BASE}/animations/${animation.id}`,
				method: 'POST',
				data: { name: animation.name, config: optimistic.config },
			});
			upsert(saved);
		} catch (err) {
			upsert(animation);
			setError(err?.message || __('Could not update animation status.', 'kpf-core'));
		}
	}

	if (loading) return <div className="kpf-gsap-loading"><Spinner /></div>;

	return (
		<div className="kpf-gsap-shell">
			<div className="kpf-gsap-title">
				<div>
					<p>{__('Interactions', 'kpf-core')}</p>
					<h1>{__('GSAP Animation Builder', 'kpf-core')}</h1>
				</div>
				<span>{__('GSAP installed', 'kpf-core')} <i /></span>
			</div>
			{error ? <Notice status="error" onRemove={() => setError('')}>{error}</Notice> : null}
			<div className="kpf-gsap-workspace">
				<Sidebar
					animations={animations}
					selectedId={selected?.id}
					filter={filter}
					onFilter={setFilter}
					onSelect={setSelected}
					onCreate={() => setSelected(newAnimation())}
					onToggle={toggle}
				/>
				{selected ? (
					<Builder
						key={selected.id || 'new'}
						animation={selected}
						onSaved={upsert}
						onDeleted={(id) => {
							const remaining = animations.filter((item) => item.id !== id);
							setAnimations(remaining);
							setSelected(remaining[0] || newAnimation());
						}}
					/>
				) : null}
			</div>
		</div>
	);
}

const root = document.getElementById('kpf-gsap-admin-root');
if (root) createRoot(root).render(<App />);
