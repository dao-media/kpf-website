import { createRoot } from '@wordpress/element';
import { Check, HardDrive } from 'lucide-react';

const STORAGE_JOB = 'kpf_backup_job_id';
const STORAGE_DONE = 'kpf_backup_job_done';
const EVENT = 'kpf-backup-progress';
const NODE_ID = 'wp-admin-bar-kpf-backups-job';

const listeners = new Set();
let running = false;
let currentJob = null;
let iconRoot = null;
let fadeTimer = null;

function config() {
	return window.kpfAdminShell?.backups || null;
}

function api(path, options = {}) {
	const cfg = config();
	if (!cfg?.restUrl) {
		return Promise.reject(new Error('Backups runner is not configured.'));
	}

	const headers = {
		Accept: 'application/json',
		'X-WP-Nonce': cfg.nonce || '',
		...(options.headers || {}),
	};

	if (options.data !== undefined) {
		headers['Content-Type'] = 'application/json';
	}

	return fetch(`${cfg.restUrl}${path}`, {
		credentials: 'same-origin',
		...options,
		headers,
		body: options.data !== undefined ? JSON.stringify(options.data) : options.body,
	}).then(async (response) => {
		const payload = await response.json().catch(() => ({}));
		if (!response.ok) {
			const message = payload?.message || payload?.code || `Request failed (${response.status})`;
			throw new Error(message);
		}
		return payload;
	});
}

function emit(job) {
	currentJob = job;
	listeners.forEach((listener) => {
		try {
			listener(job);
		} catch (error) {
			// Keep other subscribers alive.
		}
	});
	window.dispatchEvent(new CustomEvent(EVENT, { detail: job }));
	updateAdminBar(job);
}

function setPendingClass(active) {
	document.documentElement.classList.toggle('kpf-backup-job-pending', Boolean(active));
}

function ensureIcon(Icon) {
	const item = document.getElementById(NODE_ID);
	if (!item) {
		return;
	}
	const host =
		item.querySelector(':scope > .ab-item .ab-icon') ||
		item.querySelector(':scope > .ab-item > .ab-icon');
	if (!host) {
		return;
	}

	host.classList.add('kpf-lucide-ab-icon');
	host.dataset.kpfLucide = 'true';
	const link = item.querySelector(':scope > .ab-item');
	if (link) {
		link.classList.add('kpf-lucide-ab-item');
	}

	if (!iconRoot) {
		iconRoot = createRoot(host);
	}
	iconRoot.render(<Icon aria-hidden="true" size={18} strokeWidth={1.8} />);
}

function setAdminBarTitle(item, label) {
	const link = item.querySelector(':scope > .ab-item');
	if (link) {
		link.setAttribute('title', label);
		link.setAttribute('aria-label', label);
	}
	item.setAttribute('title', label);
}

function updateAdminBar(job) {
	const item = document.getElementById(NODE_ID);
	if (!item || !job) {
		return;
	}

	window.clearTimeout(fadeTimer);
	item.classList.remove('kpf-backups-ab--idle', 'kpf-backups-ab--fading');

	const fill = item.querySelector('.kpf-backups-ab__fill');
	const percent = Math.min(100, Math.max(0, Math.round(Number(job.percent) || 0)));
	const step = job.current_label || 'Backing up…';

	if (job.status === 'complete') {
		setPendingClass(true);
		item.classList.add('kpf-backups-ab--complete');
		item.classList.remove('kpf-backups-ab--active');
		if (fill) {
			fill.style.width = '100%';
		}
		setAdminBarTitle(item, 'Backup complete');
		ensureIcon(Check);

		fadeTimer = window.setTimeout(() => {
			item.classList.add('kpf-backups-ab--fading');
			window.setTimeout(() => {
				setPendingClass(false);
				item.classList.add('kpf-backups-ab--idle');
				item.classList.remove('kpf-backups-ab--complete', 'kpf-backups-ab--active', 'kpf-backups-ab--fading');
				if (fill) {
					fill.style.width = '0%';
				}
				setAdminBarTitle(item, 'Site backup');
				ensureIcon(HardDrive);
				currentJob = null;
			}, 750);
		}, 1800);
		return;
	}

	if (job.status === 'failed') {
		setPendingClass(false);
		item.classList.add('kpf-backups-ab--idle');
		item.classList.remove('kpf-backups-ab--active', 'kpf-backups-ab--complete');
		setAdminBarTitle(item, job.error || 'Backup failed');
		currentJob = null;
		return;
	}

	setPendingClass(true);
	item.classList.add('kpf-backups-ab--active');
	item.classList.remove('kpf-backups-ab--complete');
	ensureIcon(HardDrive);
	setAdminBarTitle(item, `${step} · ${percent}%`);
	if (fill) {
		fill.style.width = `${percent}%`;
	}
}

