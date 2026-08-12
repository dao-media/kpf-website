/**
 * Lucide icon name helpers + embed string builders.
 *
 * Sizing model (configured):
 * - The <svg> is a fixed `size × size` border-box canvas
 * - Padding insets the viewBox paint area so the glyph scales down
 * - Margin sits outside the canvas
 * - preserveAspectRatio=meet keeps each icon’s viewBox ratio
 */

export function toKebabCase(pascal) {
	return String(pascal || '')
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
		.toLowerCase();
}

export function defaultClassName(pascalOrKebab) {
	const kebab = String(pascalOrKebab || '').includes('-')
		? String(pascalOrKebab).toLowerCase()
		: toKebabCase(pascalOrKebab);
	const slug = kebab.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
	return slug ? `.kpf-icon--${slug}` : '.kpf-icon';
}

export function normalizeClassName(value, pascal) {
	const raw = String(value || '').trim();
	if (!raw) return defaultClassName(pascal);
	return raw.startsWith('.') ? raw : `.${raw.replace(/^\.+/, '')}`;
}

/** Read viewBox width/height from an SVG element or markup string. */
export function readViewBoxRatio(svgOrMarkup) {
	let viewBox = '';
	if (svgOrMarkup && typeof svgOrMarkup === 'object' && svgOrMarkup.getAttribute) {
		viewBox = svgOrMarkup.getAttribute('viewBox') || '';
	} else {
		const match = String(svgOrMarkup || '').match(/\sviewBox="([^"]+)"/i);
		viewBox = match ? match[1] : '';
	}
	const parts = String(viewBox)
		.trim()
		.split(/[\s,]+/)
		.map(Number);
	const w = parts[2] > 0 ? parts[2] : 24;
	const h = parts[3] > 0 ? parts[3] : 24;
	return { w, h, ratio: `${w} / ${h}` };
}

function escapeAttr(value) {
	return String(value ?? '')
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

/**
 * Normalize padding/margin so bare numbers become px (e.g. "8" → "8px").
 * Leaves rem/%/var()/multi-value shorthands alone.
 */
export function normalizeCssBox(value, fallback = '0') {
	const raw = String(value ?? '').trim();
	if (!raw) return fallback;
	if (/^-?\d+(\.\d+)?$/.test(raw)) {
		return `${raw}px`;
	}
	return raw;
}

/** True when a box value is effectively zero. */
export function isZeroBox(value) {
	const v = normalizeCssBox(value, '0').toLowerCase();
	return v === '0' || v === '0px' || v === '0rem' || v === '0em' || v === '0%';
}

/**
 * Box model for a configured icon <svg> (or a preview frame matching it).
 * Padding insets inside size×size; margin is outside.
 */
export function iconBoxStyle(config) {
	const size = Number(config.size) || 20;
	const padding = normalizeCssBox(config.padding, '0');
	const margin = normalizeCssBox(config.margin, '0');
	const includeMargin = config.includeMargin !== false;
	const style = {
		width: `${size}px`,
		height: `${size}px`,
		padding,
		boxSizing: 'border-box',
		display: 'block',
		lineHeight: 0,
		verticalAlign: 'middle',
		flexShrink: 0,
		overflow: 'hidden',
		color: String(config.color || 'currentColor').trim() || 'currentColor',
	};
	if (includeMargin && !isZeroBox(margin)) {
		style.margin = margin;
	}
	return style;
}

/** @deprecated Prefer iconBoxStyle — kept for callers that still name it canvas. */
export function canvasInlineStyle(config) {
	return iconBoxStyle(config);
}

/**
 * Preview/React helper when the SVG fills a separate framed parent.
 * Prefer putting the box model on the SVG itself (iconBoxStyle).
 */
export function glyphInlineStyle() {
	return {
		width: '100%',
		height: '100%',
		display: 'block',
		overflow: 'hidden',
		boxSizing: 'border-box',
	};
}

function styleObjectToAttr(style) {
	const body = Object.entries(style || {})
		.map(([key, value]) => {
			const prop = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
			return `${prop}: ${value}`;
		})
		.join('; ');
	return body ? ` style="${escapeAttr(body)}"` : '';
}

/**
 * Apply configured presentation attrs onto an SVG outerHTML string from Lucide.
 */
export function applySvgConfig(svgOuterHtml, attrs = {}) {
	const {
		strokeWidth = 1.75,
		strokeLinecap = 'round',
		strokeLinejoin = 'round',
		color = 'currentColor',
		className = '',
		/** When true, size/padding/margin live on the SVG (border-box canvas). */
		fitToCanvas = true,
		size = 20,
		padding = '0',
		margin = '0',
	} = attrs;

	let svg = String(svgOuterHtml || '').trim();
	if (!svg.startsWith('<svg')) return '';

	const classAttr = String(className || '')
		.replace(/^\./, '')
		.trim();

	const resolvedColor = String(color || 'currentColor').trim() || 'currentColor';

	svg = svg
		.replace(/\swidth="[^"]*"/g, '')
		.replace(/\sheight="[^"]*"/g, '')
		.replace(/\sstyle="[^"]*"/g, '')
		.replace(/\sstroke="[^"]*"/, ' stroke="currentColor"')
		.replace(/\sstroke-width="[^"]*"/, ` stroke-width="${strokeWidth}"`)
		.replace(/\sstroke-linecap="[^"]*"/, ` stroke-linecap="${strokeLinecap}"`)
		.replace(/\sstroke-linejoin="[^"]*"/, ` stroke-linejoin="${strokeLinejoin}"`);

	if (!/\spreserveAspectRatio=/.test(svg)) {
		svg = svg.replace('<svg', '<svg preserveAspectRatio="xMidYMid meet"');
	}

	const style = fitToCanvas
		? iconBoxStyle({ size, padding, margin, color: resolvedColor })
		: {
				width: `${size}px`,
				height: `${size}px`,
				display: 'block',
				color: resolvedColor,
			};

	svg = svg.replace('<svg', `<svg${styleObjectToAttr(style)}`);

	if (/\sclass="[^"]*"/.test(svg)) {
		svg = svg.replace(/\sclass="[^"]*"/, classAttr ? ` class="${escapeAttr(classAttr)}"` : '');
	} else if (classAttr) {
		svg = svg.replace('<svg', `<svg class="${escapeAttr(classAttr)}"`);
	}

	if (!/\saria-hidden=/.test(svg)) {
		svg = svg.replace(/<svg([^>]*)>/, '<svg$1 aria-hidden="true" focusable="false">');
	}

	return svg;
}

