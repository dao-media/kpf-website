import apiFetch from '@wordpress/api-fetch';

apiFetch.use(apiFetch.createNonceMiddleware(window.kpfDynamicContentAdmin?.nonce || ''));

const base = (window.kpfDynamicContentAdmin?.restUrl || '/wp-json/kpf-dynamic/v1').replace(
	/\/$/,
	''
);

export const dynamicContentApi = {
	getCatalog: () => apiFetch({ url: `${base}/catalog` }),
	saveTags: (tags) =>
		apiFetch({
			url: `${base}/tags`,
			method: 'PUT',
			data: { tags },
		}),
};
