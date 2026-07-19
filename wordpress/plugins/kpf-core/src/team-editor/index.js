import {
	Button,
	PanelBody,
	SelectControl,
	TextControl,
	TextareaControl,
} from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';

const META_KEY = window.kpfTeamEditor?.metaKey || '_kpf_team';
const SOCIAL_TYPES = window.kpfTeamEditor?.socialTypes || [
	'facebook',
	'instagram',
	'twitter',
	'linkedin',
	'youtube',
	'tiktok',
	'threads',
	'website',
	'other',
];

const DEFAULTS = {
	version: 1,
	job_title: '',
	short_summary: '',
	email: '',
	phone: '',
	social_links: [],
};

const SOCIAL_LABELS = {
	facebook: 'Facebook',
	instagram: 'Instagram',
	twitter: 'X / Twitter',
	linkedin: 'LinkedIn',
	youtube: 'YouTube',
	tiktok: 'TikTok',
	threads: 'Threads',
	website: 'Website',
	other: 'Other',
};

function TeamProfilePanel() {
	const postType = useSelect(
		(select) => select('core/editor').getCurrentPostType(),
		[]
	);
	const [meta, setMeta] = useEntityProp('postType', postType, 'meta');
	const details = { ...DEFAULTS, ...(meta?.[META_KEY] || {}) };

	const update = (patch) => {
		setMeta({
			...meta,
			[META_KEY]: { ...details, ...patch },
		});
	};

	const links = Array.isArray(details.social_links) ? details.social_links : [];

	const updateLink = (index, patch) => {
		const next = links.map((row, i) => (i === index ? { ...row, ...patch } : row));
		update({ social_links: next });
	};

	const addLink = (type) => {
		update({
			social_links: [...links, { type: type || 'website', url: '', label: '' }],
		});
	};

	const removeLink = (index) => {
		update({ social_links: links.filter((_, i) => i !== index) });
	};

	return (
		<PluginDocumentSettingPanel
			name="kpf-team-profile"
			title={__('Team profile', 'kpf-core')}
			className="kpf-team-profile-panel"
		>
			<PanelBody opened>
				<TextControl
					label={__('Title', 'kpf-core')}
					help={__('Role or position, e.g. Board Chair.', 'kpf-core')}
					value={details.job_title || ''}
					onChange={(job_title) => update({ job_title })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<TextareaControl
					label={__('Short summary', 'kpf-core')}
					help={__('A brief blurb for cards and listings.', 'kpf-core')}
					value={details.short_summary || ''}
					onChange={(short_summary) => update({ short_summary })}
					rows={3}
					__nextHasNoMarginBottom
				/>
				<p style={{ marginTop: 0, color: '#646970', fontSize: 12 }}>
					{__(
						'Use the main editor below for the full biography. Set the featured image as the profile photo.',
						'kpf-core'
					)}
				</p>
				<TextControl
					label={__('Email', 'kpf-core')}
					type="email"
					value={details.email || ''}
					onChange={(email) => update({ email })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={__('Phone number', 'kpf-core')}
					type="tel"
					value={details.phone || ''}
					onChange={(phone) => update({ phone })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</PanelBody>

			<PanelBody title={__('Social media links', 'kpf-core')} initialOpen>
				{links.map((link, index) => (
					<div
						key={`social-${index}`}
						style={{
							border: '1px solid #dcdcde',
							borderRadius: 4,
							padding: 10,
							marginBottom: 10,
							background: '#fff',
						}}
					>
						<SelectControl
							label={__('Link type', 'kpf-core')}
							value={link.type || 'website'}
							options={SOCIAL_TYPES.map((type) => ({
								label: SOCIAL_LABELS[type] || type,
								value: type,
							}))}
							onChange={(type) => updateLink(index, { type })}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={__('URL', 'kpf-core')}
							value={link.url || ''}
							onChange={(url) => updateLink(index, { url })}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						{'other' === link.type ? (
							<TextControl
								label={__('Label', 'kpf-core')}
								value={link.label || ''}
								onChange={(label) => updateLink(index, { label })}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						) : null}
						<Button variant="link" isDestructive onClick={() => removeLink(index)}>
							{__('Remove link', 'kpf-core')}
						</Button>
					</div>
				))}

				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
					<SelectControl
						label={__('Add a link', 'kpf-core')}
						value=""
						options={[
							{ label: __('Choose type…', 'kpf-core'), value: '' },
							...SOCIAL_TYPES.map((type) => ({
								label: SOCIAL_LABELS[type] || type,
								value: type,
							})),
						]}
						onChange={(type) => {
							if (type) {
								addLink(type);
							}
						}}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</div>
			</PanelBody>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin('kpf-team-editor', {
	render: TeamProfilePanel,
	icon: 'groups',
});
