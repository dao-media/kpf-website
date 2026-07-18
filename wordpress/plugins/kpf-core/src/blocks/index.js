import { createBlock, parse, rawHandler, registerBlockType } from '@wordpress/blocks';
import {
	AlignmentToolbar,
	BlockControls,
	InnerBlocks,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	RichText,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	Button,
	Modal,
	Notice,
	PanelBody,
	SearchControl,
	SelectControl,
	Spinner,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { useEntityRecords } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import {
	PluginDocumentSettingPanel,
	PluginSidebar,
	PluginSidebarMoreMenuItem,
} from '@wordpress/editor';
import { useEffect, useMemo, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';

import buttonMetadata from '../../blocks/button/block.json';
import cardMetadata from '../../blocks/card/block.json';
import containerMetadata from '../../blocks/container/block.json';
import ctaMetadata from '../../blocks/call-to-action/block.json';
import disclosureMetadata from '../../blocks/disclosure/block.json';
import noticeMetadata from '../../blocks/notice/block.json';
import './components.scss';

const variants = {
	button: [
		{ label: __('Primary', 'kpf-core'), value: 'primary' },
		{ label: __('Secondary', 'kpf-core'), value: 'secondary' },
		{ label: __('Text link', 'kpf-core'), value: 'text' },
	],
	size: [
		{ label: __('Small', 'kpf-core'), value: 'small' },
		{ label: __('Medium', 'kpf-core'), value: 'medium' },
		{ label: __('Large', 'kpf-core'), value: 'large' },
	],
};

/** Blocks editors can nest freely when composing reusable components. */
const COMPOSABLE_INNER_BLOCKS = [
	'core/paragraph',
	'core/heading',
	'core/list',
	'core/image',
	'core/quote',
	'core/separator',
	'core/spacer',
	'core/buttons',
	'core/button',
	'core/group',
	'core/columns',
	'core/column',
	'core/row',
	'core/stack',
	'core/media-text',
	'core/embed',
	'core/html',
	'core/block',
	'kpf/button',
	'kpf/disclosure',
	'kpf/card',
	'kpf/notice',
	'kpf/call-to-action',
	'kpf/container',
];

function ButtonEdit({ attributes, setAttributes }) {
	const { text, url, opensInNewTab, variant, size, alignment } = attributes;
	const blockProps = useBlockProps({
		className: `kpf-button kpf-button--${variant} kpf-button--${size} has-text-align-${alignment}`,
	});

	return (
		<>
			<BlockControls>
				<AlignmentToolbar
					value={alignment}
					onChange={(value) => setAttributes({ alignment: value || 'left' })}
				/>
			</BlockControls>
			<InspectorControls>
				<PanelBody title={__('Button settings', 'kpf-core')}>
					<TextControl
						label={__('Destination address', 'kpf-core')}
						help={__('Paste a page address or a full external URL.', 'kpf-core')}
						value={url}
						onChange={(value) => setAttributes({ url: value })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={__('Open in a new tab', 'kpf-core')}
						checked={opensInNewTab}
						onChange={(value) => setAttributes({ opensInNewTab: value })}
					/>
					<SelectControl
						label={__('Appearance', 'kpf-core')}
						value={variant}
						options={variants.button}
						onChange={(value) => setAttributes({ variant: value })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={__('Size', 'kpf-core')}
						value={size}
						options={variants.size}
						onChange={(value) => setAttributes({ size: value })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>
			<div {...blockProps}>
				<div className="kpf-button__link">
					<RichText
						tagName="span"
						className="kpf-button__label"
						value={text}
						allowedFormats={[]}
						placeholder={__('Button text…', 'kpf-core')}
						onChange={(value) => setAttributes({ text: value })}
					/>
				</div>
				{!url ? (
					<span className="kpf-component-hint">
						{__('Add a destination in the sidebar.', 'kpf-core')}
					</span>
				) : null}
			</div>
		</>
	);
}

function ButtonSave({ attributes }) {
	const { text, url, opensInNewTab, variant, size, alignment } = attributes;
	const blockProps = useBlockProps.save({
		className: `kpf-button kpf-button--${variant} kpf-button--${size} has-text-align-${alignment}`,
	});

	return (
		<div {...blockProps}>
			<a
				className="kpf-button__link"
				href={url || undefined}
				target={opensInNewTab ? '_blank' : undefined}
				rel={opensInNewTab ? 'noopener noreferrer' : undefined}
			>
				<RichText.Content tagName="span" className="kpf-button__label" value={text} />
			</a>
		</div>
	);
}

function DisclosureEdit({ attributes, setAttributes }) {
	const { summary, openInitially } = attributes;
	const blockProps = useBlockProps({ className: 'kpf-disclosure is-editor-open' });

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Disclosure settings', 'kpf-core')}>
					<ToggleControl
						label={__('Open when the page first loads', 'kpf-core')}
						help={__(
							'Visitors can always open or close the section themselves.',
							'kpf-core'
						)}
						checked={openInitially}
						onChange={(value) => setAttributes({ openInitially: value })}
					/>
				</PanelBody>
			</InspectorControls>
			<div {...blockProps}>
				<div className="kpf-disclosure__summary">
					<RichText
						tagName="span"
						value={summary}
						allowedFormats={[]}
						placeholder={__('Question or section title…', 'kpf-core')}
						onChange={(value) => setAttributes({ summary: value })}
					/>
				</div>
				<div className="kpf-disclosure__content">
					<InnerBlocks
						allowedBlocks={COMPOSABLE_INNER_BLOCKS}
						template={[
							[
								'core/paragraph',
								{
									placeholder: __(
										'Add the information visitors will see after opening…',
										'kpf-core'
									),
								},
							],
						]}
						renderAppender={InnerBlocks.ButtonBlockAppender}
					/>
				</div>
			</div>
		</>
	);
}

function DisclosureSave({ attributes }) {
	const blockProps = useBlockProps.save({ className: 'kpf-disclosure' });
	return (
		<details {...blockProps} open={attributes.openInitially || undefined}>
			<RichText.Content
				tagName="summary"
				className="kpf-disclosure__summary"
				value={attributes.summary}
			/>
			<div className="kpf-disclosure__content">
				<InnerBlocks.Content />
			</div>
		</details>
	);
}

function CardEdit({ attributes, setAttributes }) {
	const { imageId, imageUrl, imageAlt, heading, body, linkText, url, variant } =
		attributes;
	const blockProps = useBlockProps({ className: `kpf-card kpf-card--${variant}` });

	function chooseImage(media) {
		setAttributes({
			imageId: media?.id || 0,
			imageUrl: media?.sizes?.large?.url || media?.url || '',
			imageAlt: media?.alt || '',
		});
	}

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Card settings', 'kpf-core')}>
					<SelectControl
						label={__('Appearance', 'kpf-core')}
						value={variant}
						options={[
							{ label: __('Warm paper', 'kpf-core'), value: 'paper' },
							{ label: __('White', 'kpf-core'), value: 'white' },
							{ label: __('Dark ink', 'kpf-core'), value: 'ink' },
						]}
						onChange={(value) => setAttributes({ variant: value })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={__('Destination address', 'kpf-core')}
						help={__('Optional. Leave blank when the card should not link anywhere.', 'kpf-core')}
						value={url}
						onChange={(value) => setAttributes({ url: value })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					{imageUrl ? (
						<TextControl
							label={__('Image description', 'kpf-core')}
							help={__('Describe the image for visitors using screen readers.', 'kpf-core')}
							value={imageAlt}
							onChange={(value) => setAttributes({ imageAlt: value })}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					) : null}
				</PanelBody>
			</InspectorControls>
			<article {...blockProps}>
				<div className="kpf-card__media">
					{imageUrl ? <img src={imageUrl} alt="" /> : null}
					<MediaUploadCheck>
						<MediaUpload
							allowedTypes={['image']}
							value={imageId}
							onSelect={chooseImage}
							render={({ open }) => (
								<Button variant="secondary" onClick={open}>
									{imageUrl
										? __('Replace image', 'kpf-core')
										: __('Choose an image', 'kpf-core')}
								</Button>
							)}
						/>
					</MediaUploadCheck>
					{imageUrl ? (
						<Button
							variant="link"
							isDestructive
							onClick={() =>
								setAttributes({ imageId: 0, imageUrl: '', imageAlt: '' })
							}
						>
							{__('Remove', 'kpf-core')}
						</Button>
					) : null}
				</div>
				<div className="kpf-card__content">
					<RichText
						tagName="h3"
						className="kpf-card__heading"
						value={heading}
						allowedFormats={[]}
						placeholder={__('Card heading…', 'kpf-core')}
						onChange={(value) => setAttributes({ heading: value })}
					/>
					<RichText
						tagName="p"
						className="kpf-card__body"
						value={body}
						placeholder={__('Short summary…', 'kpf-core')}
						onChange={(value) => setAttributes({ body: value })}
					/>
					<RichText
						tagName="span"
						className="kpf-card__link-label"
						value={linkText}
						allowedFormats={[]}
						placeholder={__('Link text…', 'kpf-core')}
						onChange={(value) => setAttributes({ linkText: value })}
					/>
				</div>
			</article>
		</>
	);
}

function CardSave({ attributes }) {
	const { imageId, imageUrl, imageAlt, heading, body, linkText, url, variant } =
		attributes;
	const blockProps = useBlockProps.save({ className: `kpf-card kpf-card--${variant}` });

	return (
		<article {...blockProps}>
			{imageUrl ? (
				<figure className="kpf-card__media">
					<img
						src={imageUrl}
						alt={imageAlt || ''}
						className={imageId ? `wp-image-${imageId}` : undefined}
					/>
				</figure>
			) : null}
			<div className="kpf-card__content">
				<RichText.Content tagName="h3" className="kpf-card__heading" value={heading} />
				<RichText.Content tagName="p" className="kpf-card__body" value={body} />
				{url ? (
					<a className="kpf-card__link" href={url}>
						<RichText.Content
							tagName="span"
							className="kpf-card__link-label"
							value={linkText}
						/>
						<span aria-hidden="true"> →</span>
					</a>
				) : null}
			</div>
		</article>
	);
}

function NoticeEdit({ attributes, setAttributes }) {
	const blockProps = useBlockProps({
		className: `kpf-notice kpf-notice--${attributes.tone}`,
	});

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Notice settings', 'kpf-core')}>
					<SelectControl
						label={__('Message type', 'kpf-core')}
						value={attributes.tone}
						options={[
							{ label: __('Information', 'kpf-core'), value: 'information' },
							{ label: __('Good news', 'kpf-core'), value: 'success' },
							{ label: __('Warning', 'kpf-core'), value: 'warning' },
						]}
						onChange={(value) => setAttributes({ tone: value })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>
			<aside {...blockProps}>
				<span className="kpf-notice__icon" aria-hidden="true">
					i
				</span>
				<div>
					<RichText
						tagName="h3"
						className="kpf-notice__heading"
						value={attributes.heading}
						allowedFormats={[]}
						placeholder={__('Notice heading…', 'kpf-core')}
						onChange={(value) => setAttributes({ heading: value })}
					/>
					<RichText
						tagName="p"
						className="kpf-notice__body"
						value={attributes.body}
						placeholder={__('Notice text…', 'kpf-core')}
						onChange={(value) => setAttributes({ body: value })}
					/>
				</div>
			</aside>
		</>
	);
}

function NoticeSave({ attributes }) {
	const blockProps = useBlockProps.save({
		className: `kpf-notice kpf-notice--${attributes.tone}`,
	});
	return (
		<aside {...blockProps}>
			<span className="kpf-notice__icon" aria-hidden="true">
				i
			</span>
			<div>
				<RichText.Content
					tagName="h3"
					className="kpf-notice__heading"
					value={attributes.heading}
				/>
				<RichText.Content
					tagName="p"
					className="kpf-notice__body"
					value={attributes.body}
				/>
			</div>
		</aside>
	);
}

function CtaEdit({ attributes, setAttributes }) {
	const { eyebrow, heading, body, theme, layout } = attributes;
	const blockProps = useBlockProps({
		className: `kpf-cta kpf-cta--${theme} kpf-cta--${layout}`,
	});

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Call-to-action settings', 'kpf-core')}>
					<SelectControl
						label={__('Color theme', 'kpf-core')}
						value={theme}
						options={[
							{ label: __('Dark ink', 'kpf-core'), value: 'ink' },
							{ label: __('Warm paper', 'kpf-core'), value: 'paper' },
							{ label: __('Heritage red', 'kpf-core'), value: 'heritage' },
						]}
						onChange={(value) => setAttributes({ theme: value })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={__('Layout', 'kpf-core')}
						value={layout}
						options={[
							{ label: __('Stacked', 'kpf-core'), value: 'stacked' },
							{ label: __('Text beside buttons', 'kpf-core'), value: 'split' },
						]}
						onChange={(value) => setAttributes({ layout: value })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>
			<section {...blockProps}>
				<div className="kpf-cta__copy">
					<RichText
						tagName="p"
						className="kpf-cta__eyebrow"
						value={eyebrow}
						allowedFormats={[]}
						placeholder={__('Short introduction…', 'kpf-core')}
						onChange={(value) => setAttributes({ eyebrow: value })}
					/>
					<RichText
						tagName="h2"
						className="kpf-cta__heading"
						value={heading}
						allowedFormats={[]}
						placeholder={__('Call-to-action heading…', 'kpf-core')}
						onChange={(value) => setAttributes({ heading: value })}
					/>
					<RichText
						tagName="p"
						className="kpf-cta__body"
						value={body}
						placeholder={__('Explain the next step…', 'kpf-core')}
						onChange={(value) => setAttributes({ body: value })}
					/>
				</div>
				<div className="kpf-cta__actions">
					<InnerBlocks
						allowedBlocks={COMPOSABLE_INNER_BLOCKS}
						template={[
							[
								'kpf/button',
								{
									text: __('Take action', 'kpf-core'),
									variant: theme === 'paper' ? 'primary' : 'secondary',
								},
							],
						]}
						renderAppender={InnerBlocks.ButtonBlockAppender}
					/>
				</div>
			</section>
		</>
	);
}

function CtaSave({ attributes }) {
	const blockProps = useBlockProps.save({
		className: `kpf-cta kpf-cta--${attributes.theme} kpf-cta--${attributes.layout}`,
	});
	return (
		<section {...blockProps}>
			<div className="kpf-cta__copy">
				<RichText.Content
					tagName="p"
					className="kpf-cta__eyebrow"
					value={attributes.eyebrow}
				/>
				<RichText.Content
					tagName="h2"
					className="kpf-cta__heading"
					value={attributes.heading}
				/>
				<RichText.Content
					tagName="p"
					className="kpf-cta__body"
					value={attributes.body}
				/>
			</div>
			<div className="kpf-cta__actions">
				<InnerBlocks.Content />
			</div>
		</section>
	);
}

function containerClassName(attributes) {
	const { theme, padding, contentWidth } = attributes;
	return [
		'kpf-container',
		theme !== 'none' ? `kpf-container--${theme}` : '',
		`kpf-container--pad-${padding}`,
		contentWidth !== 'default' ? `kpf-container--${contentWidth}` : '',
	]
		.filter(Boolean)
		.join(' ');
}

function ContainerEdit({ attributes, setAttributes }) {
	const { tagName, theme, padding, contentWidth } = attributes;
	const Tag = tagName || 'div';
	const blockProps = useBlockProps({ className: containerClassName(attributes) });

	return (
		<>
			<InspectorControls>
				<PanelBody title={__('Container settings', 'kpf-core')}>
					<SelectControl
						label={__('HTML element', 'kpf-core')}
						help={__(
							'Choose how this wrapper appears in the page markup. Div is a generic box; section marks a distinct page region.',
							'kpf-core'
						)}
						value={tagName}
						options={[
							{ label: __('Div', 'kpf-core'), value: 'div' },
							{ label: __('Section', 'kpf-core'), value: 'section' },
							{ label: __('Aside', 'kpf-core'), value: 'aside' },
						]}
						onChange={(value) => setAttributes({ tagName: value })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={__('Background', 'kpf-core')}
						value={theme}
						options={[
							{ label: __('None', 'kpf-core'), value: 'none' },
							{ label: __('Warm paper', 'kpf-core'), value: 'paper' },
							{ label: __('White', 'kpf-core'), value: 'white' },
							{ label: __('Dark ink', 'kpf-core'), value: 'ink' },
						]}
						onChange={(value) => setAttributes({ theme: value })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={__('Padding', 'kpf-core')}
						value={padding}
						options={[
							{ label: __('None', 'kpf-core'), value: 'none' },
							{ label: __('Small', 'kpf-core'), value: 'small' },
							{ label: __('Medium', 'kpf-core'), value: 'medium' },
							{ label: __('Large', 'kpf-core'), value: 'large' },
						]}
						onChange={(value) => setAttributes({ padding: value })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={__('Inner content width', 'kpf-core')}
						value={contentWidth}
						options={[
							{ label: __('Default', 'kpf-core'), value: 'default' },
							{ label: __('Narrow', 'kpf-core'), value: 'narrow' },
							{ label: __('Wide', 'kpf-core'), value: 'wide-inner' },
						]}
						onChange={(value) => setAttributes({ contentWidth: value })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>
			<Tag {...blockProps}>
				<InnerBlocks
					allowedBlocks={COMPOSABLE_INNER_BLOCKS}
					template={[
						[
							'core/paragraph',
							{
								placeholder: __(
									'Add any blocks or Foundation components inside this container…',
									'kpf-core'
								),
							},
						],
					]}
					renderAppender={InnerBlocks.ButtonBlockAppender}
				/>
			</Tag>
		</>
	);
}

function ContainerSave({ attributes }) {
	const Tag = attributes.tagName || 'div';
	const blockProps = useBlockProps.save({
		className: containerClassName(attributes),
	});
	return (
		<Tag {...blockProps}>
			<InnerBlocks.Content />
		</Tag>
	);
}

registerBlockType(buttonMetadata, {
	edit: ButtonEdit,
	save: ButtonSave,
});
registerBlockType(disclosureMetadata, {
	edit: DisclosureEdit,
	save: DisclosureSave,
});
registerBlockType(cardMetadata, {
	edit: CardEdit,
	save: CardSave,
});
registerBlockType(noticeMetadata, {
	edit: NoticeEdit,
	save: NoticeSave,
});
registerBlockType(ctaMetadata, {
	edit: CtaEdit,
	save: CtaSave,
});
registerBlockType(containerMetadata, {
	edit: ContainerEdit,
	save: ContainerSave,
});

const COMPONENT_IMPORT_MAX_BYTES = 1024 * 1024;
const COMPONENT_IMPORT_EXTENSIONS = ['html', 'htm', 'txt', 'json'];

function importedFileTitle(filename) {
	return filename
		.replace(/\.[^.]+$/, '')
		.replace(/[-_]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function createImportedBlock(definition) {
	const name = definition?.name || definition?.blockName;
	if (!name) return null;

	const innerBlocks = (definition.innerBlocks || [])
		.map(createImportedBlock)
		.filter(Boolean);

	return createBlock(
		name,
		definition.attributes || definition.attrs || {},
		innerBlocks
	);
}

function blocksFromDomNode(node) {
	if (node.nodeType === window.Node.TEXT_NODE) {
		const text = node.textContent?.trim();
		return text ? rawHandler({ HTML: text }) : [];
	}

	if (node.nodeType !== window.Node.ELEMENT_NODE) {
		return [];
	}

	const tagName = node.tagName.toLowerCase();
	const containerTags = [
		'article',
		'aside',
		'div',
		'footer',
		'header',
		'main',
		'nav',
		'section',
	];

	if (containerTags.includes(tagName)) {
		const innerBlocks = Array.from(node.childNodes).flatMap(blocksFromDomNode);
		if (innerBlocks.length === 0) {
			return rawHandler({ HTML: node.outerHTML });
		}

		const attributes = {
			tagName,
			className: node.getAttribute('class') || undefined,
			anchor: node.getAttribute('id') || undefined,
		};

		return [createBlock('core/group', attributes, innerBlocks)];
	}

	return rawHandler({ HTML: node.outerHTML });
}

function blocksFromHtml(source) {
	const document = new window.DOMParser().parseFromString(source, 'text/html');
	const scripts = Array.from(document.querySelectorAll('script'));
	scripts.forEach((script) => script.remove());

	const styleBlocks = Array.from(document.head.querySelectorAll('style')).map(
		(style) => createBlock('core/html', { content: style.outerHTML })
	);
	const visualBlocks = Array.from(document.body.childNodes).flatMap(blocksFromDomNode);

	return {
		blocks: [...styleBlocks, ...visualBlocks],
		removedScripts: scripts.length,
	};
}

function parseComponentImport(filename, source) {
	let title = importedFileTitle(filename);
	let content = source;
	let blocks = null;

	if (filename.toLowerCase().endsWith('.json')) {
		let payload;
		try {
			payload = JSON.parse(source);
		} catch {
			throw new Error(__('This JSON file is not valid.', 'kpf-core'));
		}

		const payloadTitle = payload?.title?.raw || payload?.title;
		if (typeof payloadTitle === 'string' && payloadTitle.trim()) {
			title = payloadTitle.trim();
		}

		if (Array.isArray(payload)) {
			blocks = payload.map(createImportedBlock).filter(Boolean);
		} else if (Array.isArray(payload?.blocks)) {
			blocks = payload.blocks.map(createImportedBlock).filter(Boolean);
		} else {
			content =
				payload?.content?.raw ||
				payload?.content ||
				payload?.post_content ||
				payload?.markup ||
				'';
		}

		if (!blocks && typeof content !== 'string') {
			throw new Error(
				__(
					'This JSON file does not contain Gutenberg blocks or component markup.',
					'kpf-core'
				)
			);
		}
	}

	let removedScripts = 0;
	if (!blocks) {
		if (/<!--\s+wp:[\w/-]+/.test(content)) {
			blocks = parse(content);
		} else {
			const parsed = blocksFromHtml(content);
			blocks = parsed.blocks;
			removedScripts = parsed.removedScripts;
		}
	}

	if (!Array.isArray(blocks) || blocks.length === 0) {
		throw new Error(
			__(
				'No visual content could be found in this file. Check that it contains HTML or Gutenberg blocks.',
				'kpf-core'
			)
		);
	}

	return { blocks, removedScripts, title };
}

function ComponentImportPanel() {
	const [isOpen, setIsOpen] = useState(false);
	const [isReading, setIsReading] = useState(false);
	const [notice, setNotice] = useState(null);
	const [selectedFilename, setSelectedFilename] = useState('');
	const fileInput = useRef(null);
	const postType = useSelect(
		(select) => select('core/editor')?.getCurrentPostType(),
		[]
	);
	const currentTitle = useSelect(
		(select) => select('core/editor')?.getEditedPostAttribute('title'),
		[]
	);
	const blockCount = useSelect(
		(select) => select('core/block-editor')?.getBlockCount() || 0,
		[]
	);
	const { resetBlocks } = useDispatch('core/block-editor');
	const { editPost } = useDispatch('core/editor');

	useEffect(() => {
		if (postType !== 'wp_block') return;

		const url = new URL(window.location.href);
		if (url.searchParams.get('kpf_import') !== '1') return;

		setIsOpen(true);
		url.searchParams.delete('kpf_import');
		window.history.replaceState({}, '', url.toString());
	}, [postType]);

	if (postType !== 'wp_block') return null;

	async function importFile(file) {
		if (!file) return;

		const extension = file.name.split('.').pop()?.toLowerCase() || '';
		setSelectedFilename(file.name);
		setNotice(null);

		if (!COMPONENT_IMPORT_EXTENSIONS.includes(extension)) {
			setNotice({
				status: 'error',
				message: __(
					'Choose an HTML, HTM, TXT, or WordPress pattern JSON file.',
					'kpf-core'
				),
			});
			return;
		}

		if (file.size > COMPONENT_IMPORT_MAX_BYTES) {
			setNotice({
				status: 'error',
				message: __('The component file must be 1 MB or smaller.', 'kpf-core'),
			});
			return;
		}

		if (
			blockCount > 0 &&
			!window.confirm(
				__(
					'Importing this file will replace every block currently in the component editor. Continue?',
					'kpf-core'
				)
			)
		) {
			return;
		}

		setIsReading(true);
		try {
			const imported = parseComponentImport(file.name, await file.text());
			resetBlocks(imported.blocks);
			if (!String(currentTitle || '').trim() && imported.title) {
				editPost({ title: imported.title });
			}

			setIsOpen(false);
			setNotice({
				status: imported.removedScripts ? 'warning' : 'success',
				message: imported.removedScripts
					? __(
							'The visual content was imported. Executable scripts were omitted for security; add behavior with the Interactions builder.',
							'kpf-core'
						)
					: __(
							'The file has been built in the canvas. Review the visual result, then save the component.',
							'kpf-core'
						),
			});
		} catch (error) {
			setNotice({
				status: 'error',
				message:
					error?.message ||
					__('The component file could not be imported.', 'kpf-core'),
			});
		} finally {
			setIsReading(false);
		}
	}

	function openImporter() {
		setSelectedFilename('');
		setNotice(null);
		setIsOpen(true);
	}

	return (
		<>
			<PluginDocumentSettingPanel
				name="kpf-component-import"
				title={__('Create from upload', 'kpf-core')}
				className="kpf-component-import-panel"
			>
				<p>
					{__(
						'Import a file and turn its contents into editable blocks in the visual canvas.',
						'kpf-core'
					)}
				</p>
				<Button variant="secondary" onClick={openImporter}>
					{__('Choose component file', 'kpf-core')}
				</Button>
				{notice ? (
					<Notice status={notice.status} isDismissible onRemove={() => setNotice(null)}>
						{notice.message}
					</Notice>
				) : null}
			</PluginDocumentSettingPanel>

			{isOpen ? (
				<Modal
					title={__('Create component from upload', 'kpf-core')}
					onRequestClose={() => setIsOpen(false)}
					className="kpf-component-import-modal"
				>
					<p>
						{__(
							'Upload HTML, serialized Gutenberg markup, or a WordPress pattern JSON file. Recognized content is converted into blocks and loaded directly into the visual editor.',
							'kpf-core'
						)}
					</p>
					<div
						className="kpf-component-import-dropzone"
						onDragOver={(event) => event.preventDefault()}
						onDrop={(event) => {
							event.preventDefault();
							importFile(event.dataTransfer.files?.[0]);
						}}
					>
						<input
							ref={fileInput}
							type="file"
							accept=".html,.htm,.txt,.json,text/html,text/plain,application/json"
							onChange={(event) => importFile(event.target.files?.[0])}
							hidden
						/>
						<strong>
							{selectedFilename ||
								__('Drop a component file here', 'kpf-core')}
						</strong>
						<span>{__('or', 'kpf-core')}</span>
						<Button
							variant="primary"
							onClick={() => fileInput.current?.click()}
							isBusy={isReading}
							disabled={isReading}
						>
							{isReading
								? __('Reading file…', 'kpf-core')
								: __('Select file', 'kpf-core')}
						</Button>
						<small>
							{__('HTML, HTM, TXT, or JSON · maximum 1 MB', 'kpf-core')}
						</small>
					</div>
					{notice ? (
						<Notice
							status={notice.status}
							isDismissible
							onRemove={() => setNotice(null)}
						>
							{notice.message}
						</Notice>
					) : null}
					<p className="kpf-component-import-note">
						{__(
							'For security, executable scripts are not imported. Use Interactions → GSAP to add component behavior after saving.',
							'kpf-core'
						)}
					</p>
				</Modal>
			) : null}
		</>
	);
}

function ComponentLibrarySidebar() {
	const [search, setSearch] = useState('');
	const [openGroups, setOpenGroups] = useState({});
	const { insertBlocks } = useDispatch('core/block-editor');
	const { records: patterns, isResolving: loadingPatterns } = useEntityRecords(
		'postType',
		'wp_block',
		{
			per_page: 100,
			context: 'edit',
			status: 'publish',
			orderby: 'title',
			order: 'asc',
		}
	);
	const { records: groups, isResolving: loadingGroups } = useEntityRecords(
		'taxonomy',
		'kpf_component_group',
		{
			per_page: 100,
			hide_empty: false,
			orderby: 'name',
			order: 'asc',
		}
	);

	const filtered = useMemo(() => {
		const needle = search.trim().toLowerCase();
		if (!needle) return patterns || [];
		return (patterns || []).filter((pattern) =>
			(pattern.title?.raw || pattern.title?.rendered || '')
				.toLowerCase()
				.includes(needle)
		);
	}, [patterns, search]);

	function addPattern(pattern) {
		const syncStatus = pattern.wp_pattern_sync_status;
		const blocks =
			syncStatus === 'unsynced'
				? parse(pattern.content?.raw || '')
				: [createBlock('core/block', { ref: pattern.id })];
		if (blocks.length) {
			insertBlocks(blocks);
		}
	}

	function patternsForGroup(groupId) {
		return filtered.filter((pattern) =>
			(pattern.kpf_component_group || []).includes(groupId)
		);
	}

	function descendantGroupIds(groupId) {
		const childIds = (groups || [])
			.filter((group) => group.parent === groupId)
			.flatMap((group) => descendantGroupIds(group.id));
		return [groupId, ...childIds];
	}

	function patternCountForGroup(groupId) {
		const ids = new Set(descendantGroupIds(groupId));
		return filtered.filter((pattern) =>
			(pattern.kpf_component_group || []).some((id) => ids.has(id))
		).length;
	}

	function renderGroup(parent = 0, depth = 0) {
		return (groups || [])
			.filter((group) => group.parent === parent)
			.map((group) => {
				const items = patternsForGroup(group.id);
				const children = (groups || []).some((candidate) => candidate.parent === group.id);
				const isOpen = openGroups[group.id] !== false;
				return (
					<div
						key={group.id}
						className="kpf-library-group"
						style={{ marginLeft: depth * 12 }}
					>
						<Button
							variant="tertiary"
							className="kpf-library-group__toggle"
							onClick={() =>
								setOpenGroups((current) => ({
									...current,
									[group.id]: !isOpen,
								}))
							}
							aria-expanded={isOpen}
						>
							<span aria-hidden="true">{isOpen ? '▾' : '▸'}</span>{' '}
							{group.name}{' '}
							<span className="kpf-library-group__count">
								({patternCountForGroup(group.id)})
							</span>
						</Button>
						{isOpen ? (
							<>
								{items.map((pattern) => (
									<PatternButton
										key={pattern.id}
										pattern={pattern}
										onInsert={() => addPattern(pattern)}
									/>
								))}
								{children ? renderGroup(group.id, depth + 1) : null}
							</>
						) : null}
					</div>
				);
			});
	}

	const groupedIds = new Set(
		filtered.flatMap((pattern) => pattern.kpf_component_group || [])
	);
	const ungrouped = filtered.filter(
		(pattern) =>
			!(pattern.kpf_component_group || []).some((groupId) => groupedIds.has(groupId))
	);

	return (
		<>
			<PluginSidebarMoreMenuItem target="kpf-component-library">
				{__('Component Library', 'kpf-core')}
			</PluginSidebarMoreMenuItem>
			<PluginSidebar
				name="kpf-component-library"
				title={__('Component Library', 'kpf-core')}
				icon="layout"
			>
				<div className="kpf-library-sidebar">
					<p>
						{__(
							'Choose a saved component. Synced items stay connected; independent items can be changed after insertion.',
							'kpf-core'
						)}
					</p>
					<SearchControl
						label={__('Search saved components', 'kpf-core')}
						value={search}
						onChange={setSearch}
						__nextHasNoMarginBottom
					/>
					{loadingPatterns || loadingGroups ? <Spinner /> : null}
					{!loadingPatterns && !loadingGroups ? renderGroup() : null}
					{ungrouped.length ? (
						<div className="kpf-library-group">
							<strong>{__('Ungrouped', 'kpf-core')}</strong>
							{ungrouped.map((pattern) => (
								<PatternButton
									key={pattern.id}
									pattern={pattern}
									onInsert={() => addPattern(pattern)}
								/>
							))}
						</div>
					) : null}
					{!loadingPatterns && filtered.length === 0 ? (
						<Notice status="info" isDismissible={false}>
							{__('No saved components match your search.', 'kpf-core')}
						</Notice>
					) : null}
				</div>
			</PluginSidebar>
		</>
	);
}

function PatternButton({ pattern, onInsert }) {
	const independent = pattern.wp_pattern_sync_status === 'unsynced';
	const title =
		pattern.title?.raw ||
		pattern.title?.rendered ||
		__('Untitled component', 'kpf-core');
	return (
		<button type="button" className="kpf-library-item" onClick={onInsert}>
			<strong>{title}</strong>
			<span>
				{independent
					? __('Independent copy', 'kpf-core')
					: __('Synced everywhere', 'kpf-core')}
			</span>
		</button>
	);
}

registerPlugin('kpf-component-library', {
	render: () => (
		<>
			<ComponentLibrarySidebar />
			<ComponentImportPanel />
		</>
	),
	icon: 'layout',
});
