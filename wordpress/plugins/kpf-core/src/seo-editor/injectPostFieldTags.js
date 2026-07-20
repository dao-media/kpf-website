import { __ } from '@wordpress/i18n';
import '../design-tags/labelWithTag.css';

const CHIP_ATTR = 'data-kpf-field-tag';

async function copyText(value) {
	try {
		await navigator.clipboard.writeText(value);
		return;
	} catch {
		const input = document.createElement('input');
		input.value = value;
		document.body.appendChild(input);
		input.select();
		document.execCommand('copy');
		document.body.removeChild(input);
	}
}

function createChip(tag) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'kpf-label-with-tag__chip';
	button.setAttribute(CHIP_ATTR, tag);
	button.title = __('Copy placeholder', 'kpf-core');
	button.setAttribute(
		'aria-label',
		`${__('Copy placeholder', 'kpf-core')}: ${tag}`
	);
	const code = document.createElement('code');
	code.textContent = tag;
	button.appendChild(code);
	button.addEventListener('click', (event) => {
		event.preventDefault();
		event.stopPropagation();
		copyText(tag);
	});
	return button;
}

function hasChip(anchor, tag) {
	return Array.from(anchor.querySelectorAll(`[${CHIP_ATTR}]`)).some(
		(node) => node.getAttribute(CHIP_ATTR) === tag
	);
}

function ensureChip(anchor, tag) {
	if (!anchor || !tag || hasChip(anchor, tag)) {
		return;
	}
	const holder = document.createElement('span');
	holder.className = 'kpf-post-field-tag';
	holder.appendChild(createChip(tag));
	anchor.appendChild(holder);
}

function normalizeLabel(value) {
	return String(value || '')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();
}

function labelMatches(node, patterns) {
	const clone = node.cloneNode(true);
	clone.querySelectorAll(`[${CHIP_ATTR}]`).forEach((chip) => chip.remove());
	clone.querySelectorAll('.kpf-post-field-tag').forEach((chip) => chip.remove());
	const text = normalizeLabel(clone.textContent);
	return patterns.some((pattern) => pattern.test(text));
}

/**
 * Inject copyable %% placeholder chips next to core Gutenberg field labels.
 */
export function injectPostFieldTags(fieldTags = {}) {
	const tags = {
		title: '%%title%%',
		excerpt: '%%excerpt%%',
		category: '%%category%%',
		tag: '%%tag%%',
		author: '%%author%%',
		date: '%%date%%',
		...fieldTags,
	};

	const rules = [
		{
			tag: tags.title,
			patterns: [/^title$/, /^add title$/],
			roots: [
				'.editor-post-title',
				'.editor-visual-editor__post-title-wrapper',
				'.edit-post-visual-editor__post-title-wrapper',
			],
		},
		{
			tag: tags.excerpt,
			patterns: [/^excerpt$/],
		},
		{
			tag: tags.category,
			patterns: [/^categories$/, /^category$/],
		},
		{
			tag: tags.tag,
			patterns: [/^tags$/, /^tag$/, /^topics$/, /^topic$/],
		},
		{
			tag: tags.author,
			patterns: [/^author$/],
		},
		{
			tag: tags.date,
			patterns: [/^date$/, /^publish$/, /^publish date$/],
		},
	];

	rules.forEach((rule) => {
		if (!rule.tag) {
			return;
		}

		(rule.roots || []).forEach((selector) => {
			document.querySelectorAll(selector).forEach((root) => {
				if (hasChip(root, rule.tag)) {
					return;
				}
				const label =
					root.querySelector('label') ||
					root.querySelector('.components-base-control__label');
				if (label) {
					ensureChip(label, rule.tag);
					return;
				}
				const chipHost = document.createElement('div');
				chipHost.className = 'kpf-post-field-tag kpf-post-field-tag--title';
				chipHost.appendChild(createChip(rule.tag));
				root.prepend(chipHost);
			});
		});

		document
			.querySelectorAll(
				'h2.components-panel__body-title, .editor-post-panel__row-label, label.components-base-control__label, .components-base-control__label'
			)
			.forEach((node) => {
				if (node.closest('.kpf-seo-editor') || node.closest('.kpf-seo-canvas-root')) {
					return;
				}
				if (!labelMatches(node, rule.patterns)) {
					return;
				}
				ensureChip(node, rule.tag);
			});
	});
}

/**
 * Keep chips attached as the block editor re-renders sidebar panels.
 */
export function watchPostFieldTags(fieldTags = {}) {
	let timer = 0;
	const run = () => {
		window.clearTimeout(timer);
		timer = window.setTimeout(() => injectPostFieldTags(fieldTags), 80);
	};

	run();
	const observer = new MutationObserver(run);
	observer.observe(document.body, { childList: true, subtree: true });

	return () => {
		window.clearTimeout(timer);
		observer.disconnect();
	};
}
