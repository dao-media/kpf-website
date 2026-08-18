import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	CheckboxControl,
	FormTokenField,
	Notice,
	SelectControl,
	TextControl,
	TextareaControl,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { createRoot, useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const cfg = window.kpfEventsEditor || {};
const META_KEY = cfg.metaKey || '_kpf_event';
const HOST_TAXONOMY = cfg.hostTaxonomy || 'kpf_event_host';

const DEFAULT_SCHEDULE = {
	start_date: '',
	by_weekday: [],
	monthly_mode: 'day_of_month',
	by_monthday: 0,
	nth_weekday: { n: 1, day: 'MO' },
	by_month: [],
	anchors: [],
};

const DEFAULT_LOCATION = {
	mode: 'none',
	label: '',
	line1: '',
	line2: '',
	city: '',
	state: '',
	postal_code: '',
	url: '',
};

const DEFAULTS = {
	version: 2,
	logline: '',
	description: '',
	contact_email: '',
	contact_phone: '',
	website: '',
	ticketing_link: '',
	location: DEFAULT_LOCATION,
	frequency: 'one_time',
	duration_days: 1,
	schedule: DEFAULT_SCHEDULE,
	host_term_ids: [],
};

const LOCATION_MODE_OPTIONS = [
	{ label: __('No location', 'kpf-core'), value: 'none' },
	{ label: __('City / state / ZIP', 'kpf-core'), value: 'area' },
	{ label: __('Street address', 'kpf-core'), value: 'address' },
	{ label: __('Directions link', 'kpf-core'), value: 'directions' },
];

const WEEKDAYS = [
	{ label: __('Monday', 'kpf-core'), value: 'MO' },
	{ label: __('Tuesday', 'kpf-core'), value: 'TU' },
	{ label: __('Wednesday', 'kpf-core'), value: 'WE' },
	{ label: __('Thursday', 'kpf-core'), value: 'TH' },
	{ label: __('Friday', 'kpf-core'), value: 'FR' },
	{ label: __('Saturday', 'kpf-core'), value: 'SA' },
	{ label: __('Sunday', 'kpf-core'), value: 'SU' },
];

const FREQUENCY_OPTIONS = [
	{ label: __('One time', 'kpf-core'), value: 'one_time' },
	{ label: __('Weekly', 'kpf-core'), value: 'weekly' },
	{ label: __('Monthly', 'kpf-core'), value: 'monthly' },
	{ label: __('Quarterly', 'kpf-core'), value: 'quarterly' },
	{ label: __('Semiannually', 'kpf-core'), value: 'semiannually' },
	{ label: __('Annually', 'kpf-core'), value: 'annually' },
];

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
	label: new Date(2000, i, 1).toLocaleString(undefined, { month: 'long' }),
	value: String(i + 1),
}));

const NTH_OPTIONS = [
	{ label: __('First', 'kpf-core'), value: '1' },
	{ label: __('Second', 'kpf-core'), value: '2' },
	{ label: __('Third', 'kpf-core'), value: '3' },
	{ label: __('Fourth', 'kpf-core'), value: '4' },
	{ label: __('Last', 'kpf-core'), value: '5' },
];

function useMeta() {
	const meta = useSelect(
		(select) => select('core/editor')?.getEditedPostAttribute?.('meta') || {},
		[]
	);
	const { editPost } = useDispatch('core/editor');

	const details = useMemo(
		() => ({
			...DEFAULTS,
			...(meta?.[META_KEY] || {}),
			location: {
				...DEFAULT_LOCATION,
				...(meta?.[META_KEY]?.location || {}),
			},
			schedule: {
				...DEFAULT_SCHEDULE,
				...(meta?.[META_KEY]?.schedule || {}),
				nth_weekday: {
					...DEFAULT_SCHEDULE.nth_weekday,
					...(meta?.[META_KEY]?.schedule?.nth_weekday || {}),
				},
			},
		}),
		[meta]
	);

	const update = (patch) => {
		const currentMeta =
			window.wp?.data?.select('core/editor')?.getEditedPostAttribute?.('meta') ||
			meta ||
			{};
		editPost({
			meta: {
				...currentMeta,
				[META_KEY]: {
					...details,
					...patch,
					version: 2,
					location: {
						...details.location,
						...(patch.location || {}),
					},
					schedule: {
						...details.schedule,
						...(patch.schedule || {}),
					},
				},
			},
		});
	};

	const updateSchedule = (patch) => {
		update({ schedule: { ...details.schedule, ...patch } });
	};

	const updateLocation = (patch) => {
		update({ location: { ...details.location, ...patch } });
	};

	return { details, update, updateSchedule, updateLocation };
}

