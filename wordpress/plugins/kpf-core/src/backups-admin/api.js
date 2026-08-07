import apiFetch from '@wordpress/api-fetch';

apiFetch.use(apiFetch.createNonceMiddleware(window.kpfBackupsAdmin?.nonce || ''));

const base = '/kpf-backups/v1';

export const backupsApi = {
	getSettings: () => apiFetch({ path: `${base}/settings` }),
	saveSettings: (data) =>
		apiFetch({
			path: `${base}/settings`,
			method: 'PUT',
			data,
		}),
	getStatus: () => apiFetch({ path: `${base}/status` }),
	listBackups: () => apiFetch({ path: `${base}/backups` }),
	createBackup: (data) =>
		apiFetch({
			path: `${base}/backups`,
			method: 'POST',
			data,
		}),
	startJob: (data) =>
		apiFetch({
			path: `${base}/jobs`,
			method: 'POST',
			data,
		}),
	stepJob: (id) =>
		apiFetch({
			path: `${base}/jobs/${id}/step`,
			method: 'POST',
		}),
	getJob: (id) => apiFetch({ path: `${base}/jobs/${id}` }),
	deleteBackup: (id) =>
		apiFetch({
			path: `${base}/backups/${id}`,
			method: 'DELETE',
		}),
	updateBackup: (id, data) =>
		apiFetch({
			path: `${base}/backups/${id}`,
			method: 'PUT',
			data,
		}),
	restoreBackup: (id, data = {}) =>
		apiFetch({
			path: `${base}/backups/${id}/restore`,
			method: 'POST',
			data,
		}),
	downloadUrl: (id) => {
		const root = window.kpfBackupsAdmin?.restUrl || '';
		const nonce = window.kpfBackupsAdmin?.nonce || '';
		return `${root}/backups/${id}/download?_wpnonce=${encodeURIComponent(nonce)}`;
	},
};
