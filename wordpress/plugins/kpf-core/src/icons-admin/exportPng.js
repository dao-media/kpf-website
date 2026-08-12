/**
 * Client-side icon file exports from Lucide SVG markup.
 */

export function downloadIconSvg(svgMarkup, filename = 'kpf-icon.svg') {
	const svg = prepareStandaloneSvg(svgMarkup);
	if (!svg) {
		throw new Error('Missing SVG markup');
	}

	const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
	triggerDownload(blob, filename);
}

export async function downloadIconPng(svgMarkup, filename = 'kpf-icon.png', scale = 2) {
	const svg = prepareStandaloneSvg(svgMarkup);
	if (!svg) {
		throw new Error('Missing SVG markup');
	}

	const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
	const url = URL.createObjectURL(blob);

	try {
		const img = await loadImage(url);
		const width = Math.max(1, img.naturalWidth || 24);
		const height = Math.max(1, img.naturalHeight || 24);
		const canvas = document.createElement('canvas');
		canvas.width = Math.round(width * scale);
		canvas.height = Math.round(height * scale);
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('Canvas unavailable');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

		const pngBlob = await new Promise((resolve, reject) => {
			canvas.toBlob(
				(b) => (b ? resolve(b) : reject(new Error('PNG encode failed'))),
				'image/png'
			);
		});

		triggerDownload(pngBlob, filename);
	} finally {
		URL.revokeObjectURL(url);
	}
}

/** Ensure a downloadable SVG root (xmlns + unwrap span wrappers). */
function prepareStandaloneSvg(svgMarkup) {
	let svg = String(svgMarkup || '').trim();
	if (!svg) return '';

	// If markup is a wrapper <span>…<svg>, prefer the inner SVG.
	if (!svg.startsWith('<svg')) {
		const match = svg.match(/<svg[\s\S]*<\/svg>/i);
		svg = match ? match[0] : '';
	}
	if (!svg.startsWith('<svg')) return '';

	if (!/\sxmlns=/.test(svg)) {
		svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
	}

	return svg;
}

function triggerDownload(blob, filename) {
	const href = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = href;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(href);
}

function loadImage(url) {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = () => reject(new Error('Failed to rasterize SVG'));
		img.src = url;
	});
}
