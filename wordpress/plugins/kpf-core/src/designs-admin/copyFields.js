const EXCLUDED_TAGS = new Set(['script', 'style', 'template', 'noscript']);
const VOID_TAGS = new Set([
	'area',
	'base',
	'br',
	'col',
	'embed',
	'hr',
	'img',
	'input',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
]);
const COPY_ATTRIBUTES = new Set(['alt', 'title', 'aria-label', 'placeholder', 'value']);

const TAG_LABELS = {
	a: 'Link',
	button: 'Button',
	figcaption: 'Image caption',
	h1: 'Heading 1',
	h2: 'Heading 2',
	h3: 'Heading 3',
	h4: 'Heading 4',
	h5: 'Heading 5',
	h6: 'Heading 6',
	label: 'Form label',
	li: 'List item',
	p: 'Paragraph',
	q: 'Quote',
	span: 'Text',
	td: 'Table cell',
	th: 'Table heading',
};

function decodeEntities(value) {
	if (typeof document !== 'undefined') {
		const textarea = document.createElement('textarea');
		textarea.innerHTML = value;
		return textarea.value;
	}

	return value
		.replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
		.replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
		.replace(/&nbsp;/gi, '\u00a0')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#0?39;/gi, "'");
}

function escapeText(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function escapeAttribute(value, quote) {
	const escaped = escapeText(value);
	return quote === "'" ? escaped.replace(/'/g, '&#039;') : escaped.replace(/"/g, '&quot;');
}

function findTagEnd(html, start) {
	let quote = '';
	for (let index = start + 1; index < html.length; index += 1) {
		const character = html[index];
		if (quote) {
			if (character === quote) quote = '';
			continue;
		}
		if (character === '"' || character === "'") {
			quote = character;
		} else if (character === '>') {
			return index + 1;
		}
	}
	return html.length;
}

function hasExcludedAncestor(stack) {
	return stack.some((tag) => EXCLUDED_TAGS.has(tag));
}

function readableLabel(tag, kind, name, index) {
	if (kind === 'attribute') {
		const labels = {
			'alt': 'Image alt text',
			'title': 'Title',
			'aria-label': 'Accessible label',
			'placeholder': 'Input placeholder',
			'value': 'Input value',
		};
		return `${labels[name] || name} · ${index}`;
	}
	return `${TAG_LABELS[tag] || 'Text'} · ${index}`;
}

function addTextField(fields, html, start, end, stack) {
	const raw = html.slice(start, end);
	if (!raw.trim()) return;

	const decoded = decodeEntities(raw);
	const value = decoded.trim();
	if (!value || !value.replace(/\{\{\{?[\s\S]*?\}\}\}?/g, '').trim()) return;

	const leading = raw.match(/^\s*/)?.[0] || '';
	const trailing = raw.match(/\s*$/)?.[0] || '';
	const tag = stack[stack.length - 1] || 'body';
	fields.push({
		id: `text:${start}:${end}`,
		kind: 'text',
		tag,
		name: '',
		start,
		end,
		raw,
		leading,
		trailing,
		value,
		label: readableLabel(tag, 'text', '', fields.length + 1),
	});
}

function addAttributeFields(fields, html, tagSource, tagStart, tagName) {
	const pattern = /\b(alt|title|aria-label|placeholder|value)\s*=\s*(["'])([\s\S]*?)\2/gi;
	let match;
	while ((match = pattern.exec(tagSource))) {
		const name = match[1].toLowerCase();
		if (!COPY_ATTRIBUTES.has(name)) continue;
		if (name === 'value' && !['button', 'input', 'option'].includes(tagName)) continue;

		const equalsOffset = match[0].indexOf('=');
		const quoteOffset = match[0].indexOf(match[2], equalsOffset);
		const valueOffset = match.index + quoteOffset + 1;
		const start = tagStart + valueOffset;
		const end = start + match[3].length;
		const value = decodeEntities(match[3]);
		if (!value || !value.replace(/\{\{\{?[\s\S]*?\}\}\}?/g, '').trim()) continue;

		fields.push({
			id: `attribute:${start}:${end}`,
			kind: 'attribute',
			tag: tagName,
			name,
			start,
			end,
			raw: html.slice(start, end),
			quote: match[2],
			value,
			label: readableLabel(tagName, 'attribute', name, fields.length + 1),
		});
	}
}

function extractCopyFields(html) {
	const source = String(html || '');
	const fields = [];
	const stack = [];
	let cursor = 0;

	while (cursor < source.length) {
		const tagStart = source.indexOf('<', cursor);
		if (tagStart === -1) {
			if (!hasExcludedAncestor(stack)) addTextField(fields, source, cursor, source.length, stack);
			break;
		}

		if (tagStart > cursor && !hasExcludedAncestor(stack)) {
			addTextField(fields, source, cursor, tagStart, stack);
		}

		if (source.startsWith('<!--', tagStart)) {
			const commentEnd = source.indexOf('-->', tagStart + 4);
			cursor = commentEnd === -1 ? source.length : commentEnd + 3;
			continue;
		}

		const tagEnd = findTagEnd(source, tagStart);
		const tagSource = source.slice(tagStart, tagEnd);
		const tagMatch = tagSource.match(/^<\s*(\/?)\s*([a-z][\w:-]*)/i);
		if (!tagMatch) {
			cursor = tagEnd;
			continue;
		}

		const closing = Boolean(tagMatch[1]);
		const tagName = tagMatch[2].toLowerCase();
		if (closing) {
			const matchIndex = stack.lastIndexOf(tagName);
			if (matchIndex !== -1) stack.splice(matchIndex);
		} else {
			if (!hasExcludedAncestor(stack) && !EXCLUDED_TAGS.has(tagName)) {
				addAttributeFields(fields, source, tagSource, tagStart, tagName);
			}
			const selfClosing = /\/\s*>$/.test(tagSource) || VOID_TAGS.has(tagName);
			if (!selfClosing) stack.push(tagName);
		}

		cursor = tagEnd;
	}

	return fields;
}

function updateCopyField(html, field, value) {
	const source = String(html || '');
	if (!field || source.slice(field.start, field.end) !== field.raw) return source;

	const replacement =
		field.kind === 'attribute'
			? escapeAttribute(value, field.quote)
			: `${field.leading}${escapeText(value)}${field.trailing}`;

	return `${source.slice(0, field.start)}${replacement}${source.slice(field.end)}`;
}

module.exports = {
	extractCopyFields,
	updateCopyField,
};
