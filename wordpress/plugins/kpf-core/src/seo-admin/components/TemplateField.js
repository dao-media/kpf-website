import { useEffect, useState } from '@wordpress/element';
import { TextareaControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { seoApi } from '../api';

export default function TemplateField({
	label,
	help,
	value,
	onChange,
	multiline = false,
	postId = 0,
}) {
	const [preview, setPreview] = useState('');

	useEffect(() => {
		let active = true;
		const handle = setTimeout(async () => {
			if (!value) {
				if (active) setPreview('');
				return;
			}
			try {
				const result = await seoApi.preview({ template: value, postId });
				if (active) setPreview(result.rendered || '');
			} catch (error) {
				if (active) setPreview('');
			}
		}, 300);
		return () => {
			active = false;
			clearTimeout(handle);
		};
	}, [value, postId]);

	const Control = multiline ? TextareaControl : TextControl;

	return (
		<div className="kpf-seo-template-field">
			<Control
				label={label}
				help={help}
				value={value || ''}
				onChange={onChange}
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{preview ? (
				<p className="kpf-seo-preview">
					<strong>{__('Example result:', 'kpf-core')}</strong> {preview}
				</p>
			) : null}
		</div>
	);
}
