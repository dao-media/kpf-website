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
import { CSSRulePlugin } from 'gsap/CSSRulePlugin';
import { CustomBounce } from 'gsap/CustomBounce';
import { CustomEase } from 'gsap/CustomEase';
import { CustomWiggle } from 'gsap/CustomWiggle';
import { Draggable } from 'gsap/Draggable';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { EasePack, ExpoScaleEase, RoughEase, SlowMo } from 'gsap/EasePack';
import { Flip } from 'gsap/Flip';
import { GSDevTools } from 'gsap/GSDevTools';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { MotionPathHelper } from 'gsap/MotionPathHelper';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { Observer } from 'gsap/Observer';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import { PhysicsPropsPlugin } from 'gsap/PhysicsPropsPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { TextPlugin } from 'gsap/TextPlugin';
import './admin.scss';

gsap.registerPlugin(
	CSSRulePlugin,
	CustomBounce,
	CustomEase,
	CustomWiggle,
	Draggable,
	DrawSVGPlugin,
	EasePack,
	ExpoScaleEase,
	Flip,
	GSDevTools,
	InertiaPlugin,
	MorphSVGPlugin,
	MotionPathHelper,
	MotionPathPlugin,
	Observer,
	Physics2DPlugin,
	PhysicsPropsPlugin,
	RoughEase,
	ScrambleTextPlugin,
	ScrollSmoother,
	ScrollToPlugin,
	ScrollTrigger,
	SlowMo,
	SplitText,
	TextPlugin
);
apiFetch.use(apiFetch.createNonceMiddleware(window.kpfGsapAdmin?.nonce || ''));

const REST_BASE = (window.kpfGsapAdmin?.restBase || '/wp-json/kpf-interactions/v1').replace(/\/$/, '');

const PREMIUM_PLUGINS = [
	'CSSRulePlugin',
	'CustomBounce',
	'CustomEase',
	'CustomWiggle',
	'Draggable',
	'DrawSVGPlugin',
	'EasePack',
	'Flip',
	'GSDevTools',
	'InertiaPlugin',
	'MorphSVGPlugin',
	'MotionPathHelper',
	'MotionPathPlugin',
	'Observer',
	'Physics2DPlugin',
	'PhysicsPropsPlugin',
	'ScrambleTextPlugin',
	'ScrollSmoother',
	'ScrollToPlugin',
	'ScrollTrigger',
	'SplitText',
	'TextPlugin',
];

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
	{ value: 'slow(0.7, 0.7, false)', label: __('SlowMo (EasePack)', 'kpf-core') },
	{ value: 'rough({strength:1,points:20,taper:none,randomize:true})', label: __('Rough (EasePack)', 'kpf-core') },
	{ value: 'expoScale(0.5, 2)', label: __('Expo scale (EasePack)', 'kpf-core') },
	{ value: 'none', label: __('Constant speed', 'kpf-core') },
	{ value: 'wiggle', label: __('Wiggle (CustomWiggle)', 'kpf-core') },
	{ value: 'customBounce', label: __('Custom bounce', 'kpf-core') },
	{ value: 'custom', label: __('Custom curve', 'kpf-core') },
];

function easeLabel(value) {
	return EASE_OPTIONS.find((option) => option.value === value)?.label || value;
}

const PROPERTY_FIELDS = [
	{ key: 'x', label: __('Move X', 'kpf-core'), unit: 'px' },
	{ key: 'y', label: __('Move Y', 'kpf-core'), unit: 'px' },
	{ key: 'scale', label: __('Scale', 'kpf-core'), step: 0.05 },
	{ key: 'scaleX', label: __('Scale X', 'kpf-core'), step: 0.05 },
	{ key: 'scaleY', label: __('Scale Y', 'kpf-core'), step: 0.05 },
	{ key: 'rotation', label: __('Rotate', 'kpf-core'), unit: '°' },
	{ key: 'skewX', label: __('Skew X', 'kpf-core'), unit: '°' },
	{ key: 'opacity', label: __('Opacity', 'kpf-core'), step: 0.05 },
];

const SVG_EFFECTS = new Set(['draw', 'morph', 'motionPath']);
const TEXT_EFFECTS = new Set(['splitText', 'scrambleText', 'text']);

