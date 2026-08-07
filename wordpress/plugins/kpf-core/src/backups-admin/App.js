import { useEffect, useMemo, useState } from '@wordpress/element';
import {
	Button,
	CheckboxControl,
	Notice,
	SelectControl,
	Spinner,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { backupsApi } from './api';
import BackupProgressButton from './BackupProgressButton';
import { formatSiteDateTime, siteTimezoneLabel } from '../shared/siteDateTime';

const SECTIONS = window.kpfBackupsAdmin?.sections || {
	overview: __('Overview', 'kpf-core'),
	backups: __('Backups', 'kpf-core'),
	schedule: __('Schedule', 'kpf-core'),
	settings: __('Settings', 'kpf-core'),
};

const COMPONENT_META = window.kpfBackupsAdmin?.components || {};
const CADENCE_OPTIONS = window.kpfBackupsAdmin?.cadenceOptions || [
	{ value: 'hourly', label: __('Hourly', 'kpf-core') },
	{ value: 'twicedaily', label: __('Twice daily', 'kpf-core') },
	{ value: 'daily', label: __('Daily', 'kpf-core') },
	{ value: 'weekly', label: __('Weekly', 'kpf-core') },
	{ value: 'monthly', label: __('Monthly', 'kpf-core') },
	{ value: 'custom', label: __('Custom interval', 'kpf-core') },
];

const SECTION_COPY = {
	overview: {
		title: __('Backups', 'kpf-core'),
		description: __(
			'Create compressed site backups, schedule automatic runs, and restore when you need to.',
			'kpf-core'
		),
	},
	backups: {
		title: __('Backup library', 'kpf-core'),
		description: __('Browse stored backups, download archives, restore, or delete.', 'kpf-core'),
	},
	schedule: {
		title: __('Schedule', 'kpf-core'),
		description: __('Run automatic backups on a cadence you choose and keep only as many as you need.', 'kpf-core'),
	},
	settings: {
		title: __('Settings', 'kpf-core'),
		description: __(
			'Choose what goes into each backup, retention, notifications, and exclusion patterns.',
			'kpf-core'
		),
	},
};

function pageSlugForTab(tab) {
	return tab === 'overview' ? 'kpf-backups' : `kpf-backups-${tab}`;
}

function linkMatchesPage(href, page) {
	try {
		return new URL(href, window.location.origin).searchParams.get('page') === page;
	} catch (error) {
		return false;
	}
}

function syncSubmenu(tab) {
	const page = pageSlugForTab(tab);
	const url = new URL(window.location.href);
	if (url.searchParams.get('page') !== page) {
		url.searchParams.set('page', page);
		window.history.replaceState({}, '', url.toString());
	}

	document.querySelectorAll('#toplevel_page_kpf-backups .wp-submenu a').forEach((link) => {
		const item = link.closest('li');
		if (!item) {
			return;
		}
		const active = linkMatchesPage(link.getAttribute('href') || '', page);
		item.classList.toggle('current', active);
		link.classList.toggle('current', active);
		if (active) {
			link.setAttribute('aria-current', 'page');
		} else {
			link.removeAttribute('aria-current');
		}
	});
}

function formatBytes(bytes) {
	const value = Number(bytes) || 0;
	if (value < 1024) {
		return `${value} B`;
	}
	const units = ['KB', 'MB', 'GB', 'TB'];
	let size = value / 1024;
	let unit = 0;
	while (size >= 1024 && unit < units.length - 1) {
		size /= 1024;
		unit += 1;
	}
	return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unit]}`;
}

function formatDate(timestamp) {
	if (!timestamp) {
		return '—';
	}
	return formatSiteDateTime(timestamp) || '—';
}

function backupDisplayLabel(backup) {
	const label = String(backup?.display_label || backup?.label || '').trim();
	if (label) {
		return label;
	}
	if (backup?.created_at_label) {
		return backup.created_at_label;
	}
	return formatDate(backup?.created_at);
}

function parseTagsInput(value) {
	return String(value || '')
		.split(',')
		.map((tag) => tag.trim())
		.filter(Boolean);
}

function tagsToInput(tags) {
	return Array.isArray(tags) ? tags.join(', ') : '';
}

function componentLabel(key) {
	return COMPONENT_META[key]?.label || key;
}

function errorMessage(error, fallback) {
	return error?.message || fallback;
}

export default function App() {
	const [settings, setSettings] = useState(null);
	const [saved, setSaved] = useState(null);
	const [status, setStatus] = useState(null);
	const [backups, setBackups] = useState([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [creating, setCreating] = useState(false);
	const [busyId, setBusyId] = useState(null);
	const [notice, setNotice] = useState(null);
	const [activeTab, setActiveTab] = useState(window.kpfBackupsAdmin?.initialTab || 'overview');
	const [manualComponents, setManualComponents] = useState(null);
	const [manualLabel, setManualLabel] = useState('');
	const [manualNote, setManualNote] = useState('');
	const [manualTags, setManualTags] = useState('');
	const [editTarget, setEditTarget] = useState(null);
	const [editDraft, setEditDraft] = useState({ label: '', note: '', tags: '' });
	const [savingEdit, setSavingEdit] = useState(false);
	const [restoreTarget, setRestoreTarget] = useState(null);
	const [restoreComponents, setRestoreComponents] = useState({});
	const [skipPreRestore, setSkipPreRestore] = useState(false);

	const dirty = useMemo(() => {
		if (!settings || !saved) {
			return false;
		}
		return JSON.stringify(settings) !== JSON.stringify(saved);
	}, [settings, saved]);

	const createSelection = manualComponents || settings?.components || {};

	async function refreshAll() {
		const [nextSettings, nextStatus, list] = await Promise.all([
			backupsApi.getSettings(),
			backupsApi.getStatus(),
			backupsApi.listBackups(),
		]);
		setSettings(nextSettings);
		setSaved(nextSettings);
		setStatus(nextStatus);
		setBackups(Array.isArray(list?.backups) ? list.backups : []);
		if (!manualComponents) {
			setManualComponents({ ...nextSettings.components });
		}
	}

	useEffect(() => {
		let cancelled = false;

		async function load() {
			try {
				await refreshAll();
			} catch (error) {
				if (!cancelled) {
					setNotice({
						status: 'error',
						message: errorMessage(error, __('Could not load backups.', 'kpf-core')),
					});
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		load();
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		syncSubmenu(activeTab);
	}, [activeTab]);

	useEffect(() => {
		function onClick(event) {
			const link = event.target.closest('#toplevel_page_kpf-backups .wp-submenu a');
			if (!link) {
				return;
			}
			const href = link.getAttribute('href') || '';
			const page = new URL(href, window.location.origin).searchParams.get('page') || '';
			const prefix = 'kpf-backups-';
			let tab = 'overview';
			if (page === 'kpf-backups') {
				tab = 'overview';
			} else if (page.startsWith(prefix)) {
				tab = page.slice(prefix.length);
			}
			if (!SECTION_COPY[tab]) {
				return;
			}
			event.preventDefault();
			setActiveTab(tab);
		}

		document.addEventListener('click', onClick);
		return () => document.removeEventListener('click', onClick);
	}, []);

	async function saveSettings() {
		if (!settings) {
			return;
		}
		setSaving(true);
		setNotice(null);
		try {
			const next = await backupsApi.saveSettings(settings);
			setSettings(next);
			setSaved(next);
			const nextStatus = await backupsApi.getStatus();
			setStatus(nextStatus);
			setNotice({
				status: 'success',
				message: __('Backup settings saved.', 'kpf-core'),
			});
		} catch (error) {
			setNotice({
				status: 'error',
				message: errorMessage(error, __('Could not save settings.', 'kpf-core')),
			});
		} finally {
			setSaving(false);
		}
	}

	async function handleBackupComplete(record) {
		setManualLabel('');
		setManualNote('');
		setManualTags('');
		setCreating(false);
		await refreshAll();
		setActiveTab('backups');
		const name = backupDisplayLabel(record || {});
		setNotice({
			status: 'success',
			message: name
				? `${__('Backup created:', 'kpf-core')} ${name}`
				: __('Backup created successfully.', 'kpf-core'),
		});
	}

	function handleBackupError(error) {
		setCreating(false);
		setNotice({
			status: 'error',
			message: errorMessage(error, __('Backup failed.', 'kpf-core')),
		});
	}

	function handleBackupStart() {
		setCreating(true);
		setNotice(null);
	}

	async function deleteBackup(id) {
		if (
			!window.confirm(
				__('Delete this backup permanently? This cannot be undone.', 'kpf-core')
			)
		) {
			return;
		}
		setBusyId(id);
		setNotice(null);
		try {
			await backupsApi.deleteBackup(id);
			await refreshAll();
			setNotice({
				status: 'success',
				message: __('Backup deleted.', 'kpf-core'),
			});
		} catch (error) {
			setNotice({
				status: 'error',
				message: errorMessage(error, __('Could not delete backup.', 'kpf-core')),
			});
		} finally {
			setBusyId(null);
		}
	}

	function openRestore(backup) {
		const selected = {};
		(backup.components || []).forEach((key) => {
			selected[key] = true;
		});
		setRestoreComponents(selected);
		setSkipPreRestore(false);
		setRestoreTarget(backup);
	}

	function openEdit(backup) {
		setEditTarget(backup);
		setEditDraft({
			label: backup.label || '',
			note: backup.note || '',
			tags: tagsToInput(backup.tags),
		});
	}

	async function saveEdit() {
		if (!editTarget) {
			return;
		}
		setSavingEdit(true);
		setNotice(null);
		try {
			await backupsApi.updateBackup(editTarget.id, {
				label: editDraft.label,
				note: editDraft.note,
				tags: parseTagsInput(editDraft.tags),
			});
			setEditTarget(null);
			await refreshAll();
			setNotice({
				status: 'success',
				message: __('Backup details updated.', 'kpf-core'),
			});
		} catch (error) {
			setNotice({
				status: 'error',
				message: errorMessage(error, __('Could not update backup.', 'kpf-core')),
			});
		} finally {
			setSavingEdit(false);
		}
	}

	async function confirmRestore() {
		if (!restoreTarget) {
			return;
		}
		const components = Object.keys(restoreComponents).filter((key) => restoreComponents[key]);
		if (!components.length) {
			setNotice({
				status: 'error',
				message: __('Select at least one component to restore.', 'kpf-core'),
			});
			return;
		}
		if (
			!window.confirm(
				__(
					'Restore will overwrite the selected parts of this site. Continue?',
					'kpf-core'
				)
			)
		) {
			return;
		}

		setBusyId(restoreTarget.id);
		setNotice(null);
		try {
			const result = await backupsApi.restoreBackup(restoreTarget.id, {
				components,
				skip_pre_restore: skipPreRestore,
			});
			setRestoreTarget(null);
			await refreshAll();
			setNotice({
				status: 'success',
				message: result?.message || __('Restore completed.', 'kpf-core'),
			});
		} catch (error) {
			setNotice({
				status: 'error',
				message: errorMessage(error, __('Restore failed.', 'kpf-core')),
			});
		} finally {
			setBusyId(null);
		}
	}

	function patchSchedule(key, value) {
		setSettings((current) => ({
			...current,
			schedule: {
				...current.schedule,
				[key]: value,
			},
		}));
	}

	function patchComponent(key, value) {
		setSettings((current) => ({
			...current,
			components: {
				...current.components,
				[key]: value,
			},
		}));
	}

	function patchManualComponent(key, value) {
		setManualComponents((current) => ({
			...(current || settings?.components || {}),
			[key]: value,
		}));
	}

	if (loading) {
		return (
			<div className="kpf-backups">
				<div className="kpf-backups__loading">
					<Spinner />
					<span>{__('Loading backups…', 'kpf-core')}</span>
				</div>
			</div>
		);
	}

	if (!settings) {
		return (
			<div className="kpf-backups">
				{notice ? (
					<Notice status={notice.status} isDismissible onRemove={() => setNotice(null)}>
						{notice.message}
					</Notice>
				) : (
					<Notice status="error" isDismissible={false}>
						{__('Backups could not be loaded.', 'kpf-core')}
					</Notice>
				)}
			</div>
		);
	}

	const copy = SECTION_COPY[activeTab] || SECTION_COPY.overview;
	const disk = status?.disk || {};
	const scheduleStatus = status?.schedule || {};
	const backupBlocked = Boolean(status?.busy) && !creating;

	return (
		<div className="kpf-backups">
			<header className="kpf-backups__header">
				<div className="kpf-backups__header-copy">
					<h1>{copy.title}</h1>
					<p>{copy.description}</p>
				</div>
				<div className="kpf-backups__header-actions">
					{dirty ? (
						<span className="kpf-backups__dirty">{__('Unsaved changes', 'kpf-core')}</span>
					) : null}
					{(activeTab === 'schedule' || activeTab === 'settings') && (
						<Button variant="primary" onClick={saveSettings} isBusy={saving} disabled={saving || !dirty}>
							{__('Save settings', 'kpf-core')}
						</Button>
					)}
					{activeTab === 'backups' && (
						<div className="kpf-backups__header-run">
							<BackupProgressButton
								components={createSelection}
								label={manualLabel}
								disabled={backupBlocked}
								onStart={handleBackupStart}
								onComplete={handleBackupComplete}
								onError={handleBackupError}
							/>
						</div>
					)}
				</div>
			</header>

			<nav className="kpf-backups__tabs" aria-label={__('Backups sections', 'kpf-core')}>
				{Object.keys(SECTIONS).map((tab) => (
					<button
						key={tab}
						type="button"
						className={`kpf-backups__tab${activeTab === tab ? ' is-active' : ''}`}
						onClick={() => setActiveTab(tab)}
					>
						{SECTIONS[tab]}
					</button>
				))}
			</nav>

			{notice ? (
				<div className="kpf-backups__notices">
					<Notice status={notice.status} isDismissible onRemove={() => setNotice(null)}>
						{notice.message}
					</Notice>
				</div>
			) : null}

			{activeTab === 'overview' && (
				<>
					<div className="kpf-backups__grid">
						<div className="kpf-backups__stat">
							<p className="kpf-backups__stat-label">{__('Stored backups', 'kpf-core')}</p>
							<p className="kpf-backups__stat-value">{disk.backup_count ?? backups.length}</p>
							<p className="kpf-backups__stat-meta">{formatBytes(disk.used_bytes)}</p>
						</div>
						<div className="kpf-backups__stat">
							<p className="kpf-backups__stat-label">{__('Retention', 'kpf-core')}</p>
							<p className="kpf-backups__stat-value">{settings.retention}</p>
							<p className="kpf-backups__stat-meta">{__('Oldest extras are pruned', 'kpf-core')}</p>
						</div>
						<div className="kpf-backups__stat">
							<p className="kpf-backups__stat-label">{__('Schedule', 'kpf-core')}</p>
							<p className="kpf-backups__stat-value">
								{scheduleStatus.enabled ? __('On', 'kpf-core') : __('Off', 'kpf-core')}
							</p>
							<p className="kpf-backups__stat-meta">
								{scheduleStatus.next_run
									? `${__('Next:', 'kpf-core')} ${
											scheduleStatus.next_run_label || formatDate(scheduleStatus.next_run)
										}`
									: __('Not scheduled', 'kpf-core')}
							</p>
						</div>
						<div className="kpf-backups__stat">
							<p className="kpf-backups__stat-label">{__('Disk free', 'kpf-core')}</p>
							<p className="kpf-backups__stat-value">
								{disk.free_bytes == null ? '—' : formatBytes(disk.free_bytes)}
							</p>
							<p className="kpf-backups__stat-meta">
								{status?.zip
									? __('Zip compression ready', 'kpf-core')
									: __('ZipArchive missing', 'kpf-core')}
							</p>
						</div>
					</div>

					<section className="kpf-backups__section">
						<h2>{__('Create a backup', 'kpf-core')}</h2>
						<p>{__('Pick which parts of the site to include, then run a compressed archive.', 'kpf-core')}</p>
						<div className="kpf-backups__fields">
							<div className="kpf-backups__checks">
								{Object.keys(COMPONENT_META).map((key) => (
									<div className="kpf-backups__check" key={key}>
										<CheckboxControl
											checked={Boolean(createSelection[key])}
											onChange={(value) => patchManualComponent(key, value)}
											label={
												<span className="kpf-backups__check-copy">
													<strong>{COMPONENT_META[key].label}</strong>
													<span>{COMPONENT_META[key].description}</span>
												</span>
											}
										/>
									</div>
								))}
							</div>
							<TextControl
								label={__('Label (optional)', 'kpf-core')}
								help={__('Leave blank to use the creation date and time.', 'kpf-core')}
								value={manualLabel}
								onChange={setManualLabel}
								placeholder={__('e.g. Before plugin update', 'kpf-core')}
							/>
							<TextControl
								label={__('Tags (optional)', 'kpf-core')}
								help={__('Comma-separated, e.g. pre-deploy, content', 'kpf-core')}
								value={manualTags}
								onChange={setManualTags}
								placeholder={__('pre-deploy, content', 'kpf-core')}
							/>
							<TextareaControl
								label={__('Notes (optional)', 'kpf-core')}
								value={manualNote}
								onChange={setManualNote}
								rows={3}
								placeholder={__('Why this backup was created…', 'kpf-core')}
							/>
							<BackupProgressButton
								components={createSelection}
								label={manualLabel}
								note={manualNote}
								tags={parseTagsInput(manualTags)}
								disabled={backupBlocked}
								onStart={handleBackupStart}
								onComplete={handleBackupComplete}
								onError={handleBackupError}
							/>
						</div>
					</section>

					<section className="kpf-backups__section">
						<h2>{__('Recent backups', 'kpf-core')}</h2>
						{backups.length === 0 ? (
							<p className="kpf-backups__empty">{__('No backups yet. Run your first backup above.', 'kpf-core')}</p>
						) : (
							<BackupTable
								backups={backups.slice(0, 5)}
								busyId={busyId}
								onEdit={openEdit}
								onRestore={openRestore}
								onDelete={deleteBackup}
							/>
						)}
						{backups.length > 5 ? (
							<p>
								<Button variant="link" onClick={() => setActiveTab('backups')}>
									{__('View all backups', 'kpf-core')}
								</Button>
							</p>
						) : null}
					</section>
				</>
			)}

			{activeTab === 'backups' && (
				<section className="kpf-backups__section">
					<h2>{__('All backups', 'kpf-core')}</h2>
					<p>{__('Archives are stored outside the public uploads tree and protected from direct web access.', 'kpf-core')}</p>
					{backups.length === 0 ? (
						<p className="kpf-backups__empty">{__('No backups stored yet.', 'kpf-core')}</p>
					) : (
						<BackupTable
							backups={backups}
							busyId={busyId}
							onEdit={openEdit}
							onRestore={openRestore}
							onDelete={deleteBackup}
						/>
					)}
				</section>
			)}

			{activeTab === 'schedule' && (
				<section className="kpf-backups__section">
					<h2>{__('Automatic backups', 'kpf-core')}</h2>
					<p>{__('Scheduled runs use WordPress cron and the component selection from Settings.', 'kpf-core')}</p>
					<div className="kpf-backups__fields">
						<ToggleControl
							label={__('Enable scheduled backups', 'kpf-core')}
							checked={Boolean(settings.schedule?.enabled)}
							onChange={(value) => patchSchedule('enabled', value)}
						/>
						<SelectControl
							label={__('Cadence', 'kpf-core')}
							value={settings.schedule?.cadence || 'daily'}
							options={CADENCE_OPTIONS}
							onChange={(value) => patchSchedule('cadence', value)}
						/>
						{settings.schedule?.cadence === 'custom' ? (
							<TextControl
								label={__('Interval (hours)', 'kpf-core')}
								type="number"
								min={1}
								max={168}
								value={String(settings.schedule?.custom_hours ?? 24)}
								onChange={(value) => patchSchedule('custom_hours', Number(value) || 1)}
							/>
						) : null}
						{['daily', 'weekly', 'monthly'].includes(settings.schedule?.cadence) ? (
							<TextControl
								label={__('Preferred time', 'kpf-core')}
								help={`${__('24-hour HH:MM in the site timezone:', 'kpf-core')} ${
									siteTimezoneLabel() || __('site timezone', 'kpf-core')
								}`}
								value={settings.schedule?.time || '02:00'}
								onChange={(value) => patchSchedule('time', value)}
								placeholder="02:00"
							/>
						) : null}
						<TextControl
							label={__('Keep this many backups', 'kpf-core')}
							type="number"
							min={1}
							max={50}
							value={String(settings.retention)}
							onChange={(value) =>
								setSettings((current) => ({
									...current,
									retention: Number(value) || 1,
								}))
							}
						/>
						{scheduleStatus.next_run ? (
							<p className="kpf-backups__stat-meta">
								{__('Next scheduled run:', 'kpf-core')}{' '}
								{scheduleStatus.next_run_label || formatDate(scheduleStatus.next_run)}
								{scheduleStatus.timezone
									? ` · ${scheduleStatus.timezone}${
											scheduleStatus.timezone_abbr
												? ` (${scheduleStatus.timezone_abbr})`
												: ''
										}`
									: ''}
							</p>
						) : null}
					</div>
				</section>
			)}

			{activeTab === 'settings' && (
				<>
					<section className="kpf-backups__section">
						<h2>{__('Default components', 'kpf-core')}</h2>
						<p>{__('Used for scheduled backups and as the starting selection for manual runs.', 'kpf-core')}</p>
						<div className="kpf-backups__checks">
							{Object.keys(COMPONENT_META).map((key) => (
								<div className="kpf-backups__check" key={key}>
									<CheckboxControl
										checked={Boolean(settings.components?.[key])}
										onChange={(value) => patchComponent(key, value)}
										label={
											<span className="kpf-backups__check-copy">
												<strong>{COMPONENT_META[key].label}</strong>
												<span>{COMPONENT_META[key].description}</span>
											</span>
										}
									/>
								</div>
							))}
						</div>
					</section>

					<section className="kpf-backups__section">
						<h2>{__('Safety & notifications', 'kpf-core')}</h2>
						<div className="kpf-backups__fields">
							<ToggleControl
								label={__('Create a safety backup before restore', 'kpf-core')}
								checked={Boolean(settings.create_pre_restore)}
								onChange={(value) =>
									setSettings((current) => ({
										...current,
										create_pre_restore: value,
									}))
								}
							/>
							<ToggleControl
								label={__('Email on backup failure', 'kpf-core')}
								checked={Boolean(settings.notify_on_failure)}
								onChange={(value) =>
									setSettings((current) => ({
										...current,
										notify_on_failure: value,
									}))
								}
							/>
							<TextControl
								label={__('Notification email', 'kpf-core')}
								help={__('Leave blank to use the site admin email.', 'kpf-core')}
								type="email"
								value={settings.notify_email || ''}
								onChange={(value) =>
									setSettings((current) => ({
										...current,
										notify_email: value,
									}))
								}
							/>
							<TextareaControl
								label={__('Exclude patterns', 'kpf-core')}
								help={__('One pattern per line. Supports wildcards like *.log or */cache/*.', 'kpf-core')}
								value={(settings.exclude_patterns || []).join('\n')}
								onChange={(value) =>
									setSettings((current) => ({
										...current,
										exclude_patterns: value
											.split(/\r?\n/)
											.map((line) => line.trim())
											.filter(Boolean),
									}))
								}
								rows={5}
							/>
						</div>
					</section>
				</>
			)}

			{editTarget ? (
				<div className="kpf-backups__modal-backdrop" role="presentation" onClick={() => setEditTarget(null)}>
					<div
						className="kpf-backups__modal"
						role="dialog"
						aria-modal="true"
						aria-labelledby="kpf-backups-edit-title"
						onClick={(event) => event.stopPropagation()}
					>
						<h3 id="kpf-backups-edit-title">{__('Edit backup details', 'kpf-core')}</h3>
						<p>
							{formatDate(editTarget.created_at)} · {formatBytes(editTarget.size)}
						</p>
						<div className="kpf-backups__fields">
							<TextControl
								label={__('Label', 'kpf-core')}
								help={__('Leave blank to show the creation stamp.', 'kpf-core')}
								value={editDraft.label}
								onChange={(label) => setEditDraft((current) => ({ ...current, label }))}
								placeholder={formatDate(editTarget.created_at)}
							/>
							<TextControl
								label={__('Tags', 'kpf-core')}
								help={__('Comma-separated tags', 'kpf-core')}
								value={editDraft.tags}
								onChange={(tags) => setEditDraft((current) => ({ ...current, tags }))}
								placeholder={__('pre-deploy, content', 'kpf-core')}
							/>
							<TextareaControl
								label={__('Notes', 'kpf-core')}
								value={editDraft.note}
								onChange={(note) => setEditDraft((current) => ({ ...current, note }))}
								rows={4}
							/>
						</div>
						<div className="kpf-backups__modal-actions">
							<Button variant="secondary" onClick={() => setEditTarget(null)} disabled={savingEdit}>
								{__('Cancel', 'kpf-core')}
							</Button>
							<Button variant="primary" isBusy={savingEdit} disabled={savingEdit} onClick={saveEdit}>
								{__('Save details', 'kpf-core')}
							</Button>
						</div>
					</div>
				</div>
			) : null}

			{restoreTarget ? (
				<div className="kpf-backups__modal-backdrop" role="presentation" onClick={() => setRestoreTarget(null)}>
					<div
						className="kpf-backups__modal"
						role="dialog"
						aria-modal="true"
						aria-labelledby="kpf-backups-restore-title"
						onClick={(event) => event.stopPropagation()}
					>
						<h3 id="kpf-backups-restore-title">{__('Restore backup', 'kpf-core')}</h3>
						<p>
							{formatDate(restoreTarget.created_at)} · {formatBytes(restoreTarget.size)}
						</p>
						<div className="kpf-backups__checks">
							{(restoreTarget.components || []).map((key) => (
								<CheckboxControl
									key={key}
									checked={Boolean(restoreComponents[key])}
									onChange={(value) =>
										setRestoreComponents((current) => ({
											...current,
											[key]: value,
										}))
									}
									label={componentLabel(key)}
								/>
							))}
						</div>
						<ToggleControl
							label={__('Skip safety backup before restore', 'kpf-core')}
							checked={skipPreRestore}
							onChange={setSkipPreRestore}
						/>
						<div className="kpf-backups__modal-actions">
							<Button variant="secondary" onClick={() => setRestoreTarget(null)}>
								{__('Cancel', 'kpf-core')}
							</Button>
							<Button
								variant="primary"
								className="kpf-backups__danger"
								isBusy={busyId === restoreTarget.id}
								disabled={busyId === restoreTarget.id}
								onClick={confirmRestore}
							>
								{__('Restore selected', 'kpf-core')}
							</Button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

function BackupTable({ backups, busyId, onEdit, onRestore, onDelete }) {
	return (
		<div className="kpf-backups__table-wrap">
			<table className="kpf-backups__table">
				<thead>
					<tr>
						<th>{__('Backup', 'kpf-core')}</th>
						<th>{__('Created', 'kpf-core')}</th>
						<th>{__('Size', 'kpf-core')}</th>
						<th>{__('Includes', 'kpf-core')}</th>
						<th>{__('Actions', 'kpf-core')}</th>
					</tr>
				</thead>
				<tbody>
					{backups.map((backup) => (
						<tr key={backup.id}>
							<td>
								<div className="kpf-backups__backup-title">{backupDisplayLabel(backup)}</div>
								{backup.note ? <div className="kpf-backups__backup-note">{backup.note}</div> : null}
								{(backup.tags || []).length ? (
									<div className="kpf-backups__chips">
										{backup.tags.map((tag) => (
											<span className="kpf-backups__chip is-tag" key={tag}>
												{tag}
											</span>
										))}
									</div>
								) : null}
							</td>
							<td>
								<div>{formatDate(backup.created_at)}</div>
								<div className="kpf-backups__stat-meta">{backup.trigger || 'manual'}</div>
							</td>
							<td>{formatBytes(backup.size)}</td>
							<td>
								<div className="kpf-backups__chips">
									{(backup.components || []).map((key) => (
										<span className="kpf-backups__chip" key={key}>
											{componentLabel(key)}
										</span>
									))}
								</div>
							</td>
							<td>
								<div className="kpf-backups__row-actions">
									<Button variant="secondary" size="small" onClick={() => onEdit(backup)}>
										{__('Edit', 'kpf-core')}
									</Button>
									<Button
										variant="secondary"
										size="small"
										href={backupsApi.downloadUrl(backup.id)}
										target="_blank"
										rel="noopener noreferrer"
									>
										{__('Download', 'kpf-core')}
									</Button>
									<Button
										variant="secondary"
										size="small"
										onClick={() => onRestore(backup)}
										disabled={busyId === backup.id}
									>
										{__('Restore', 'kpf-core')}
									</Button>
									<Button
										variant="tertiary"
										size="small"
										isDestructive
										isBusy={busyId === backup.id}
										onClick={() => onDelete(backup.id)}
									>
										{__('Delete', 'kpf-core')}
									</Button>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
