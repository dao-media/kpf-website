import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import {
	Button,
	Notice,
	PanelBody,
	SelectControl,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { useMemo } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import HistoricalDateFields, {
	composeEventDate,
	parseDateParts,
} from './HistoricalDateFields';

const META_KEY = window.kpfScrapbookEditor?.metaKey || '_kpf_scrapbook';

const DEFAULTS = {
	version: 1,
	entry_type: 'photo',
	event_date: '',
	date_precision: 'unknown',
	location: '',
	photographer: '',
	source: '',
	historical_notes: '',
	featured: false,
	display_order: 0,
	images: [],
};

function ImagePlacement({ placement, index, total, onChange, onMove, onRemove }) {
	const media = useSelect(
		(select) => select('core').getMedia(placement.attachment_id),
		[placement.attachment_id]
	);

	const previewUrl =
		media?.media_details?.sizes?.medium?.source_url ||
		media?.media_details?.sizes?.thumbnail?.source_url ||
		media?.source_url ||
		'';
	const fallbackAlt = media?.alt_text || '';
	const effectiveAlt = placement.alt_text || fallbackAlt;

	return (
		<div
			style={{
				border: '1px solid #dcdcde',
				borderRadius: 4,
				padding: 12,
				marginBottom: 12,
				background: '#fff',
			}}
		>
			{previewUrl ? (
				<img
					src={previewUrl}
					alt=""
					style={{
						display: 'block',
						width: '100%',
						maxHeight: 180,
						objectFit: 'cover',
						borderRadius: 3,
						marginBottom: 10,
					}}
				/>
			) : (
				<p>{__('Loading image preview…', 'kpf-core')}</p>
			)}

			<p style={{ marginTop: 0 }}>
				<strong>
					{sprintf(
						/* translators: 1: image position, 2: total images */
						__('Image %1$d of %2$d', 'kpf-core'),
						index + 1,
						total
					)}
				</strong>
			</p>

			<TextControl
				label={__('Image description for screen readers', 'kpf-core')}
				help={
					fallbackAlt
						? __(
								'Leave this blank to use the description already saved in the Media Library.',
								'kpf-core'
							)
						: __(
								'Briefly describe what is visible in the image. This helps visitors who use screen readers.',
								'kpf-core'
							)
				}
				placeholder={fallbackAlt || __('Example: Kevin speaking at the 2018 fundraiser', 'kpf-core')}
				value={placement.alt_text || ''}
				onChange={(alt_text) => onChange({ ...placement, alt_text })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			{!effectiveAlt ? (
				<Notice status="warning" isDismissible={false}>
					{__(
						'This image does not have a description yet. Add one before publishing.',
						'kpf-core'
					)}
				</Notice>
			) : null}
			<TextareaControl
				label={__('Caption for this story', 'kpf-core')}
				help={__(
					'Optional. This caption is used only in this scrapbook item and does not change the Media Library.',
					'kpf-core'
				)}
				value={placement.caption || ''}
				onChange={(caption) => onChange({ ...placement, caption })}
				__nextHasNoMarginBottom
			/>

			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
				<Button
					variant="secondary"
					size="compact"
					disabled={index === 0}
					onClick={() => onMove(index, index - 1)}
				>
					{__('Move up', 'kpf-core')}
				</Button>
				<Button
					variant="secondary"
					size="compact"
					disabled={index === total - 1}
					onClick={() => onMove(index, index + 1)}
				>
					{__('Move down', 'kpf-core')}
				</Button>
				<Button variant="link" isDestructive onClick={() => onRemove(index)}>
					{__('Remove image', 'kpf-core')}
				</Button>
			</div>
		</div>
	);
}

function ScrapbookPanel() {
	const postType = useSelect((select) => select('core/editor').getCurrentPostType(), []);
	const [allMeta, setAllMeta] = useEntityProp('postType', postType, 'meta');
	const details = useMemo(
		() => ({ ...DEFAULTS, ...(allMeta?.[META_KEY] || {}) }),
		[allMeta]
	);

	function update(patch) {
		setAllMeta({
			...(allMeta || {}),
			[META_KEY]: {
				...details,
				...patch,
			},
		});
	}

	function updateEntryType(entry_type) {
		const images =
			entry_type === 'photo' && details.images.length > 1
				? details.images.slice(0, 1)
				: details.images;
		update({ entry_type, images });
	}

	function addImages(selection) {
		const selected = Array.isArray(selection) ? selection : [selection];
		const existing = new Set(details.images.map((image) => image.attachment_id));
		const additions = selected
			.filter((media) => media?.id && !existing.has(media.id))
			.map((media) => ({
				attachment_id: media.id,
				alt_text: '',
				caption: '',
			}));

		const images =
			details.entry_type === 'photo'
				? additions.length
					? additions.slice(0, 1)
					: details.images.slice(0, 1)
				: [...details.images, ...additions];
		update({ images });
	}

	function changeImage(index, placement) {
		const images = [...details.images];
		images[index] = placement;
		update({ images });
	}

	function removeImage(index) {
		update({ images: details.images.filter((_, imageIndex) => imageIndex !== index) });
	}

	function moveImage(from, to) {
		if (to < 0 || to >= details.images.length) return;
		const images = [...details.images];
		const [moved] = images.splice(from, 1);
		images.splice(to, 0, moved);
		update({ images });
	}

	const isStory = details.entry_type === 'story';

	return (
		<PluginDocumentSettingPanel
			name="kpf-scrapbook-details"
			title={__('Scrapbook details', 'kpf-core')}
			className="kpf-scrapbook-editor-panel"
		>
			<p>
				{__(
					'Choose whether this is one photo or a story made from several photos. Add the details you know; anything uncertain can be left blank.',
					'kpf-core'
				)}
			</p>

			<SelectControl
				label={__('What are you adding?', 'kpf-core')}
				value={details.entry_type}
				options={[
					{
						label: __('One photo', 'kpf-core'),
						value: 'photo',
					},
					{
						label: __('A story with several photos', 'kpf-core'),
						value: 'story',
					},
				]}
				onChange={updateEntryType}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>

			<PanelBody title={__('Images', 'kpf-core')} initialOpen>
				<p>
					{isStory
						? __(
								'Add the photos in the order you want them shown. You can move them after uploading.',
								'kpf-core'
							)
						: __(
								'Choose the photo for this scrapbook item. The first image also becomes its cover image.',
								'kpf-core'
							)}
				</p>

				{details.images.length === 0 ? (
					<Notice status="info" isDismissible={false}>
						{__('No images have been added yet.', 'kpf-core')}
					</Notice>
				) : null}

				{details.images.map((placement, index) => (
					<ImagePlacement
						key={placement.attachment_id}
						placement={placement}
						index={index}
						total={details.images.length}
						onChange={(next) => changeImage(index, next)}
						onMove={moveImage}
						onRemove={removeImage}
					/>
				))}

				<MediaUploadCheck>
					<MediaUpload
						allowedTypes={['image']}
						multiple={isStory}
						gallery={isStory}
						value={details.images.map((image) => image.attachment_id)}
						onSelect={addImages}
						render={({ open }) => (
							<Button variant="secondary" onClick={open}>
								{details.images.length
									? isStory
										? __('Add more images', 'kpf-core')
										: __('Replace image', 'kpf-core')
									: isStory
										? __('Choose images', 'kpf-core')
										: __('Choose an image', 'kpf-core')}
							</Button>
						)}
					/>
				</MediaUploadCheck>
			</PanelBody>

			<PanelBody title={__('When and where', 'kpf-core')} initialOpen>
				<SelectControl
					label={__('How exact is the date?', 'kpf-core')}
					value={details.date_precision}
					options={[
						{ label: __('Exact day', 'kpf-core'), value: 'exact' },
						{ label: __('Month and year', 'kpf-core'), value: 'month' },
						{ label: __('Year only', 'kpf-core'), value: 'year' },
						{ label: __('Decade only', 'kpf-core'), value: 'decade' },
						{ label: __('Date unknown', 'kpf-core'), value: 'unknown' },
					]}
					onChange={(date_precision) => {
						const parts = parseDateParts(details.event_date);
						update({
							date_precision,
							event_date:
								date_precision === 'unknown'
									? ''
									: composeEventDate(parts, date_precision),
						});
					}}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<HistoricalDateFields
					precision={details.date_precision}
					eventDate={details.event_date}
					onChange={(event_date) => update({ event_date })}
				/>
				<TextControl
					label={__('Place', 'kpf-core')}
					help={__('For example: Troy, Michigan or Kevin’s family home.', 'kpf-core')}
					value={details.location}
					onChange={(location) => update({ location })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</PanelBody>

			<PanelBody title={__('Photo history', 'kpf-core')} initialOpen={false}>
				<TextControl
					label={__('Photographer', 'kpf-core')}
					help={__('Who took the photo, if known.', 'kpf-core')}
					value={details.photographer}
					onChange={(photographer) => update({ photographer })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={__('Where the photo came from', 'kpf-core')}
					help={__(
						'For example: Popke family album, donated by Jane Smith, or newspaper archive.',
						'kpf-core'
					)}
					value={details.source}
					onChange={(source) => update({ source })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<TextareaControl
					label={__('Historical notes', 'kpf-core')}
					help={__(
						'Add useful background that belongs with the record but may not be part of the public story.',
						'kpf-core'
					)}
					value={details.historical_notes}
					onChange={(historical_notes) => update({ historical_notes })}
					__nextHasNoMarginBottom
				/>
			</PanelBody>

			<PanelBody title={__('Display options', 'kpf-core')} initialOpen={false}>
				<ToggleControl
					label={__('Feature this item', 'kpf-core')}
					help={__(
						'Featured items can be highlighted first when the public scrapbook is designed.',
						'kpf-core'
					)}
					checked={Boolean(details.featured)}
					onChange={(featured) => update({ featured })}
				/>
				<TextControl
					label={__('Manual order', 'kpf-core')}
					type="number"
					min={0}
					help={__(
						'Optional. Lower numbers come first. Leave this at 0 if you do not need a custom order.',
						'kpf-core'
					)}
					value={String(details.display_order || 0)}
					onChange={(value) =>
						update({ display_order: Math.max(0, Number.parseInt(value || '0', 10) || 0) })
					}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</PanelBody>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin('kpf-scrapbook-editor', {
	render: ScrapbookPanel,
	icon: 'format-gallery',
});
