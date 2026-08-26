import apiFetch from '@wordpress/api-fetch';
import { Button, Notice, Spinner } from '@wordpress/components';
import { useEffect, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';

function versionLabel(version) {
	const parts = [version.dateDisplay, sprintf(__('by %s', 'kpf-core'), version.author)];
	const files = [version.htmlFilename, version.cssFilename].filter(Boolean).join(' · ');
	if (files) {
		parts.push(files);
	}
	return parts.join(' — ');
}

export default function PriorVersions({
	apiPath,
	controlId = 'kpf-prior-versions-select',
	revision = '',
	disabled = false,
	confirmUnsaved,
	onRestored,
}) {
	const [open, setOpen] = useState(false);
	const [versions, setVersions] = useState([]);
	const [selectedId, setSelectedId] = useState('');
	const [loading, setLoading] = useState(false);
	const [restoring, setRestoring] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (!open) {
			return undefined;
		}

		let cancelled = false;
		setLoading(true);
		setError('');

		apiFetch({ url: `${apiPath}/revisions` })
			.then((response) => {
				if (cancelled) return;
				const items = Array.isArray(response?.revisions) ? response.revisions : [];
				setVersions(items);
				setSelectedId(items[0] ? String(items[0].id) : '');
			})
			.catch((err) => {
				if (cancelled) return;
				setVersions([]);
				setSelectedId('');
				setError(err?.message || __('Could not load prior versions.', 'kpf-core'));
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [apiPath, open]);

	async function restore() {
		const version = versions.find((item) => String(item.id) === String(selectedId));
		if (!version || restoring || disabled) return;
		if (typeof confirmUnsaved === 'function' && !confirmUnsaved()) {
			return;
		}
		if (
			!window.confirm(
				sprintf(
					__('Restore the version from %s? The current files will be kept as a prior version.', 'kpf-core'),
					version.dateDisplay
				)
			)
		) {
			return;
		}

		setRestoring(true);
		setError('');
		try {
			const data = {};
			if (revision) {
				data.revision = revision;
			}
			const response = await apiFetch({
				url: `${apiPath}/revisions/${version.id}/restore`,
				method: 'POST',
				data,
			});
			onRestored?.(response);
			const refreshed = await apiFetch({ url: `${apiPath}/revisions` });
			const items = Array.isArray(refreshed?.revisions) ? refreshed.revisions : [];
			setVersions(items);
			setSelectedId(items[0] ? String(items[0].id) : '');
		} catch (err) {
			setError(err?.message || __('Could not restore that version.', 'kpf-core'));
		} finally {
			setRestoring(false);
		}
	}

	return (
		<details
			className="kpf-prior-versions"
			onToggle={(event) => setOpen(event.currentTarget.open)}
		>
			<summary>
				{__('Prior versions', 'kpf-core')}
			</summary>
			<div className="kpf-prior-versions__body">
				{error ? (
					<Notice status="error" isDismissible={false}>
						{error}
					</Notice>
				) : null}
				{loading ? (
					<Spinner />
				) : versions.length === 0 ? (
					<p className="kpf-prior-versions__empty">
						{__('No earlier saved versions yet.', 'kpf-core')}
					</p>
				) : (
					<>
						<label className="kpf-prior-versions__label" htmlFor={controlId}>
							{__('Saved version', 'kpf-core')}
						</label>
						<select
							id={controlId}
							className="kpf-prior-versions__select"
							value={selectedId}
							disabled={disabled || restoring}
							onChange={(event) => setSelectedId(event.target.value)}
						>
							{versions.map((version) => (
								<option key={version.id} value={String(version.id)}>
									{versionLabel(version)}
								</option>
							))}
						</select>
						<Button
							variant="secondary"
							onClick={restore}
							isBusy={restoring}
							disabled={disabled || restoring || !selectedId}
						>
							{__('Restore', 'kpf-core')}
						</Button>
					</>
				)}
			</div>
		</details>
	);
}