/**
 * URL fields keep a local draft while typing and commit on blur / Enter.
 * Avoids autosave wiping partial URIs and browser type=url constraints.
 */
function UrlTextControl({ value, onCommit, ...props }) {
	const [draft, setDraft] = useState(value || '');

	useEffect(() => {
		setDraft(value || '');
	}, [value]);

	const commit = () => {
		const next = draft.trim();
		if (next !== (value || '').trim()) {
			onCommit(next);
		}
	};

	return (
		<TextControl
			{...props}
			type="text"
			inputMode="url"
			autoComplete="url"
			value={draft}
			onChange={setDraft}
			onBlur={commit}
			onKeyDown={(event) => {
				if (event.key === 'Enter') {
					event.preventDefault();
					commit();
				}
			}}
		/>
	);
}

function HostPicker({ selectedIds, onChange }) {
	const [terms, setTerms] = useState([]);
	const [notice, setNotice] = useState('');

	useEffect(() => {
		apiFetch({ path: `/wp/v2/${HOST_TAXONOMY}?per_page=100` })
			.then((rows) => setTerms(Array.isArray(rows) ? rows : []))
			.catch(() => setTerms([]));
	}, []);

	const byId = useMemo(() => {
		const map = {};
		terms.forEach((t) => {
			map[t.id] = t;
		});
		return map;
	}, [terms]);

	const suggestions = terms.map((t) => t.name);
	const value = selectedIds
		.map((id) => byId[id]?.name)
		.filter(Boolean);

	const ensureTerm = async (name) => {
		const existing = terms.find(
			(t) => t.name.toLowerCase() === name.toLowerCase()
		);
		if (existing) return existing;
		const created = await apiFetch({
			path: `/wp/v2/${HOST_TAXONOMY}`,
			method: 'POST',
			data: { name },
		});
		setTerms((prev) => [...prev, created]);
		return created;
	};

	const onTokenChange = async (tokens) => {
		setNotice('');
		const ids = [];
		for (const token of tokens) {
			try {
				const term = await ensureTerm(token);
				ids.push(term.id);
			} catch (e) {
				setNotice(__('Could not create host. Try again.', 'kpf-core'));
			}
		}
		onChange([...new Set(ids)]);
	};

	const setLogo = async (termId, attachmentId) => {
		await apiFetch({
			path: `/wp/v2/${HOST_TAXONOMY}/${termId}`,
			method: 'POST',
			data: { logo: { id: attachmentId || 0 } },
		});
		setTerms((prev) =>
			prev.map((t) =>
				t.id === termId
					? { ...t, logo: { id: attachmentId || 0, url: t.logo?.url } }
					: t
			)
		);
		// Refresh logo URL
		apiFetch({ path: `/wp/v2/${HOST_TAXONOMY}/${termId}` }).then((fresh) => {
			setTerms((prev) => prev.map((t) => (t.id === fresh.id ? fresh : t)));
		});
	};

	return (
		<>
			<FormTokenField
				label={__('Hosts', 'kpf-core')}
				value={value}
				suggestions={suggestions}
				onChange={onTokenChange}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			{notice ? (
				<Notice status="error" isDismissible={false}>
					{notice}
				</Notice>
			) : null}
			{selectedIds.map((id) => {
				const term = byId[id];
				if (!term) return null;
				const logoId = term.logo?.id || 0;
				const logoUrl = term.logo?.url || '';
				return (
					<div
						key={id}
						style={{
							border: '1px solid #dcdcde',
							borderRadius: 4,
							padding: 10,
							marginTop: 10,
						}}
					>
						<strong>{term.name}</strong>
						<div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
							{logoUrl ? (
								<img
									src={logoUrl}
									alt=""
									style={{ width: 40, height: 40, objectFit: 'contain' }}
								/>
							) : (
								<span style={{ color: '#646970' }}>
									{__('No logo', 'kpf-core')}
								</span>
							)}
							<MediaUploadCheck>
								<MediaUpload
									onSelect={(media) => setLogo(id, media.id)}
									allowedTypes={['image']}
									value={logoId}
									render={({ open }) => (
										<Button variant="secondary" onClick={open}>
											{logoId
												? __('Change logo', 'kpf-core')
												: __('Set logo', 'kpf-core')}
										</Button>
									)}
								/>
							</MediaUploadCheck>
							{logoId ? (
								<Button
									variant="tertiary"
									isDestructive
									onClick={() => setLogo(id, 0)}
								>
									{__('Remove', 'kpf-core')}
								</Button>
							) : null}
						</div>
					</div>
				);
			})}
		</>
	);
}