function defaults() {
	return {
		version: 1,
		active: true,
		selector: '.animate-me',
		animateChild: '',
		trigger: 'load',
		method: 'from',
		duration: 0.8,
		delay: 0,
		ease: 'power2.out',
		customBezier: '0.25,0.1,0.25,1',
		wiggleCount: 10,
		wiggleType: 'easeOut',
		bounceStrength: 0.7,
		bounceSquash: 1.5,
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
			splitType: 'chars,words,lines',
			splitAnimate: 'chars',
			scrambleText: '',
			scrambleChars: 'upperCase',
			scrambleSpeed: 0.3,
			textValue: '',
			textDelimiter: '',
			physicsVelocity: 200,
			physicsAngle: -90,
			physicsGravity: 500,
			physicsFriction: 0.1,
			physicsProps: {
				x: { acceleration: 0, friction: 0.1, velocity: 0 },
				y: { acceleration: 500, friction: 0.1, velocity: -200 },
			},
		},
		scroll: { start: 'top 85%', end: 'bottom 20%', scrub: 0, once: true },
		swing: {
			transformOrigin: '50% 0%',
			scrollMax: 0.6,
			settleMax: 6,
			settleSwings: 5,
			settleDuration: 1.7,
			velocityScale: 0.55,
			stopDelay: 0.12,
			decay: 0.55,
			scrollRadiusRatio: 0.1,
		},
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
			swing: { ...base.swing, ...(animation?.config?.swing || {}) },
			keyframes: Array.isArray(animation?.config?.keyframes) ? animation.config.keyframes : [],
		},
	};
}

