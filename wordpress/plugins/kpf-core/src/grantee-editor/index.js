import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { Button, TextareaControl, TextControl } from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';

const META_KEY = window.kpfGranteeEditor?.metaKey || '_kpf_grantee';

const DEFAULTS = {
	version: 2,
	contact_name: '',
	website: '',
	blurb: '',
};

function GranteeSidebar() {
	const postType = useSelect(
		(select) => select('core/editor').getCurrentPostType(),
		[]
	);
	const [meta, setMeta] = useEntityProp('postType', postType || 'kpf_grantee', 'meta');
	const [featuredMediaId, setFeaturedMediaId] = useEntityProp(
		'postType',
		postType || 'kpf_grantee',
		'featured_media'
	);
	const media = useSelect(
		(select) =>
			featuredMediaId
				? select('core').getMedia(featuredMediaId)
				: null,
		[featuredMediaId]
	);

	const bag = { ...DEFAULTS, ...(meta?.[META_KEY] || {}) };

	const update = (patch) => {
		setMeta({
			...meta,
			[META_KEY]: { ...bag, ...patch, version: 2 },
		});
	};

	const logoUrl =
		media?.media_details?.sizes?.thumbnail?.source_url ||
		media?.source_url ||
		'';

	return (
		<PluginDocumentSettingPanel
			name="kpf-grantee-details"
			title={__('Grantee details', 'kpf-core')}
			className="kpf-grantee-editor-panel"
			initialOpen
		>
			<p style={{ marginTop: 0, color: '#646970' }}>
				{__(
					'Organization details for the partners slider. Awards are managed under Grants.',
					'kpf-core'
				)}
			</p>

			<div style={{ marginBottom: 16 }}>
				<strong style={{ display: 'block', marginBottom: 8 }}>
					{__('Logo / profile image', 'kpf-core')}
				</strong>
				{logoUrl ? (
					<img
						src={logoUrl}
						alt=""
						style={{
							display: 'block',
							width: 96,
							height: 96,
							objectFit: 'contain',
							marginBottom: 8,
							borderRadius: 4,
							background: '#f6f7f7',
							border: '1px solid #dcdcde',
						}}
					/>
				) : null}
				<MediaUploadCheck>
					<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
						<MediaUpload
							onSelect={(selected) =>
								setFeaturedMediaId(selected?.id || 0)
							}
							allowedTypes={['image']}
							value={featuredMediaId || 0}
							render={({ open }) => (
								<Button variant="secondary" onClick={open}>
									{featuredMediaId
										? __('Replace logo', 'kpf-core')
										: __('Set logo', 'kpf-core')}
								</Button>
							)}
						/>
						{featuredMediaId ? (
							<Button
								variant="tertiary"
								isDestructive
								onClick={() => setFeaturedMediaId(0)}
							>
								{__('Remove', 'kpf-core')}
							</Button>
						) : null}
					</div>
				</MediaUploadCheck>
				<p style={{ margin: '8px 0 0', color: '#646970', fontSize: 12 }}>
					{__('JPEG, PNG, or SVG preferred.', 'kpf-core')}
				</p>
			</div>

			<TextControl
				label={__('Point of contact', 'kpf-core')}
				help={__('Optional. Admin-only; not shown in the slider.', 'kpf-core')}
				value={bag.contact_name || ''}
				onChange={(contact_name) => update({ contact_name })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={__('Website', 'kpf-core')}
				help={__('Preferred. Include https:// when possible.', 'kpf-core')}
				type="url"
				placeholder="https://"
				value={bag.website || ''}
				onChange={(website) => update({ website })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			<TextareaControl
				label={__('Mission / blurb', 'kpf-core')}
				help={__(
					'Optional. Short description, mission statement, or blurb for the partners slider.',
					'kpf-core'
				)}
				value={bag.blurb || ''}
				onChange={(blurb) => update({ blurb })}
				rows={4}
				__nextHasNoMarginBottom
			/>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin('kpf-grantee-editor', {
	render: GranteeSidebar,
});
