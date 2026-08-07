import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

function formatEta(seconds) {
	const value = Math.max(0, Math.ceil(Number(seconds) || 0));
	if (value <= 0) {
		return __('Still working…', 'kpf-core');
	}
	if (value < 60) {
		return `${value}s`;
	}
	const minutes = Math.floor(value / 60);
	const secs = value % 60;
	return `${minutes}m ${secs}s`;
}

function getRunner() {
	return window.kpfBackupRunner || null;
}

/**
 * Compact "Run backup now" control that expands into a full-width progress bar.
 * Progress is driven by the global admin-shell backup runner so it continues
 * after navigating away.
 */
export default function BackupProgressButton({
	components,
	label = '',
	note = '',
	tags = [],
	disabled = false,
	onStart,
	onComplete,
	onError,
}) {
	const [running, setRunning] = useState(false);
	const [job, setJob] = useState(null);
	const [displayEta, setDisplayEta] = useState(0);
	const ownedRef = useRef(false);
	const onCompleteRef = useRef(onComplete);
	const onErrorRef = useRef(onError);
	const handledCompleteId = useRef(null);

	onCompleteRef.current = onComplete;
	onErrorRef.current = onError;

	useEffect(() => {
		const runner = getRunner();
		if (!runner) {
			return undefined;
		}

		return runner.subscribe((next) => {
			if (!next) {
				return;
			}

			if (next.status === 'running') {
				setRunning(true);
				setJob(next);
				setDisplayEta(next.eta_seconds || 0);
				return;
			}

			if (next.status === 'complete') {
				const completionKey = next.id || next.record?.id || 'complete';
				setJob({
					...next,
					percent: 100,
					current_label: __('Backup complete', 'kpf-core'),
					eta_seconds: 0,
				});
				setDisplayEta(0);

				// Only the control that started this job should fire completion side-effects
				// (tab switches, notices). Replays after remount must not force the Backups tab.
				if (ownedRef.current && handledCompleteId.current !== completionKey) {
					handledCompleteId.current = completionKey;
					onCompleteRef.current?.(next.record || next);
				}

				window.setTimeout(() => {
					setRunning(false);
					setJob(null);
					ownedRef.current = false;
				}, 900);
				return;
			}

			if (next.status === 'failed') {
				setRunning(false);
				setJob(null);
				if (ownedRef.current) {
					onErrorRef.current?.(new Error(next.error || __('Backup failed.', 'kpf-core')));
				}
				ownedRef.current = false;
			}
		});
	}, []);

	useEffect(() => {
		if (!running || !job || job.status !== 'running') {
			return undefined;
		}

		setDisplayEta(job.eta_seconds || 0);
		const timer = window.setInterval(() => {
			setDisplayEta((current) => Math.max(0, current - 1));
		}, 1000);

		return () => window.clearInterval(timer);
	}, [running, job?.id, job?.status, job?.step_index, job?.eta_seconds]);

	async function run() {
		const runner = getRunner();
		if (!runner || running || disabled || runner.isRunning()) {
			return;
		}

		ownedRef.current = true;
		handledCompleteId.current = null;
		setRunning(true);
		onStart?.();
		setJob({
			status: 'running',
			percent: 0,
			current_label: __('Starting backup…', 'kpf-core'),
			eta_seconds: 0,
			step_index: 0,
			steps_total: 1,
		});
		setDisplayEta(0);

		try {
			await runner.start({
				components,
				label,
				note,
				tags,
				trigger: 'manual',
			});
		} catch (error) {
			setRunning(false);
			setJob(null);
			ownedRef.current = false;
			onErrorRef.current?.(error);
		}
	}

	if (!running) {
		return (
			<div className="kpf-backups__run">
				<button type="button" className="kpf-backups__run-btn" onClick={run} disabled={disabled}>
					{__('Run backup now', 'kpf-core')}
				</button>
			</div>
		);
	}

	const percent = Math.min(100, Math.max(0, Number(job?.percent) || 0));
	const stepLabel = job?.current_label || __('Working…', 'kpf-core');
	const stepMeta =
		job?.steps_total > 0
			? `${Math.min((job.step_index || 0) + 1, job.steps_total)} / ${job.steps_total}`
			: '';

	return (
		<div
			className="kpf-backups__progress"
			role="progressbar"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={percent}
			aria-label={__('Backup progress', 'kpf-core')}
		>
			<div className="kpf-backups__progress-bar" style={{ width: `${percent}%` }} />
			<div className="kpf-backups__progress-content">
				<span className="kpf-backups__progress-label">{stepLabel}</span>
				<span className="kpf-backups__progress-meta">
					{percent}%
					{stepMeta ? ` · ${stepMeta}` : ''}
					{job?.status === 'running' ? ` · ${__('ETA', 'kpf-core')} ${formatEta(displayEta)}` : ''}
				</span>
			</div>
		</div>
	);
}
