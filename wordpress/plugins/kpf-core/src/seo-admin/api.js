import apiFetch from '@wordpress/api-fetch';

apiFetch.use(apiFetch.createNonceMiddleware(window.kpfSeoAdmin?.nonce || ''));

export const seoApi = {
	getSettings: () => apiFetch({ path: '/kpf-seo/v1/settings' }),
	saveSettings: (data) =>
		apiFetch({
			path: '/kpf-seo/v1/settings',
			method: 'PUT',
			data,
		}),
	getTags: () => apiFetch({ path: '/kpf-seo/v1/tags' }),
	preview: (payload) =>
		apiFetch({
			path: '/kpf-seo/v1/preview',
			method: 'POST',
			data: payload,
		}),
	getConflicts: () => apiFetch({ path: '/kpf-seo/v1/conflicts' }),
	getRedirects: () => apiFetch({ path: '/kpf-seo/v1/redirects' }),
	createRedirect: (data) =>
		apiFetch({
			path: '/kpf-seo/v1/redirects',
			method: 'POST',
			data,
		}),
	updateRedirect: (id, data) =>
		apiFetch({
			path: `/kpf-seo/v1/redirects/${id}`,
			method: 'PUT',
			data,
		}),
	deleteRedirect: (id) =>
		apiFetch({
			path: `/kpf-seo/v1/redirects/${id}`,
			method: 'DELETE',
		}),
};