/**
 * Declarations for an icon utility class applied directly to the <svg>.
 */
export function buildCssDeclarations(config) {
	const size = Number(config.size) || 20;
	const stroke = Number(config.strokeWidth) || 1.75;
	const color = String(config.color || 'currentColor').trim() || 'currentColor';
	const padding = normalizeCssBox(config.padding, '0');
	const margin = normalizeCssBox(config.margin, '0');
	const linecap = config.strokeLinecap || 'round';
	const linejoin = config.strokeLinejoin || 'round';

	const parts = [
		'display: block',
		`width: ${size}px`,
		`height: ${size}px`,
		'box-sizing: border-box',
		`padding: ${padding}`,
		`color: ${color}`,
		'line-height: 0',
		'vertical-align: middle',
		'flex-shrink: 0',
		'overflow: hidden',
		'stroke: currentColor',
		`stroke-width: ${stroke}`,
		`stroke-linecap: ${linecap}`,
		`stroke-linejoin: ${linejoin}`,
		'fill: none',
	];

	if (!isZeroBox(margin)) {
		parts.push(`margin: ${margin}`);
	}

	return `${parts.join('; ')};`;
}

export function buildCopyFormats({ pascal, svgOuterHtml, mode, config }) {
	const configured = mode === 'configured';
	const kebab = toKebabCase(pascal);
	const className = normalizeClassName(config.className, pascal).replace(/^\./, '');
	const size = configured ? Number(config.size) || 20 : 20;
	const strokeWidth = configured ? Number(config.strokeWidth) || 1.75 : 1.75;
	// Lucide geometry assumes round caps/joins — lock them so miter/square don’t jag tips.
	const strokeLinecap = 'round';
	const strokeLinejoin = 'round';
	const color = configured ? config.color || 'currentColor' : 'currentColor';
	const padding = configured ? config.padding || '0' : '0';
	const margin = configured ? config.margin || '0' : '0';
	const { ratio } = readViewBoxRatio(svgOuterHtml);

	const wrappedSvg = configured
		? applySvgConfig(svgOuterHtml, {
				strokeWidth,
				strokeLinecap,
				strokeLinejoin,
				color,
				className,
				fitToCanvas: true,
				size,
				padding,
				margin,
			})
		: applySvgConfig(svgOuterHtml, {
				strokeWidth,
				strokeLinecap,
				strokeLinejoin,
				color,
				className: 'kpf-icon',
				fitToCanvas: false,
				size,
			});

	const css = buildCssDeclarations({
		...config,
		size,
		strokeWidth,
		strokeLinecap,
		strokeLinejoin,
		color,
		padding,
		margin,
	});

	const boxStyleJs = `{
  width: ${size},
  height: ${size},
  padding: '${normalizeCssBox(padding, '0')}',
  margin: '${normalizeCssBox(margin, '0')}',
  boxSizing: 'border-box',
  display: 'block',
  overflow: 'hidden'${color !== 'currentColor' ? `,\n  color: '${color}'` : ''}
}`;

	const reactNamed = configured
		? `import { ${pascal} } from 'lucide-react';\n\n<${pascal}\n  className="${className}"\n  width={${size}}\n  height={${size}}\n  strokeWidth={${strokeWidth}}\n  strokeLinecap="${strokeLinecap}"\n  strokeLinejoin="${strokeLinejoin}"${
				color !== 'currentColor' ? `\n  color="${color}"` : ''
			}\n  style={${boxStyleJs}}\n  aria-hidden\n/>`
		: `import { ${pascal} } from 'lucide-react';\n\n<${pascal}\n  size={${size}}\n  strokeWidth={${strokeWidth}}\n  aria-hidden\n/>`;

	const reactDynamic = configured
		? `import Icon from '@/components/Icon';\n\n<Icon\n  name="${pascal}"\n  className="${className}"\n  width={${size}}\n  height={${size}}\n  strokeWidth={${strokeWidth}}\n  strokeLinecap="${strokeLinecap}"\n  strokeLinejoin="${strokeLinejoin}"${
				color !== 'currentColor' ? `\n  color="${color}"` : ''
			}\n  style={${boxStyleJs}}\n  aria-hidden\n/>`
		: `import Icon from '@/components/Icon';\n\n<Icon\n  name="${pascal}"\n  size={${size}}\n  strokeWidth={${strokeWidth}}\n  aria-hidden\n/>`;

	return {
		svg: wrappedSvg,
		html: wrappedSvg,
		react: reactNamed,
		reactDynamic,
		css,
		className: `.${className}`,
		kebab,
		pascal,
		ratio,
	};
}
