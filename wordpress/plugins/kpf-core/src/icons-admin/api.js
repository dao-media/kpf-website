import apiFetch from '@wordpress/api-fetch';

export function saveStylesheetClass({ name, css, note, icon, config }) {
	return apiFetch({
		path: '/kpf-icons/v1/stylesheet-class',
		method: 'POST',
		data: { name, css, note, icon, config },
	});
}
