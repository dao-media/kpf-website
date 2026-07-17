import { createBlock, parse, registerBlockType } from '@wordpress/blocks';
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
	Notice,
	PanelBody,
	SearchControl,
	SelectControl,
	Spinner,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { useEntityRecords } from '@wordpress/core-data';
import { useDispatch } from '@wordpress/data';
import { PluginSidebar, PluginSidebarMoreMenuItem } from '@wordpress/editor';
import { useMemo, useState } from '@wordpress/element';
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
	render: ComponentLibrarySidebar,
	icon: 'layout',
});
