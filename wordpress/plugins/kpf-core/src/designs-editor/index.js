import {
	Button,
	Notice,
	TextControl,
} from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';

const config = window.kpfDesignsEditor || {};
const PAGE_FIELDS_META = config.pageFieldsKey || '_kpf_design_fields';
const PAGE_DESIGN_META = config.pageDesignKey || '_kpf_page_design_id';
const DESIGNS_URL = config.designsUrl || 'edit.php?post_type=page&page=kpf-designs';

function PageDesignFieldsPanel() {
	const [meta, setMeta] = useEntityProp('postType', 'page', 'meta');
	const fields = Array.isArray(meta?.[PAGE_FIELDS_META]) ? meta[PAGE_FIELDS_META] : [];
	const designId = Number(meta?.[PAGE_DESIGN_META] || 0);
	const [draftKey, setDraftKey] = useState('');
	const [draftValue, setDraftValue] = useState('');

	function updateFields(next) {
		setMeta({
			...meta,
			[PAGE_FIELDS_META]: next,
		});
	}

	function addField() {
		const key = draftKey.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^[_-]+|[_-]+$/g, '');
		if (!key) {
			return;
		}
		if (fields.some((field) => field.key === key)) {
			return;
		}
		updateFields([...fields, { key, value: draftValue }]);
		setDraftKey('');
		setDraftValue('');
	}

	return (
		<PluginDocumentSettingPanel
			name="kpf-page-design-fields"
			title={__('Page design', 'kpf-core')}
			className="kpf-page-design-fields"
		>
			{designId > 0 ? (
				<Notice status="success" isDismissible={false}>
					{__('An HTML/CSS design is attached to this page.', 'kpf-core')}
				</Notice>
			) : (
				<Notice status="warning" isDismissible={false}>
					{__('No design file yet. Upload one under Pages → Designs.', 'kpf-core')}
				</Notice>
			)}
			<p>
				<Button variant="secondary" href={DESIGNS_URL}>
					{__('Manage designs', 'kpf-core')}
				</Button>
			</p>
			<p className="description">
				{__(
					'Optional custom fields for Mustache placeholders like {{fields.hero_heading}}.',
					'kpf-core'
				)}
			</p>
			{fields.map((field, index) => (
				<div key={field.key} style={{ marginBottom: 12 }}>
					<strong>{field.key}</strong>
					<TextControl
						label={sprintf(__('Value for %s', 'kpf-core'), field.key)}
						hideLabelFromVision
						value={field.value}
						onChange={(value) => {
							const next = fields.slice();
							next[index] = { ...field, value };
							updateFields(next);
						}}
					/>
					<Button
						variant="link"
						isDestructive
						onClick={() => updateFields(fields.filter((_, i) => i !== index))}
					>
						{__('Remove', 'kpf-core')}
					</Button>
				</div>
			))}
			<TextControl
				label={__('New field key', 'kpf-core')}
				value={draftKey}
				onChange={setDraftKey}
				placeholder="hero_heading"
			/>
			<TextControl
				label={__('New field value', 'kpf-core')}
				value={draftValue}
				onChange={setDraftValue}
			/>
			<Button variant="secondary" onClick={addField}>
				{__('Add field', 'kpf-core')}
			</Button>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin('kpf-designs-editor', {
	render: PageDesignFieldsPanel,
});
