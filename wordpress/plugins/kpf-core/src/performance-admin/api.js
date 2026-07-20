import apiFetch from '@wordpress/api-fetch';

apiFetch.use(apiFetch.createNonceMiddleware(window.kpfPerformanceAdmin?.nonce || ''));

export const performanceApi = {
	getSettings: () => apiFetch({ path: '/kpf-performance/v1/settings' }),
	saveSettings: (data) =>
		apiFetch({
			path: '/kpf-performance/v1/settings',
			method: 'PUT',
			data,
		}),
	applyPreset: (preset) =>
		apiFetch({
			path: '/kpf-performance/v1/apply-preset',
			method: 'POST',
			data: { preset },
		}),
	getStatus: () => apiFetch({ path: '/kpf-performance/v1/status' }),
	purge: (scope = 'all') =>
		apiFetch({
			path: '/kpf-performance/v1/purge',
			method: 'POST',
			data: { scope },
		}),
	getImageCapabilities: () => apiFetch({ path: '/kpf-performance/v1/images/capabilities' }),
	regenerateImages: ({ offset = 0, limit = 10, attachmentId = 0 } = {}) =>
		apiFetch({
			path: '/kpf-performance/v1/images/regenerate',
			method: 'POST',
			data: {
				offset,
				limit,
				attachment_id: attachmentId,
			},
		}),
};
