import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import {
	Button,
	Notice,
	PanelBody,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { createRoot, useMemo } from '@wordpress/element';
import { __, sprintf as formatString } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import HistoricalDateFields from './HistoricalDateFields';

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

function entryTypeFromImages(images) {
	return images.length > 1 ? 'story' : 'photo';
}

function useScrapbookMeta() {
	const postType = useSelect(
		(select) => select('core/editor').getCurrentPostType(),
		[]
	);
	const postId = useSelect(
		(select) => select('core/editor').getCurrentPostId(),
		[]
	);
	const [allMeta, setAllMeta] = useEntityProp(
		'postType',
		postType,
		'meta',
		postId
	);
	const details = useMemo(() => {
		const merged = { ...DEFAULTS, ...(allMeta?.[META_KEY] || {}) };
		if (merged.date_precision === 'decade') {
			merged.date_precision = 'year';
		}
		return merged;
	}, [allMeta]);

	function update(patch) {
		setAllMeta({
			...(allMeta || {}),
			[META_KEY]: {
				...details,
				...patch,
			},
		});
	}

	return { details, update };
}

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
		<div className="kpf-scrapbook-image-card">
			{previewUrl ? (
				<img src={previewUrl} alt="" />
			) : (
				<p>{__('Loading image preview…', 'kpf-core')}</p>
			)}

			<p style={{ marginTop: 0 }}>
				<strong>
					{formatString(
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
				placeholder={
					fallbackAlt ||
					__('Example: Kevin speaking at the 2018 fundraiser', 'kpf-core')
				}
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

function ScrapbookImagesApp() {
	const { details, update } = useScrapbookMeta();
	const isStory = details.images.length > 1 || details.entry_type === 'story';

	function syncImages(images) {
		update({
			images,
			entry_type: entryTypeFromImages(images),
		});
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

		syncImages([...details.images, ...additions]);
	}

	function changeImage(index, placement) {
		const images = [...details.images];
		images[index] = placement;
		syncImages(images);
	}

	function removeImage(index) {
		syncImages(details.images.filter((_, imageIndex) => imageIndex !== index));
	}

	function moveImage(from, to) {
		if (to < 0 || to >= details.images.length) return;
		const images = [...details.images];
		const [moved] = images.splice(from, 1);
		images.splice(to, 0, moved);
		syncImages(images);
	}

	return (
		<div className="kpf-scrapbook-images-app">
			<p className="kpf-scrapbook-images-app__intro">
				{__(
					'Add one photo or several in the order you want them shown. Set the description above and other details in the Scrapbook details sidebar.',
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
					multiple
					gallery={isStory}
					value={details.images.map((image) => image.attachment_id)}
					onSelect={addImages}
					render={({ open }) => (
						<Button variant="secondary" onClick={open}>
							{details.images.length
								? __('Add more images', 'kpf-core')
								: __('Choose images', 'kpf-core')}
						</Button>
					)}
				/>
			</MediaUploadCheck>
		</div>
	);
}

function ScrapbookPanel() {
	const { details, update } = useScrapbookMeta();

	return (
		<PluginDocumentSettingPanel
			name="kpf-scrapbook-details"
			title={__('Scrapbook details', 'kpf-core')}
			className="kpf-scrapbook-editor-panel"
		>
			<p>
				{__(
					'Add images in the Images box below the description. Fill in When with as much detail as you know — year only, month and year, or a full date.',
					'kpf-core'
				)}
			</p>

			<PanelBody title={__('When and where', 'kpf-core')} initialOpen>
				<HistoricalDateFields
					eventDate={details.event_date}
					onChange={(event_date, date_precision) =>
						update({
							event_date,
							date_precision: date_precision || 'unknown',
						})
					}
				/>
				{details.event_date || details.date_precision !== 'unknown' ? (
					<p style={{ marginTop: 0, color: '#646970', fontSize: '12px' }}>
						{formatString(
							/* translators: %s: stored historical date string */
							__('Saved as: %s', 'kpf-core'),
							details.event_date || __('Unknown', 'kpf-core')
						)}
					</p>
				) : null}
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
			</PanelBody>
		</PluginDocumentSettingPanel>
	);
}

function mountScrapbookImages() {
	const el = document.getElementById('kpf-scrapbook-images-root');
	if (!el || el.dataset.kpfMounted === '1') {
		return;
	}

	const tryMount = () => {
		const postType = window.wp?.data?.select('core/editor')?.getCurrentPostType?.();
		if (!postType) {
			return false;
		}
		el.dataset.kpfMounted = '1';
		createRoot(el).render(<ScrapbookImagesApp />);
		return true;
	};

	if (tryMount()) {
		return;
	}

	if (!window.wp?.data?.subscribe) {
		return;
	}

	const unsubscribe = window.wp.data.subscribe(() => {
		if (tryMount()) {
			unsubscribe();
		}
	});
}

registerPlugin('kpf-scrapbook-editor', {
	render: ScrapbookPanel,
	icon: 'format-gallery',
});

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', mountScrapbookImages);
} else {
	mountScrapbookImages();
}