async function stepLoop(jobId) {
	if (running) {
		return;
	}
	running = true;
	localStorage.setItem(STORAGE_JOB, jobId);

	try {
		let job = await api(`/jobs/${jobId}`);
		emit(job);

		while (job.status === 'running') {
			job = await api(`/jobs/${jobId}/step`, { method: 'POST' });
			emit(job);
		}

		localStorage.removeItem(STORAGE_JOB);

		if (job.status === 'complete') {
			sessionStorage.setItem(
				STORAGE_DONE,
				JSON.stringify({ at: Date.now(), record: job.record || null })
			);
			emit({ ...job, percent: 100, current_label: 'Backup Complete' });
		} else if (job.status === 'failed') {
			emit(job);
		}
	} catch (error) {
		localStorage.removeItem(STORAGE_JOB);
		const message = error?.message || 'Backup failed.';
		// Stale client job id after server lock cleanup.
		if (/not found|expired|missing/i.test(message)) {
			emit({
				id: jobId,
				status: 'failed',
				error: 'Previous backup job expired. You can start a new backup.',
				percent: 0,
			});
		} else {
			emit({
				id: jobId,
				status: 'failed',
				error: message,
				percent: 0,
			});
		}
	} finally {
		running = false;
	}
}

async function start(payload = {}) {
	setPendingClass(true);
	localStorage.setItem(STORAGE_JOB, 'pending');
	updateAdminBar({
		status: 'running',
		percent: 0,
		current_label: 'Starting…',
	});

	try {
		const job = await api('/jobs', {
			method: 'POST',
			data: payload,
		});
		localStorage.setItem(STORAGE_JOB, job.id);
		emit(job);
		stepLoop(job.id);
		return job;
	} catch (error) {
		localStorage.removeItem(STORAGE_JOB);
		setPendingClass(false);
		updateAdminBar({
			status: 'failed',
			error: error?.message || 'Backup failed.',
			percent: 0,
		});
		throw error;
	}
}

function subscribe(listener) {
	listeners.add(listener);
	// Only replay an in-progress job. Terminal states must not re-fire
	// onComplete handlers when remounting UI (e.g. switching tabs).
	if (currentJob?.status === 'running') {
		listener(currentJob);
	}
	return () => listeners.delete(listener);
}

async function resume() {
	if (!config() || running) {
		return;
	}

	const doneRaw = sessionStorage.getItem(STORAGE_DONE);
	if (doneRaw) {
		try {
			const done = JSON.parse(doneRaw);
			if (done?.at && Date.now() - done.at < 8000) {
				sessionStorage.removeItem(STORAGE_DONE);
				emit({
					status: 'complete',
					percent: 100,
					current_label: 'Backup Complete',
					record: done.record || null,
				});
			} else {
				sessionStorage.removeItem(STORAGE_DONE);
			}
		} catch (error) {
			sessionStorage.removeItem(STORAGE_DONE);
		}
	}

	const storedId = localStorage.getItem(STORAGE_JOB);
	if (storedId && storedId !== 'pending') {
		setPendingClass(true);
		updateAdminBar({
			status: 'running',
			percent: 0,
			current_label: 'Backing up…',
		});
		await stepLoop(storedId);
		return;
	}

	if (storedId === 'pending') {
		localStorage.removeItem(STORAGE_JOB);
		setPendingClass(false);
	}

	try {
		const active = await api('/jobs/active');
		if (active?.job?.id && active.job.status === 'running') {
			setPendingClass(true);
			updateAdminBar({
				status: 'running',
				percent: Number(active.job.percent) || 0,
				current_label: active.job.current_label || 'Backing up…',
			});
			await stepLoop(active.job.id);
		}
	} catch (error) {
		// No active job — ignore.
	}
}

export function initBackupRunner() {
	if (!config()) {
		return;
	}

	window.kpfBackupRunner = {
		start,
		subscribe,
		resume,
		getJob: () => currentJob,
		isRunning: () => running,
	};

	if (document.documentElement.classList.contains('kpf-backup-job-pending')) {
		ensureIcon(HardDrive);
	}

	resume();
}
