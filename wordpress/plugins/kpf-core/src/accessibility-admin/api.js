import apiFetch from '@wordpress/api-fetch';

apiFetch.use(apiFetch.createNonceMiddleware(window.kpfAccessibilityAdmin?.nonce || ''));

export const accessibilityApi = {
	getSettings: () => apiFetch({ path: '/kpf-accessibility/v1/settings' }),
	saveSettings: (data) =>
		apiFetch({
			path: '/kpf-accessibility/v1/settings',
			method: 'PUT',
			data,
		}),
	applyPreset: (preset) =>
		apiFetch({
			path: '/kpf-accessibility/v1/apply-preset',
			method: 'POST',
			data: { preset },
		}),
	getStatus: () => apiFetch({ path: '/kpf-accessibility/v1/status' }),
};
