/**
 * Lucide icon name helpers + embed string builders.
 *
 * Sizing model:
 * - Canvas = fixed `size × size` box (border-box)
 * - Padding insets the content box so the glyph scales down inside the same canvas
 * - SVG fills that content box with preserveAspectRatio=meet, locking each icon’s
 *   viewBox ratio and capping the longer side at 100%
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

/** Inline styles for the fixed canvas wrapper. */
export function canvasInlineStyle(config) {
	const size = Number(config.size) || 20;
	const padding = String(config.padding || '0').trim() || '0';
	const margin = String(config.margin || '0').trim() || '0';
	return {
		width: `${size}px`,
		height: `${size}px`,
		padding,
		margin,
		boxSizing: 'border-box',
		display: 'inline-grid',
		placeItems: 'center',
		lineHeight: 0,
		color: String(config.color || 'currentColor').trim() || 'currentColor',
		overflow: 'hidden',
	};
}

/** Inline styles for the SVG glyph inside the padded canvas. */
export function glyphInlineStyle(ratio = '24 / 24') {
	return {
		width: 'auto',
		height: 'auto',
		maxWidth: '100%',
		maxHeight: '100%',
		aspectRatio: ratio,
		display: 'block',
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
		ratio = '24 / 24',
		/** When true, SVG fills a padded canvas via max-width/height + aspect-ratio. */
		fitToCanvas = true,
		/** Absolute size used only when fitToCanvas is false (simple mode). */
		size = 20,
	} = attrs;

	let svg = String(svgOuterHtml || '').trim();
	if (!svg.startsWith('<svg')) return '';

	const classAttr = String(className || '')
		.replace(/^\./, '')
		.trim();

	// Always stroke via currentColor so CSS variables on `color` resolve correctly.
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
		? { ...glyphInlineStyle(ratio), color: resolvedColor }
		: {
				width: `${size}px`,
				height: `${size}px`,
				aspectRatio: ratio,
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
 * Declarations for a canvas class (wrapper). Tokens Sync stores declarations only.
 * Pair with HTML that nests the SVG inside this class.
 */
export function buildCssDeclarations(config, ratio = '24 / 24') {
	const size = Number(config.size) || 20;
	const stroke = Number(config.strokeWidth) || 1.75;
	const color = String(config.color || 'currentColor').trim() || 'currentColor';
	const padding = String(config.padding || '0').trim() || '0';
	const margin = String(config.margin || '0').trim() || '0';
	const linecap = config.strokeLinecap || 'round';
	const linejoin = config.strokeLinejoin || 'round';

	const parts = [
		'display: inline-grid',
		'place-items: center',
		`width: ${size}px`,
		`height: ${size}px`,
		'box-sizing: border-box',
		`padding: ${padding}`,
		`color: ${color}`,
		'line-height: 0',
		'vertical-align: middle',
		'flex-shrink: 0',
		'overflow: hidden',
		// Fallbacks when this class is applied directly to an <svg>:
		// padding insets the SVG viewport; meet keeps the viewBox ratio.
		'stroke: currentColor',
		`stroke-width: ${stroke}`,
		`stroke-linecap: ${linecap}`,
		`stroke-linejoin: ${linejoin}`,
		'fill: none',
		`aspect-ratio: ${ratio}`,
	];
	if (margin !== '0') {
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
	const strokeLinecap = configured ? config.strokeLinecap || 'round' : 'round';
	const strokeLinejoin = configured ? config.strokeLinejoin || 'round' : 'round';
	const color = configured ? config.color || 'currentColor' : 'currentColor';
	const { ratio } = readViewBoxRatio(svgOuterHtml);

	const glyphSvg = applySvgConfig(svgOuterHtml, {
		strokeWidth,
		strokeLinecap,
		strokeLinejoin,
		color,
		className: '',
		ratio,
		fitToCanvas: configured,
		size,
	});

	const wrappedSvg = configured
		? `<span class="${escapeAttr(className)}"${styleObjectToAttr(canvasInlineStyle(config))}>${glyphSvg}</span>`
		: applySvgConfig(svgOuterHtml, {
				strokeWidth,
				strokeLinecap,
				strokeLinejoin,
				color,
				className: 'kpf-icon',
				ratio,
				fitToCanvas: false,
				size,
			});

	const css = buildCssDeclarations(
		{
			...config,
			size,
			strokeWidth,
			strokeLinecap,
			strokeLinejoin,
			color,
		},
		ratio
	);

	const canvasStyleJs = `{
  width: ${size},
  height: ${size},
  padding: '${String(config.padding || '0')}',
  margin: '${String(config.margin || '0')}',
  boxSizing: 'border-box',
  display: 'inline-grid',
  placeItems: 'center',
  lineHeight: 0,
  overflow: 'hidden'${color !== 'currentColor' ? `,\n  color: '${color}'` : ''}
}`;

	const glyphStyleJs = `{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%', aspectRatio: '${ratio}', display: 'block' }`;

	const reactNamed = configured
		? `import { ${pascal} } from 'lucide-react';\n\n<span className="${className}" style={${canvasStyleJs}}>\n  <${pascal}\n    width="100%"\n    height="100%"\n    strokeWidth={${strokeWidth}}\n    strokeLinecap="${strokeLinecap}"\n    strokeLinejoin="${strokeLinejoin}"${
				color !== 'currentColor' ? `\n    color="${color}"` : ''
			}\n    style={${glyphStyleJs}}\n    aria-hidden\n  />\n</span>`
		: `import { ${pascal} } from 'lucide-react';\n\n<${pascal}\n  size={${size}}\n  strokeWidth={${strokeWidth}}\n  aria-hidden\n/>`;

	const reactDynamic = configured
		? `import Icon from '@/components/Icon';\n\n<span className="${className}" style={${canvasStyleJs}}>\n  <Icon\n    name="${pascal}"\n    width="100%"\n    height="100%"\n    strokeWidth={${strokeWidth}}\n    strokeLinecap="${strokeLinecap}"\n    strokeLinejoin="${strokeLinejoin}"${
				color !== 'currentColor' ? `\n    color="${color}"` : ''
			}\n    style={${glyphStyleJs}}\n    aria-hidden\n  />\n</span>`
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