function DayRuleFields({ schedule, updateSchedule }) {
	return (
		<>
			<SelectControl
				label={__('Day rule', 'kpf-core')}
				value={schedule.monthly_mode || 'day_of_month'}
				options={[
					{ label: __('Specific date (e.g. the 17th)', 'kpf-core'), value: 'day_of_month' },
					{ label: __('Specific weekday (e.g. third Wednesday)', 'kpf-core'), value: 'nth_weekday' },
				]}
				onChange={(monthly_mode) => updateSchedule({ monthly_mode })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			{schedule.monthly_mode === 'nth_weekday' ? (
				<>
					<SelectControl
						label={__('Which week', 'kpf-core')}
						value={String(schedule.nth_weekday?.n || 1)}
						options={NTH_OPTIONS}
						onChange={(n) =>
							updateSchedule({
								nth_weekday: { ...schedule.nth_weekday, n: parseInt(n, 10) },
							})
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={__('Weekday', 'kpf-core')}
						value={schedule.nth_weekday?.day || 'MO'}
						options={WEEKDAYS}
						onChange={(day) =>
							updateSchedule({
								nth_weekday: { ...schedule.nth_weekday, day },
							})
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</>
			) : (
				<TextControl
					label={__('Day of month', 'kpf-core')}
					type="number"
					min={1}
					max={31}
					value={schedule.by_monthday > 0 ? String(schedule.by_monthday) : ''}
					onChange={(v) => {
						const n = parseInt(v, 10);
						updateSchedule({
							by_monthday: Number.isFinite(n) && n >= 1 && n <= 31 ? n : 0,
						});
					}}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			)}
		</>
	);
}

function AnchorEditor({ anchors, onChange, max = 2 }) {
	const rows = anchors.length ? anchors : [];

	const setRow = (index, patch) => {
		const next = [...rows];
		next[index] = { ...next[index], ...patch };
		onChange(next);
	};

	return (
		<div>
			<p style={{ marginBottom: 10, color: '#646970', fontSize: 12 }}>
				{__(
					'Annual events can use an exact date, a weekday pattern (e.g. third Saturday), or anytime in the month.',
					'kpf-core'
				)}
			</p>
			{rows.map((anchor, index) => {
				const dayMode = anchor.day_mode || (anchor.day >= 1 ? 'exact' : 'month');
				return (
					<div
						key={index}
						style={{
							display: 'grid',
							gap: 8,
							marginBottom: 16,
							paddingBottom: 12,
							borderBottom: index < rows.length - 1 ? '1px solid #dcdcde' : undefined,
						}}
					>
						<div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
							<SelectControl
								label={__('Month', 'kpf-core')}
								value={String(anchor.month || 1)}
								options={MONTH_OPTIONS}
								onChange={(month) => setRow(index, { month: parseInt(month, 10) })}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<Button
								variant="tertiary"
								isDestructive
								onClick={() => onChange(rows.filter((_, i) => i !== index))}
								style={{ alignSelf: 'end' }}
							>
								{__('Remove', 'kpf-core')}
							</Button>
						</div>
						<SelectControl
							label={__('Date rule', 'kpf-core')}
							value={dayMode}
							options={[
								{
									label: __('Exact day of the month', 'kpf-core'),
									value: 'exact',
								},
								{
									label: __('Weekday of the month (e.g. 3rd Saturday)', 'kpf-core'),
									value: 'nth_weekday',
								},
								{
									label: __('Anytime that month', 'kpf-core'),
									value: 'month',
								},
							]}
							onChange={(nextMode) => {
								const patch = { day_mode: nextMode };
								if (nextMode === 'exact') {
									patch.day = anchor.day >= 1 ? anchor.day : 1;
								} else {
									patch.day = 0;
								}
								if (nextMode === 'nth_weekday' && !anchor.nth_weekday) {
									patch.nth_weekday = { n: 3, day: 'SA' };
								}
								setRow(index, patch);
							}}
							help={
								dayMode === 'month'
									? __(
											'Good when the event stays in the same month but not on a fixed date.',
											'kpf-core'
										)
									: dayMode === 'nth_weekday'
										? __(
												'Date moves each year (e.g. the third Saturday of August).',
												'kpf-core'
											)
										: undefined
							}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						{dayMode === 'exact' ? (
							<TextControl
								label={__('Day', 'kpf-core')}
								type="number"
								min={1}
								max={31}
								value={String(anchor.day || '')}
								onChange={(day) => {
									const n = parseInt(day, 10);
									setRow(index, {
										day: Number.isFinite(n) ? n : 1,
										day_mode: 'exact',
									});
								}}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						) : null}
						{dayMode === 'nth_weekday' ? (
							<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
								<SelectControl
									label={__('Which week', 'kpf-core')}
									value={String(anchor.nth_weekday?.n || 3)}
									options={NTH_OPTIONS}
									onChange={(n) =>
										setRow(index, {
											day_mode: 'nth_weekday',
											nth_weekday: {
												...(anchor.nth_weekday || { day: 'SA' }),
												n: parseInt(n, 10),
											},
										})
									}
									__next40pxDefaultSize
									__nextHasNoMarginBottom
								/>
								<SelectControl
									label={__('Weekday', 'kpf-core')}
									value={anchor.nth_weekday?.day || 'SA'}
									options={WEEKDAYS}
									onChange={(day) =>
										setRow(index, {
											day_mode: 'nth_weekday',
											nth_weekday: {
												...(anchor.nth_weekday || { n: 3 }),
												day,
											},
										})
									}
									__next40pxDefaultSize
									__nextHasNoMarginBottom
								/>
							</div>
						) : null}
					</div>
				);
			})}
			{rows.length < max ? (
				<Button
					variant="secondary"
					onClick={() =>
						onChange([
							...rows,
							{ month: 1, day: 1, day_mode: 'exact', nth_weekday: { n: 3, day: 'SA' } },
						])
					}
				>
					{__('Add date', 'kpf-core')}
				</Button>
			) : null}
		</div>
	);
}

function SchedulePanel({ details, update, updateSchedule }) {
	const { frequency, duration_days: durationDays, schedule } = details;

	return (
		<>
			<SelectControl
				label={__('Frequency', 'kpf-core')}
				value={frequency}
				options={FREQUENCY_OPTIONS}
				onChange={(value) => update({ frequency: value })}
				help={__(
					'If you leave dates blank, cards show this frequency (e.g. “Quarterly”).',
					'kpf-core'
				)}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>

			{frequency === 'one_time' ? (
				<TextControl
					label={__('Date', 'kpf-core')}
					type="date"
					value={schedule.start_date || ''}
					onChange={(start_date) => updateSchedule({ start_date })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			) : null}

			{frequency === 'weekly' ? (
				<div style={{ marginBottom: 12 }}>
					<p style={{ marginBottom: 8 }}>
						<strong>{__('Days of the week', 'kpf-core')}</strong>
					</p>
					{WEEKDAYS.map((day) => (
						<CheckboxControl
							key={day.value}
							label={day.label}
							checked={(schedule.by_weekday || []).includes(day.value)}
							onChange={(checked) => {
								const set = new Set(schedule.by_weekday || []);
								if (checked) set.add(day.value);
								else set.delete(day.value);
								updateSchedule({ by_weekday: [...set] });
							}}
							__nextHasNoMarginBottom
						/>
					))}
				</div>
			) : null}

			{frequency === 'monthly' ? (
				<DayRuleFields schedule={schedule} updateSchedule={updateSchedule} />
			) : null}

			{frequency === 'quarterly' ? (
				<>
					<p style={{ marginBottom: 8 }}>
						<strong>{__('Months (preferred)', 'kpf-core')}</strong>
					</p>
					{MONTH_OPTIONS.map((month) => (
						<CheckboxControl
							key={month.value}
							label={month.label}
							checked={(schedule.by_month || []).includes(parseInt(month.value, 10))}
							onChange={(checked) => {
								const n = parseInt(month.value, 10);
								const set = new Set(schedule.by_month || []);
								if (checked) set.add(n);
								else set.delete(n);
								updateSchedule({ by_month: [...set].sort((a, b) => a - b) });
							}}
							__nextHasNoMarginBottom
						/>
					))}
					<DayRuleFields schedule={schedule} updateSchedule={updateSchedule} />
				</>
			) : null}

			{frequency === 'semiannually' || frequency === 'annually' ? (
				<AnchorEditor
					anchors={schedule.anchors || []}
					max={frequency === 'annually' ? 1 : 2}
					onChange={(anchors) => updateSchedule({ anchors })}
				/>
			) : null}

			<TextControl
				label={__('Duration (days)', 'kpf-core')}
				help={__('For multi-day events. Default is 1.', 'kpf-core')}
				type="number"
				min={1}
				max={30}
				value={String(durationDays || 1)}
				onChange={(v) => {
					const n = parseInt(v, 10);
					update({
						duration_days: Number.isFinite(n) && n >= 1 ? Math.min(30, n) : 1,
					});
				}}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
		</>
	);
}

function LocationPanel({ location, updateLocation }) {
	const mode = location.mode || 'none';

	return (
		<>
			<SelectControl
				label={__('Location type', 'kpf-core')}
				value={mode}
				options={LOCATION_MODE_OPTIONS}
				onChange={(nextMode) => updateLocation({ mode: nextMode })}
				help={__(
					'Choose how specific this event’s place should be: a general area, a full address, or a custom directions link (hotel, venue map, etc.).',
					'kpf-core'
				)}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>

			{mode !== 'none' ? (
				<TextControl
					label={__('Place name (optional)', 'kpf-core')}
					help={__('e.g. venue, hotel, or neighborhood name.', 'kpf-core')}
					value={location.label || ''}
					onChange={(label) => updateLocation({ label })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			) : null}

			{mode === 'address' ? (
				<>
					<TextControl
						label={__('Street address', 'kpf-core')}
						value={location.line1 || ''}
						onChange={(line1) => updateLocation({ line1 })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={__('Address line 2', 'kpf-core')}
						value={location.line2 || ''}
						onChange={(line2) => updateLocation({ line2 })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</>
			) : null}

			{mode === 'area' || mode === 'address' ? (
				<>
					<TextControl
						label={__('City', 'kpf-core')}
						value={location.city || ''}
						onChange={(city) => updateLocation({ city })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<div
						style={{
							display: 'grid',
							gridTemplateColumns: '1fr 1fr',
							gap: 8,
						}}
					>
						<TextControl
							label={__('State', 'kpf-core')}
							value={location.state || ''}
							onChange={(state) => updateLocation({ state })}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={__('ZIP / postal code', 'kpf-core')}
							value={location.postal_code || ''}
							onChange={(postal_code) => updateLocation({ postal_code })}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					</div>
					<UrlTextControl
						label={__('Custom directions URL (optional)', 'kpf-core')}
						placeholder="https://"
						help={__(
							'Leave blank to auto-build a Google Maps directions link from the fields above.',
							'kpf-core'
						)}
						value={location.url || ''}
						onCommit={(url) => updateLocation({ url })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</>
			) : null}

			{mode === 'directions' ? (
				<UrlTextControl
					label={__('Directions URL', 'kpf-core')}
					placeholder="https://"
					help={__(
						'Link that opens driving directions or a hotel/venue map page.',
						'kpf-core'
					)}
					value={location.url || ''}
					onCommit={(url) => updateLocation({ url })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			) : null}
		</>
	);
}

function EventsEditorApp() {
	const { details, update, updateSchedule, updateLocation } = useMeta();

	return (
		<div className="kpf-events-editor-app">
			<p className="kpf-events-editor-app__intro">
				{__(
					'These fields power event cards on the Events page. Set the title above and the event image in the sidebar.',
					'kpf-core'
				)}
			</p>

			<section className="kpf-events-editor-app__section">
				<h3>{__('Event details', 'kpf-core')}</h3>
				<TextControl
					label={__('Logline', 'kpf-core')}
					help={__('Short blurb for event cards.', 'kpf-core')}
					value={details.logline || ''}
					onChange={(logline) => update({ logline })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<TextareaControl
					label={__('Description', 'kpf-core')}
					value={details.description || ''}
					onChange={(description) => update({ description })}
					rows={5}
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={__('Contact email', 'kpf-core')}
					type="email"
					value={details.contact_email || ''}
					onChange={(contact_email) => update({ contact_email })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={__('Contact phone', 'kpf-core')}
					type="tel"
					value={details.contact_phone || ''}
					onChange={(contact_phone) => update({ contact_phone })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<UrlTextControl
					label={__('Website', 'kpf-core')}
					placeholder="https://"
					help={__('General event or organization page.', 'kpf-core')}
					value={details.website || ''}
					onCommit={(website) => update({ website })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<UrlTextControl
					label={__('Ticketing link', 'kpf-core')}
					placeholder="https://"
					help={__(
						'Where visitors buy tickets (Eventbrite, venue page, etc.).',
						'kpf-core'
					)}
					value={details.ticketing_link || ''}
					onCommit={(ticketing_link) => update({ ticketing_link })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</section>

			<section className="kpf-events-editor-app__section">
				<h3>{__('Location', 'kpf-core')}</h3>
				<LocationPanel
					location={details.location || DEFAULT_LOCATION}
					updateLocation={updateLocation}
				/>
			</section>

			<section className="kpf-events-editor-app__section">
				<h3>{__('Hosts', 'kpf-core')}</h3>
				<HostPicker
					selectedIds={details.host_term_ids || []}
					onChange={(host_term_ids) => update({ host_term_ids })}
				/>
			</section>

			<section className="kpf-events-editor-app__section">
				<h3>{__('Frequency & schedule', 'kpf-core')}</h3>
				<SchedulePanel
					details={details}
					update={update}
					updateSchedule={updateSchedule}
				/>
			</section>
		</div>
	);
}

function mountEventsEditor() {
	const el = document.getElementById('kpf-events-editor-root');
	if (!el || el.dataset.kpfMounted === '1') {
		return;
	}

	const tryMount = () => {
		const postType = window.wp?.data?.select('core/editor')?.getCurrentPostType?.();
		if (!postType) {
			return false;
		}
		el.dataset.kpfMounted = '1';
		createRoot(el).render(<EventsEditorApp />);
		return true;
	};

	if (tryMount()) {
		return;
	}

	if (!window.wp?.data?.subscribe) {
		return;
	}

	const unsubscribe = window.wp.data.subscribe(() => {
		if (tryMount()) {
			unsubscribe();
		}
	});
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', mountEventsEditor);
} else {
	mountEventsEditor();
}
