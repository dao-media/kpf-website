const EXCLUDED_TAGS = new Set(['script', 'style', 'template', 'noscript', 'svg', 'head', 'title', 'code', 'pre']);
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

/** Semantic / CTA copy that editors should change on the frontend. */
const COPY_TEXT_TAGS = new Set([
	'h1',
	'h2',
	'h3',
	'h4',
	'h5',
	'h6',
	'p',
	'a',
	'button',
	'li',
	'label',
	'figcaption',
	'blockquote',
	'q',
	'cite',
	'summary',
	'dt',
	'dd',
]);

/** Inline wrappers that may hold part of a heading/paragraph/button. */
const INLINE_WRAPPERS = new Set([
	'span',
	'strong',
	'em',
	'b',
	'i',
	'small',
	'mark',
	'u',
	's',
	'sub',
	'sup',
	'abbr',
	'time',
]);

const COPY_ATTRIBUTES = new Set(['alt', 'title', 'aria-label', 'placeholder', 'value']);
const ATTRIBUTE_TAGS = new Set(['img', 'a', 'button', 'input', 'textarea', 'option', 'area']);

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
	blockquote: 'Quote',
	cite: 'Citation',
	summary: 'Summary',
	dt: 'Term',
	dd: 'Definition',
	span: 'Text',
	strong: 'Text',
	em: 'Text',
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
		.replace(/&quot;/gi, '"')
		.replace(/&apos;|&#0?39;/gi, "'")
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&amp;/gi, '&');
}

/**
 * Escape only markup-significant characters. Keep spaces and Unicode punctuation
 * as literal UTF-8 so the frontend renders real characters, not entity codes.
 */
function escapeText(value) {
	return String(value)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
}

function escapeAttribute(value, quote) {
	const escaped = escapeText(value);
	// Only escape the active quote delimiter; leave the other quote as UTF-8.
	return quote === "'" ? escaped.replace(/'/g, '&#039;') : escaped.replace(/"/g, '&quot;');
}

function isBlankCopy(value) {
	return !String(value || '').replace(/\{\{\{?[\s\S]*?\}\}\}?/g, '').trim();
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

/**
 * True when this text node sits in frontend copy (heading, paragraph, button, etc.),
 * including text nested in inline wrappers inside those elements.
 */
function isCopyTextContext(stack) {
	if (!stack.length || hasExcludedAncestor(stack)) {
		return false;
	}

	for (let index = stack.length - 1; index >= 0; index -= 1) {
		const tag = stack[index];
		if (COPY_TEXT_TAGS.has(tag)) {
			return true;
		}
		if (INLINE_WRAPPERS.has(tag)) {
			continue;
		}
		return false;
	}

	return false;
}

function nextStableId(counts, parts) {
	const key = parts.join(':');
	const next = (counts.get(key) || 0) + 1;
	counts.set(key, next);
	return `${key}:${next}`;
}

function readableLabel(tag, kind, name, index) {
	if (kind === 'attribute') {
		const labels = {
			alt: 'Image alt text',
			title: 'Title',
			'aria-label': 'Accessible label',
			placeholder: 'Input placeholder',
			value: 'Input value',
		};
		return `${labels[name] || name} · ${index}`;
	}
	return `${TAG_LABELS[tag] || 'Text'} · ${index}`;
}

function addTextField(fields, counts, html, start, end, stack) {
	if (!isCopyTextContext(stack)) return;

	const raw = html.slice(start, end);
	if (!raw.trim()) return;

	// Keep spaces and punctuation in `value` so controlled inputs can accept
	// trailing spaces while typing. Do not split leading/trailing whitespace out.
	const value = decodeEntities(raw);
	if (isBlankCopy(value)) return;

	const tag = stack[stack.length - 1] || 'body';
	const id = nextStableId(counts, ['text', tag]);
	const index = Number(id.split(':').pop());

	fields.push({
		id,
		kind: 'text',
		tag,
		name: '',
		start,
		end,
		raw,
		leading: '',
		trailing: '',
		value,
		label: readableLabel(tag, 'text', '', index),
	});
}

function addAttributeFields(fields, counts, html, tagSource, tagStart, tagName) {
	if (!ATTRIBUTE_TAGS.has(tagName) || hasExcludedAncestor([tagName])) {
		return;
	}

	const pattern = /\b(alt|title|aria-label|placeholder|value)\s*=\s*(["'])([\s\S]*?)\2/gi;
	let match;
	while ((match = pattern.exec(tagSource))) {
		const name = match[1].toLowerCase();
		if (!COPY_ATTRIBUTES.has(name)) continue;
		if (name === 'value' && !['button', 'input', 'option'].includes(tagName)) continue;
		if (name === 'placeholder' && !['input', 'textarea'].includes(tagName)) continue;
		if (name === 'alt' && tagName !== 'img' && tagName !== 'area') continue;

		const equalsOffset = match[0].indexOf('=');
		const quoteOffset = match[0].indexOf(match[2], equalsOffset);
		const valueOffset = match.index + quoteOffset + 1;
		const start = tagStart + valueOffset;
		const end = start + match[3].length;
		const value = decodeEntities(match[3]);
		if (isBlankCopy(value)) continue;

		const id = nextStableId(counts, ['attribute', tagName, name]);
		const index = Number(id.split(':').pop());

		fields.push({
			id,
			kind: 'attribute',
			tag: tagName,
			name,
			start,
			end,
			raw: html.slice(start, end),
			quote: match[2],
			value,
			label: readableLabel(tagName, 'attribute', name, index),
		});
	}
}

function extractCopyFields(html) {
	const source = String(html || '');
	const fields = [];
	const counts = new Map();
	const stack = [];
	let cursor = 0;

	while (cursor < source.length) {
		const tagStart = source.indexOf('<', cursor);
		if (tagStart === -1) {
			addTextField(fields, counts, source, cursor, source.length, stack);
			break;
		}

		if (tagStart > cursor) {
			addTextField(fields, counts, source, cursor, tagStart, stack);
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
				addAttributeFields(fields, counts, source, tagSource, tagStart, tagName);
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
		field.kind === 'attribute' ? escapeAttribute(value, field.quote) : escapeText(value);

	return `${source.slice(0, field.start)}${replacement}${source.slice(field.end)}`;
}

module.exports = {
	extractCopyFields,
	updateCopyField,
};