function buildSwingSettleKeyframes({ amplitude, swings = 5, duration = 1.7, decay = 0.55 } = {}) {
	const count = Math.max(2, Math.min(12, Math.round(Number(swings) || 5)));
	const total = Math.max(0.4, Number(duration) || 1.7);
	const damp = Math.min(0.9, Math.max(0.2, Number(decay) || 0.55));
	const half = total / (count + 0.85);
	const frames = [];
	let amp = amplitude;
	for (let i = 0; i < count; i += 1) {
		frames.push({ rotation: amp, duration: half, ease: 'sine.inOut' });
		amp *= -damp;
	}
	frames.push({ rotation: 0, duration: half * 0.85, ease: 'sine.out' });
	return frames;
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

function EffectsEditor({ value, onChange }) {
	const svg = { ...defaults().svg, ...(value || {}) };
	const update = (patch) => onChange({ ...svg, ...patch });

	return (
		<div className="kpf-svg-editor">
			<div className="kpf-section-heading">
				<div>
					<h3>{__('Premium effects', 'kpf-core')}</h3>
					<p>
						{__(
							'SVG, text, and physics plugins from the full GSAP suite. Core transforms still work when effect is set to none.',
							'kpf-core'
						)}
					</p>
				</div>
			</div>
			<SelectControl
				label={__('Effect', 'kpf-core')}
				value={svg.effect}
				options={[
					{ label: __('Core transforms only', 'kpf-core'), value: 'none' },
					{ label: __('DrawSVG — draw a stroke', 'kpf-core'), value: 'draw' },
					{ label: __('MorphSVG — morph into another shape', 'kpf-core'), value: 'morph' },
					{ label: __('MotionPath — follow a path', 'kpf-core'), value: 'motionPath' },
					{ label: __('SplitText — animate characters / words / lines', 'kpf-core'), value: 'splitText' },
					{ label: __('ScrambleText — decode into text', 'kpf-core'), value: 'scrambleText' },
					{ label: __('TextPlugin — type or replace text', 'kpf-core'), value: 'text' },
					{ label: __('Physics2D — velocity + gravity', 'kpf-core'), value: 'physics2D' },
					{ label: __('PhysicsProps — per-property physics', 'kpf-core'), value: 'physicsProps' },
				]}
				onChange={(effect) => update({ effect })}
			/>
			{SVG_EFFECTS.has(svg.effect) ? (
				<TextControl
					label={__('Transform origin', 'kpf-core')}
					help={__('Examples: 50% 50%, left center, or 120 80 for SVG coordinates.', 'kpf-core')}
					value={svg.transformOrigin}
					onChange={(transformOrigin) => update({ transformOrigin })}
				/>
			) : null}
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
			{svg.effect === 'splitText' ? (
				<div className="kpf-svg-effect-fields">
					<TextControl
						label={__('Split types', 'kpf-core')}
						help={__('Comma-separated: chars, words, lines', 'kpf-core')}
						value={svg.splitType}
						onChange={(splitType) => update({ splitType })}
					/>
					<SelectControl
						label={__('Animate which pieces', 'kpf-core')}
						value={svg.splitAnimate}
						options={[
							{ label: __('Characters', 'kpf-core'), value: 'chars' },
							{ label: __('Words', 'kpf-core'), value: 'words' },
							{ label: __('Lines', 'kpf-core'), value: 'lines' },
						]}
						onChange={(splitAnimate) => update({ splitAnimate })}
					/>
				</div>
			) : null}
			{svg.effect === 'scrambleText' ? (
				<div className="kpf-svg-effect-fields">
					<TextControl
						label={__('Final text (optional)', 'kpf-core')}
						help={__('Leave blank to scramble the element’s existing text.', 'kpf-core')}
						value={svg.scrambleText}
						onChange={(scrambleText) => update({ scrambleText })}
					/>
					<SelectControl
						label={__('Character set', 'kpf-core')}
						value={svg.scrambleChars}
						options={[
							{ label: __('Uppercase', 'kpf-core'), value: 'upperCase' },
							{ label: __('Lowercase', 'kpf-core'), value: 'lowerCase' },
							{ label: __('Upper & lower', 'kpf-core'), value: 'upperAndLowerCase' },
							{ label: __('Numbers', 'kpf-core'), value: 'numbers' },
						]}
						onChange={(scrambleChars) => update({ scrambleChars })}
					/>
					<RangeControl
						label={__('Scramble speed', 'kpf-core')}
						min={0.05}
						max={2}
						step={0.05}
						value={Number(svg.scrambleSpeed) || 0.3}
						onChange={(scrambleSpeed) => update({ scrambleSpeed })}
					/>
				</div>
			) : null}
			{svg.effect === 'text' ? (
				<div className="kpf-svg-effect-fields">
					<TextControl
						label={__('Replacement text', 'kpf-core')}
						value={svg.textValue}
						onChange={(textValue) => update({ textValue })}
					/>
					<TextControl
						label={__('Delimiter', 'kpf-core')}
						help={__('Empty for character-by-character; use a space for word typing.', 'kpf-core')}
						value={svg.textDelimiter}
						onChange={(textDelimiter) => update({ textDelimiter })}
					/>
				</div>
			) : null}
			{svg.effect === 'physics2D' ? (
				<div className="kpf-svg-effect-fields">
					<TextControl
						label={__('Velocity', 'kpf-core')}
						type="number"
						value={svg.physicsVelocity}
						onChange={(physicsVelocity) => update({ physicsVelocity: Number(physicsVelocity) })}
					/>
					<TextControl
						label={__('Angle (degrees)', 'kpf-core')}
						type="number"
						value={svg.physicsAngle}
						onChange={(physicsAngle) => update({ physicsAngle: Number(physicsAngle) })}
					/>
					<TextControl
						label={__('Gravity', 'kpf-core')}
						type="number"
						value={svg.physicsGravity}
						onChange={(physicsGravity) => update({ physicsGravity: Number(physicsGravity) })}
					/>
					<RangeControl
						label={__('Friction', 'kpf-core')}
						min={0}
						max={1}
						step={0.05}
						value={Number(svg.physicsFriction) || 0}
						onChange={(physicsFriction) => update({ physicsFriction })}
					/>
				</div>
			) : null}
			{svg.effect === 'physicsProps' ? (
				<p className="description">
					{__(
						'Uses per-axis acceleration / velocity / friction from the saved physicsProps map (defaults launch upward then fall).',
						'kpf-core'
					)}
				</p>
			) : null}
			<div className="kpf-svg-guidance">
				<strong>{__('Registered GSAP premium suite', 'kpf-core')}</strong>
				<p>{PREMIUM_PLUGINS.join(', ')}</p>
				<p>
					{__(
						'Builder effects cover DrawSVG, MorphSVG, MotionPath, SplitText, ScrambleText, TextPlugin, Physics2D, and PhysicsProps. CustomWiggle, CustomBounce, CustomEase, and EasePack (SlowMo / Rough / ExpoScale) are under Timing & easing. Flip, Draggable, Observer, ScrollSmoother, Inertia, ScrollTo, CSSRule, GSDevTools, and MotionPathHelper are registered for advanced / preview use. Prefer ScrollTrigger via “Element enters the viewport”.',
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
		const effect = config.svg?.effect || 'none';
		const isSvg = SVG_EFFECTS.has(effect);
		const target = isSvg ? previewSvgRef.current : previewRef.current;
		if (!target) return;
		tweenRef.current?.kill();
		gsap.set(target, { clearProps: 'all' });
		if (target.dataset?.kpfSplitHtml) {
			target.innerHTML = target.dataset.kpfSplitHtml;
			delete target.dataset.kpfSplitHtml;
		}
		let ease = config.ease;
		if (config.ease === 'custom') {
			ease = CustomEase.create(`kpf-preview-${Date.now()}`, config.customBezier);
		} else if (config.ease === 'wiggle') {
			ease = CustomWiggle.create(`kpf-preview-wiggle-${Date.now()}`, {
				wiggles: Number(config.wiggleCount) || 10,
				type: config.wiggleType || 'easeOut',
			});
		} else if (config.ease === 'customBounce') {
			ease = CustomBounce.create(`kpf-preview-bounce-${Date.now()}`, {
				strength: Number(config.bounceStrength) || 0.7,
				squash: Number(config.bounceSquash) || 1.5,
			});
		}
		const common = {
			duration: config.duration,
			delay: 0,
			ease,
			repeat: config.repeat,
			yoyo: config.yoyo,
		};
		if (config.trigger === 'scroll-swing') {
			const swing = config.swing || {};
			gsap.set(target, {
				transformOrigin: swing.transformOrigin || '50% 0%',
				rotation: 0,
			});
			const amp = Number(swing.settleMax) || 6;
			const ratio = Number(swing.scrollRadiusRatio) || 0.1;
			const lean = amp * ratio;
			// Preview layered interruptions: lean → settle → mid-settle nudge → re-settle.
			tweenRef.current = gsap
				.timeline()
				.to(target, {
					rotation: -lean,
					duration: 0.22,
					ease: 'power2.out',
				})
				.to(target, {
					keyframes: buildSwingSettleKeyframes({
						amplitude: amp,
						swings: swing.settleSwings,
						duration: swing.settleDuration,
						decay: swing.decay,
					}),
				})
				.to(
					target,
					{
						rotation: `+=${lean * 1.6}`,
						duration: 0.18,
						ease: 'power2.out',
					},
					'-=0.55'
				)
				.to(target, {
					keyframes: buildSwingSettleKeyframes({
						amplitude: amp * 0.85,
						swings: Math.max(2, (Number(swing.settleSwings) || 5) - 1),
						duration: (Number(swing.settleDuration) || 1.7) * 0.85,
						decay: swing.decay,
					}),
				});
			return;
		}
		if (effect === 'draw') {
			tweenRef.current = gsap.fromTo(
				target,
				{ drawSVG: config.svg.drawFrom },
				{ drawSVG: config.svg.drawTo, transformOrigin: config.svg.transformOrigin, ...common }
			);
			return;
		}
		if (effect === 'morph') {
			tweenRef.current = gsap.to(target, {
				morphSVG: { shape: previewMorphRef.current, type: 'rotational' },
				transformOrigin: config.svg.transformOrigin,
				...common,
			});
			return;
		}
		if (effect === 'motionPath') {
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
		if (effect === 'splitText') {
			target.dataset.kpfSplitHtml = target.innerHTML;
			const split = new SplitText(target, { type: config.svg.splitType || 'chars,words,lines' });
			const key = config.svg.splitAnimate || 'chars';
			tweenRef.current = gsap.from(split[key] || split.chars, {
				...(config.from || { y: 20, autoAlpha: 0 }),
				...common,
				stagger: config.stagger || 0.03,
			});
			return;
		}
		if (effect === 'scrambleText') {
			tweenRef.current = gsap.to(target, {
				scrambleText: {
					text: config.svg.scrambleText || target.textContent,
					chars: config.svg.scrambleChars || 'upperCase',
					speed: Number(config.svg.scrambleSpeed) || 0.3,
				},
				...common,
			});
			return;
		}
		if (effect === 'text') {
			tweenRef.current = gsap.to(target, {
				text: {
					value: config.svg.textValue || __('Hello GSAP', 'kpf-core'),
					delimiter: config.svg.textDelimiter || '',
				},
				...common,
			});
			return;
		}
		if (effect === 'physics2D') {
			tweenRef.current = gsap.to(target, {
				physics2D: {
					velocity: Number(config.svg.physicsVelocity) || 200,
					angle: Number(config.svg.physicsAngle) || -90,
					gravity: Number(config.svg.physicsGravity) || 500,
					friction: Number(config.svg.physicsFriction) || 0.1,
				},
				...common,
			});
			return;
		}
		if (effect === 'physicsProps') {
			tweenRef.current = gsap.to(target, {
				physicsProps: config.svg.physicsProps,
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
		['svg', __('Effects', 'kpf-core')],
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
					{dirty ? (
						<span className="kpf-gsap-dirty">{__('Unsaved', 'kpf-core')}</span>
					) : (
						<span>{__('Saved', 'kpf-core')}</span>
					)}
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
								<TextControl
									label={__('Animate child (optional)', 'kpf-core')}
									help={__(
										'When set, the trigger stays on the selector above, but the tween runs on a matching descendant (e.g. .kpf-nav-link__line).',
										'kpf-core'
									)}
									value={config.animateChild || ''}
									onChange={(animateChild) => updateConfig({ animateChild })}
								/>
								<SelectControl
									label={__('Starts when', 'kpf-core')}
									value={config.trigger}
									options={[
										{ label: __('Page loads', 'kpf-core'), value: 'load' },
										{ label: __('Element enters the viewport', 'kpf-core'), value: 'in-view' },
										{ label: __('Pointer hovers over element', 'kpf-core'), value: 'hover' },
										{ label: __('Element is clicked', 'kpf-core'), value: 'click' },
										{
											label: __('Scroll momentum swing (badge / hanging)', 'kpf-core'),
											value: 'scroll-swing',
										},
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
								{config.trigger === 'scroll-swing' ? (
									<div className="kpf-scroll-settings kpf-swing-settings">
										<p className="kpf-swing-settings__help">
											{__(
												'Continuous pendulum: scroll impulses layer onto whatever energy is already in flight. While scrolling, swing radius is 10% of the settle radius; when scroll stops, the full decaying ring-out plays.',
												'kpf-core'
											)}
										</p>
										<TextControl
											label={__('Pivot (transform origin)', 'kpf-core')}
											help={__('Hang from the top with 50% 0%.', 'kpf-core')}
											value={config.swing.transformOrigin}
											onChange={(transformOrigin) =>
												updateConfig({ swing: { ...config.swing, transformOrigin } })
											}
										/>
										<RangeControl
											label={__('While scrolling — radius (% of settle)', 'kpf-core')}
											min={2}
											max={40}
											step={1}
											value={Math.round((Number(config.swing.scrollRadiusRatio) || 0.1) * 100)}
											onChange={(percent) => {
												const scrollRadiusRatio = (Number(percent) || 10) / 100;
												const settleMax = Number(config.swing.settleMax) || 6;
												updateConfig({
													swing: {
														...config.swing,
														scrollRadiusRatio,
														scrollMax: settleMax * scrollRadiusRatio,
													},
												});
											}}
										/>
										<RangeControl
											label={__('After stop — max swing (°)', 'kpf-core')}
											min={1}
											max={20}
											step={0.25}
											value={config.swing.settleMax}
											onChange={(settleMax) => {
												const ratio = Number(config.swing.scrollRadiusRatio) || 0.1;
												updateConfig({
													swing: {
														...config.swing,
														settleMax,
														scrollMax: settleMax * ratio,
													},
												});
											}}
										/>
										<RangeControl
											label={__('Settle swings (before rest)', 'kpf-core')}
											min={2}
											max={10}
											step={1}
											value={config.swing.settleSwings}
											onChange={(settleSwings) =>
												updateConfig({ swing: { ...config.swing, settleSwings } })
											}
										/>
										<RangeControl
											label={__('Settle duration (seconds)', 'kpf-core')}
											min={0.6}
											max={4}
											step={0.1}
											value={config.swing.settleDuration}
											onChange={(settleDuration) =>
												updateConfig({ swing: { ...config.swing, settleDuration } })
											}
										/>
										<RangeControl
											label={__('Scroll sensitivity', 'kpf-core')}
											min={0.1}
											max={2}
											step={0.05}
											value={config.swing.velocityScale}
											onChange={(velocityScale) =>
												updateConfig({ swing: { ...config.swing, velocityScale } })
											}
										/>
										<RangeControl
											label={__('Swing decay (lower = longer ring-out)', 'kpf-core')}
											min={0.25}
											max={0.85}
											step={0.05}
											value={config.swing.decay}
											onChange={(decay) => updateConfig({ swing: { ...config.swing, decay } })}
										/>
										<RangeControl
											label={__('Stop delay before settle (seconds)', 'kpf-core')}
											min={0.05}
											max={0.4}
											step={0.01}
											value={config.swing.stopDelay}
											onChange={(stopDelay) =>
												updateConfig({ swing: { ...config.swing, stopDelay } })
											}
										/>
									</div>
								) : null}
							</>
						) : null}

						{tab === 'motion' ? (
							<>
								{config.trigger === 'scroll-swing' ? (
									<div className="kpf-section-heading">
										<div>
											<h3>{__('Scroll swing owns rotation', 'kpf-core')}</h3>
											<p>
												{__(
													'This trigger drives rotation from scroll velocity. Tune lean and settle under Target & trigger — Motion from/to states are unused.',
													'kpf-core'
												)}
											</p>
										</div>
									</div>
								) : (
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
								)}
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
								{config.ease === 'wiggle' ? (
									<div className="kpf-svg-effect-fields">
										<RangeControl
											label={__('Wiggle count', 'kpf-core')}
											min={1}
											max={40}
											value={Number(config.wiggleCount) || 10}
											onChange={(wiggleCount) => updateConfig({ wiggleCount })}
										/>
										<SelectControl
											label={__('Wiggle type', 'kpf-core')}
											value={config.wiggleType || 'easeOut'}
											options={[
												{ label: 'easeOut', value: 'easeOut' },
												{ label: 'easeInOut', value: 'easeInOut' },
												{ label: 'anticipate', value: 'anticipate' },
												{ label: 'uniform', value: 'uniform' },
											]}
											onChange={(wiggleType) => updateConfig({ wiggleType })}
										/>
									</div>
								) : null}
								{config.ease === 'customBounce' ? (
									<div className="kpf-svg-effect-fields">
										<RangeControl
											label={__('Bounce strength', 'kpf-core')}
											min={0.1}
											max={2}
											step={0.05}
											value={Number(config.bounceStrength) || 0.7}
											onChange={(bounceStrength) => updateConfig({ bounceStrength })}
										/>
										<RangeControl
											label={__('Squash', 'kpf-core')}
											min={0}
											max={4}
											step={0.05}
											value={Number(config.bounceSquash) || 1.5}
											onChange={(bounceSquash) => updateConfig({ bounceSquash })}
										/>
									</div>
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
							<EffectsEditor value={config.svg} onChange={(svg) => updateConfig({ svg })} />
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
							hidden={SVG_EFFECTS.has(config.svg?.effect)}
						>
							<span>
								{TEXT_EFFECTS.has(config.svg?.effect)
									? __('Preview text target', 'kpf-core')
									: __('Preview target', 'kpf-core')}
							</span>
							<code>{config.selector || '.animate-me'}</code>
						</div>
						<svg
							className="kpf-preview-svg"
							viewBox="0 0 260 180"
							hidden={!SVG_EFFECTS.has(config.svg?.effect)}
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
