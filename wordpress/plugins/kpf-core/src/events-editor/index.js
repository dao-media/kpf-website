import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	CheckboxControl,
	FormTokenField,
	Notice,
	PanelBody,
	SelectControl,
	TextControl,
	TextareaControl,
	ToggleControl,
} from '@wordpress/components';
import { useEntityProp } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';

const cfg = window.kpfEventsEditor || {};
const META_KEY = cfg.metaKey || '_kpf_event';
const TEAM_POST_TYPE = cfg.teamPostType || 'kpf_team';
const LIVE_TAXONOMY = cfg.liveTaxonomy || 'kpf_live_event';
const PARTNER_TAXONOMY = cfg.partnerTaxonomy || 'kpf_event_partner';
const NEW_TEAM_URL = cfg.newTeamMemberUrl || 'post-new.php?post_type=kpf_team';
const TIMEZONES = cfg.timezones || [{ label: 'America/New_York', value: 'America/New_York' }];

const DEFAULT_RECURRENCE = {
	frequency: 'weekly',
	interval: 1,
	by_weekday: [],
	by_monthday: [],
	by_month: [],
	monthly_mode: 'day_of_month',
	nth_weekday: { n: 1, day: 'MO' },
	end_mode: 'never',
	until: '',
	count: 0,
};

const DEFAULTS = {
	version: 1,
	start_date: '',
	end_date: '',
	start_time: '',
	end_time: '',
	timezone: 'America/New_York',
	location_type: 'tbd',
	description: '',
	details: '',
	food_drinks: 'none',
	is_recurring: false,
	recurrence: DEFAULT_RECURRENCE,
	exceptions: [],
	reschedules: [],
	host_ids: [],
	co_host_term_ids: [],
};

const WEEKDAYS = [
	{ label: __('Mon', 'kpf-core'), value: 'MO' },
	{ label: __('Tue', 'kpf-core'), value: 'TU' },
	{ label: __('Wed', 'kpf-core'), value: 'WE' },
	{ label: __('Thu', 'kpf-core'), value: 'TH' },
	{ label: __('Fri', 'kpf-core'), value: 'FR' },
	{ label: __('Sat', 'kpf-core'), value: 'SA' },
	{ label: __('Sun', 'kpf-core'), value: 'SU' },
];

function useMeta() {
	const postType = useSelect(
		(select) => select('core/editor').getCurrentPostType(),
		[]
	);
	const [meta, setMeta] = useEntityProp('postType', postType, 'meta');
	const details = useMemo(
		() => ({
			...DEFAULTS,
			...(meta?.[META_KEY] || {}),
			recurrence: {
				...DEFAULT_RECURRENCE,
				...(meta?.[META_KEY]?.recurrence || {}),
				nth_weekday: {
					...DEFAULT_RECURRENCE.nth_weekday,
					...(meta?.[META_KEY]?.recurrence?.nth_weekday || {}),
				},
			},
		}),
		[meta]
	);

	const update = (patch) => {
		setMeta({
			...meta,
			[META_KEY]: { ...details, ...patch },
		});
	};

	return { details, update };
}

function HostPicker({ hostIds, onChange }) {
	const [search, setSearch] = useState('');
	const teamMembers = useSelect(
		(select) =>
			select('core').getEntityRecords('postType', TEAM_POST_TYPE, {
				per_page: 100,
				search: search || undefined,
				status: 'publish,draft,pending,private,future',
				_fields: 'id,title',
			}) || [],
		[search]
	);

	const selected = useSelect(
		(select) =>
			(hostIds || []).map((id) => select('core').getEntityRecord('postType', TEAM_POST_TYPE, id)).filter(Boolean),
		[hostIds]
	);

	const suggestions = useMemo(() => {
		const names = new Set();
		[...selected, ...teamMembers].forEach((member) => {
			const title = member?.title?.rendered || member?.title?.raw || '';
			if (title) {
				names.add(title.replace(/<[^>]+>/g, ''));
			}
		});
		return Array.from(names);
	}, [selected, teamMembers]);

	const tokens = selected.map((member) =>
		(member?.title?.rendered || member?.title?.raw || `#${member.id}`).replace(/<[^>]+>/g, '')
	);

	const resolveIdByTitle = (title) => {
		const match = [...selected, ...teamMembers].find((member) => {
			const name = (member?.title?.rendered || member?.title?.raw || '').replace(/<[^>]+>/g, '');
			return name === title;
		});
		return match?.id || 0;
	};

	return (
		<>
			<FormTokenField
				label={__('Host(s)', 'kpf-core')}
				value={tokens}
				suggestions={suggestions}
				onInputChange={setSearch}
				onChange={(nextTokens) => {
					const ids = nextTokens.map(resolveIdByTitle).filter(Boolean);
					onChange(ids);
				}}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			<p style={{ marginTop: 4, fontSize: 12 }}>
				{__('No matching team member?', 'kpf-core')}{' '}
				<a href={NEW_TEAM_URL} target="_blank" rel="noreferrer">
					{__('Add a new team member', 'kpf-core')}
				</a>
			</p>
		</>
	);
}

function CoHostPicker({ termIds, onChange }) {
	const [search, setSearch] = useState('');
	const [logoDrafts, setLogoDrafts] = useState({});
	const { editEntityRecord, saveEntityRecord } = useDispatch('core');

	const partners = useSelect(
		(select) =>
			select('core').getEntityRecords('taxonomy', PARTNER_TAXONOMY, {
				per_page: 100,
				search: search || undefined,
				hide_empty: false,
			}) || [],
		[search]
	);

	const selected = useSelect(
		(select) =>
			(termIds || [])
				.map((id) => select('core').getEntityRecord('taxonomy', PARTNER_TAXONOMY, id))
				.filter(Boolean),
		[termIds]
	);

	const suggestions = useMemo(() => {
		const names = new Set();
		[...selected, ...partners].forEach((term) => {
			if (term?.name) {
				names.add(term.name);
			}
		});
		return Array.from(names);
	}, [selected, partners]);

	const tokens = selected.map((term) => term.name);

	const ensurePartner = async (name) => {
		const existing = [...selected, ...partners].find(
			(term) => term.name.toLowerCase() === name.toLowerCase()
		);
		if (existing) {
			return existing.id;
		}
		const created = await saveEntityRecord('taxonomy', PARTNER_TAXONOMY, { name });
		return created?.id || 0;
	};

	const setLogo = async (termId, attachmentId) => {
		setLogoDrafts((prev) => ({ ...prev, [termId]: attachmentId }));
		await apiFetch({
			path: `/wp/v2/${PARTNER_TAXONOMY}/${termId}`,
			method: 'POST',
			data: { logo: { id: attachmentId } },
		});
		editEntityRecord('taxonomy', PARTNER_TAXONOMY, termId, {
			logo: { id: attachmentId },
		});
	};

	return (
		<>
			<FormTokenField
				label={__('Co-Host(s)', 'kpf-core')}
				value={tokens}
				suggestions={suggestions}
				onInputChange={setSearch}
				onChange={async (nextTokens) => {
					const ids = [];
					for (const name of nextTokens) {
						const id = await ensurePartner(name);
						if (id) {
							ids.push(id);
						}
					}
					onChange(ids);
				}}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			{selected.map((term) => {
				const logoId = logoDrafts[term.id] ?? term.logo?.id ?? 0;
				const logoUrl = term.logo?.url || '';
				return (
					<div
						key={term.id}
						style={{
							display: 'flex',
							gap: 10,
							alignItems: 'center',
							marginBottom: 8,
							padding: 8,
							border: '1px solid #dcdcde',
							borderRadius: 4,
						}}
					>
						{logoUrl || logoId ? (
							<img
								src={logoUrl}
								alt=""
								style={{ width: 40, height: 40, objectFit: 'contain' }}
							/>
						) : (
							<span
								style={{
									width: 40,
									height: 40,
									background: '#f0f0f1',
									display: 'inline-block',
								}}
							/>
						)}
						<div style={{ flex: 1 }}>
							<strong>{term.name}</strong>
							<div>
								<MediaUploadCheck>
									<MediaUpload
										onSelect={(media) => setLogo(term.id, media.id)}
										allowedTypes={['image']}
										value={logoId || undefined}
										render={({ open }) => (
											<Button variant="link" onClick={open}>
												{logoId
													? __('Change logo', 'kpf-core')
													: __('Add logo', 'kpf-core')}
											</Button>
										)}
									/>
								</MediaUploadCheck>
							</div>
						</div>
					</div>
				);
			})}
		</>
	);
}

function LiveEventsField() {
	const { editPost } = useDispatch('core/editor');
	const selectedIds = useSelect(
		(select) => select('core/editor').getEditedPostAttribute(LIVE_TAXONOMY) || [],
		[]
	);
	const terms = useSelect(
		(select) =>
			select('core').getEntityRecords('taxonomy', LIVE_TAXONOMY, {
				per_page: 100,
				hide_empty: false,
			}) || [],
		[]
	);
	const { saveEntityRecord } = useDispatch('core');
	const [search, setSearch] = useState('');

	const selected = terms.filter((term) => selectedIds.includes(term.id));
	const tokens = selected.map((term) => term.name);
	const suggestions = terms.map((term) => term.name);

	return (
		<FormTokenField
			label={__('Live events', 'kpf-core')}
			help={__(
				'Activities, music, and other live programming. Type to search or add a new type.',
				'kpf-core'
			)}
			value={tokens}
			suggestions={suggestions.filter((name) =>
				search ? name.toLowerCase().includes(search.toLowerCase()) : true
			)}
			onInputChange={setSearch}
			onChange={async (nextTokens) => {
				const ids = [];
				for (const name of nextTokens) {
					let term = terms.find((t) => t.name.toLowerCase() === name.toLowerCase());
					if (!term) {
						term = await saveEntityRecord('taxonomy', LIVE_TAXONOMY, { name });
					}
					if (term?.id) {
						ids.push(term.id);
					}
				}
				editPost({ [LIVE_TAXONOMY]: ids });
			}}
			__next40pxDefaultSize
			__nextHasNoMarginBottom
		/>
	);
}

function EventsPanel() {
	const { details, update } = useMeta();
	const recurrence = details.recurrence || DEFAULT_RECURRENCE;
	const { editPost } = useDispatch('core/editor');
	const { removeEditorPanel } = useDispatch('core/edit-post');

	useEffect(() => {
		removeEditorPanel?.(`taxonomy-panel-${PARTNER_TAXONOMY}`);
		removeEditorPanel?.(`taxonomy-panel-${LIVE_TAXONOMY}`);
	}, [removeEditorPanel]);

	useEffect(() => {
		editPost({ [PARTNER_TAXONOMY]: details.co_host_term_ids || [] });
	}, [details.co_host_term_ids, editPost]);

	const updateRecurrence = (patch) => {
		update({ recurrence: { ...recurrence, ...patch } });
	};

	const exceptions = Array.isArray(details.exceptions) ? details.exceptions : [];
	const reschedules = Array.isArray(details.reschedules) ? details.reschedules : [];

	return (
		<>
			<PluginDocumentSettingPanel
				name="kpf-event-schedule"
				title={__('Event schedule', 'kpf-core')}
				className="kpf-event-schedule-panel"
			>
				<TextControl
					label={__('Start date', 'kpf-core')}
					type="date"
					value={details.start_date || ''}
					onChange={(start_date) => update({ start_date })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<TextControl
					label={__('End date', 'kpf-core')}
					help={__('Optional for multi-day events.', 'kpf-core')}
					type="date"
					value={details.end_date || ''}
					onChange={(end_date) => update({ end_date })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
					<TextControl
						label={__('Start time', 'kpf-core')}
						type="time"
						value={details.start_time || ''}
						onChange={(start_time) => update({ start_time })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={__('End time', 'kpf-core')}
						type="time"
						value={details.end_time || ''}
						onChange={(end_time) => update({ end_time })}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</div>
				<SelectControl
					label={__('Time zone', 'kpf-core')}
					value={details.timezone || 'America/New_York'}
					options={TIMEZONES}
					onChange={(timezone) => update({ timezone })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<SelectControl
					label={__('Indoor / outdoor', 'kpf-core')}
					value={details.location_type || 'tbd'}
					options={[
						{ label: __('TBD', 'kpf-core'), value: 'tbd' },
						{ label: __('Indoor', 'kpf-core'), value: 'indoor' },
						{ label: __('Outdoor', 'kpf-core'), value: 'outdoor' },
						{ label: __('Indoor & outdoor', 'kpf-core'), value: 'both' },
					]}
					onChange={(location_type) => update({ location_type })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<ToggleControl
					label={__('Recurring event', 'kpf-core')}
					checked={!!details.is_recurring}
					onChange={(is_recurring) => update({ is_recurring })}
					__nextHasNoMarginBottom
				/>
				{details.is_recurring ? (
					<>
						<Notice status="info" isDismissible={false}>
							{__(
								'Recurring occurrence URLs use /event/eventname_MMDDYYYY.',
								'kpf-core'
							)}
						</Notice>
						<SelectControl
							label={__('Frequency', 'kpf-core')}
							value={recurrence.frequency}
							options={[
								{ label: __('Daily', 'kpf-core'), value: 'daily' },
								{ label: __('Weekly', 'kpf-core'), value: 'weekly' },
								{ label: __('Monthly', 'kpf-core'), value: 'monthly' },
								{ label: __('Yearly', 'kpf-core'), value: 'yearly' },
							]}
							onChange={(frequency) => updateRecurrence({ frequency })}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<TextControl
							label={__('Every', 'kpf-core')}
							type="number"
							min={1}
							max={99}
							help={__('Interval between occurrences (e.g. every 2 weeks).', 'kpf-core')}
							value={String(recurrence.interval || 1)}
							onChange={(value) =>
								updateRecurrence({ interval: Math.max(1, parseInt(value, 10) || 1) })
							}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						{'weekly' === recurrence.frequency ? (
							<div style={{ marginBottom: 12 }}>
								<p style={{ marginBottom: 6 }}>
									<strong>{__('Days of the week', 'kpf-core')}</strong>
								</p>
								{WEEKDAYS.map((day) => (
									<CheckboxControl
										key={day.value}
										label={day.label}
										checked={(recurrence.by_weekday || []).includes(day.value)}
										onChange={(checked) => {
											const current = recurrence.by_weekday || [];
											updateRecurrence({
												by_weekday: checked
													? [...current, day.value]
													: current.filter((d) => d !== day.value),
											});
										}}
										__nextHasNoMarginBottom
									/>
								))}
							</div>
						) : null}
						{'monthly' === recurrence.frequency ? (
							<>
								<SelectControl
									label={__('Monthly pattern', 'kpf-core')}
									value={recurrence.monthly_mode}
									options={[
										{
											label: __('Day of month', 'kpf-core'),
											value: 'day_of_month',
										},
										{
											label: __('Nth weekday', 'kpf-core'),
											value: 'nth_weekday',
										},
									]}
									onChange={(monthly_mode) => updateRecurrence({ monthly_mode })}
									__next40pxDefaultSize
									__nextHasNoMarginBottom
								/>
								{'nth_weekday' === recurrence.monthly_mode ? (
									<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
										<SelectControl
											label={__('Which', 'kpf-core')}
											value={String(recurrence.nth_weekday?.n || 1)}
											options={[1, 2, 3, 4, 5].map((n) => ({
												label: String(n),
												value: String(n),
											}))}
											onChange={(n) =>
												updateRecurrence({
													nth_weekday: {
														...recurrence.nth_weekday,
														n: parseInt(n, 10),
													},
												})
											}
											__next40pxDefaultSize
											__nextHasNoMarginBottom
										/>
										<SelectControl
											label={__('Weekday', 'kpf-core')}
											value={recurrence.nth_weekday?.day || 'MO'}
											options={WEEKDAYS}
											onChange={(day) =>
												updateRecurrence({
													nth_weekday: {
														...recurrence.nth_weekday,
														day,
													},
												})
											}
											__next40pxDefaultSize
											__nextHasNoMarginBottom
										/>
									</div>
								) : (
									<TextControl
										label={__('Days of month (comma-separated)', 'kpf-core')}
										value={(recurrence.by_monthday || []).join(', ')}
										onChange={(value) =>
											updateRecurrence({
												by_monthday: value
													.split(',')
													.map((part) => parseInt(part.trim(), 10))
													.filter((n) => n >= 1 && n <= 31),
											})
										}
										__next40pxDefaultSize
										__nextHasNoMarginBottom
									/>
								)}
							</>
						) : null}
						{'yearly' === recurrence.frequency ? (
							<TextControl
								label={__('Months (1–12, comma-separated)', 'kpf-core')}
								value={(recurrence.by_month || []).join(', ')}
								onChange={(value) =>
									updateRecurrence({
										by_month: value
											.split(',')
											.map((part) => parseInt(part.trim(), 10))
											.filter((n) => n >= 1 && n <= 12),
									})
								}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						) : null}
						<SelectControl
							label={__('Ends', 'kpf-core')}
							value={recurrence.end_mode}
							options={[
								{ label: __('Never', 'kpf-core'), value: 'never' },
								{ label: __('On date', 'kpf-core'), value: 'until' },
								{ label: __('After count', 'kpf-core'), value: 'count' },
							]}
							onChange={(end_mode) => updateRecurrence({ end_mode })}
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						{'until' === recurrence.end_mode ? (
							<TextControl
								label={__('Until', 'kpf-core')}
								type="date"
								value={recurrence.until || ''}
								onChange={(until) => updateRecurrence({ until })}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						) : null}
						{'count' === recurrence.end_mode ? (
							<TextControl
								label={__('Number of occurrences', 'kpf-core')}
								type="number"
								min={1}
								value={String(recurrence.count || 0)}
								onChange={(value) =>
									updateRecurrence({ count: Math.max(0, parseInt(value, 10) || 0) })
								}
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						) : null}

						<PanelBody title={__('Exceptions (skip dates)', 'kpf-core')} initialOpen={false}>
							{exceptions.map((row, index) => (
								<div
									key={`ex-${index}`}
									style={{
										border: '1px solid #dcdcde',
										padding: 8,
										marginBottom: 8,
										borderRadius: 4,
									}}
								>
									<TextControl
										label={__('Date to skip', 'kpf-core')}
										type="date"
										value={row.date || ''}
										onChange={(date) => {
											const next = exceptions.map((item, i) =>
												i === index ? { ...item, date } : item
											);
											update({ exceptions: next });
										}}
										__next40pxDefaultSize
										__nextHasNoMarginBottom
									/>
									<TextControl
										label={__('Reason (optional)', 'kpf-core')}
										value={row.reason || ''}
										onChange={(reason) => {
											const next = exceptions.map((item, i) =>
												i === index ? { ...item, reason } : item
											);
											update({ exceptions: next });
										}}
										__next40pxDefaultSize
										__nextHasNoMarginBottom
									/>
									<Button
										variant="link"
										isDestructive
										onClick={() =>
											update({
												exceptions: exceptions.filter((_, i) => i !== index),
											})
										}
									>
										{__('Remove exception', 'kpf-core')}
									</Button>
								</div>
							))}
							<Button
								variant="secondary"
								onClick={() =>
									update({
										exceptions: [...exceptions, { date: '', reason: '' }],
									})
								}
							>
								{__('Add exception', 'kpf-core')}
							</Button>
						</PanelBody>

						<PanelBody title={__('Reschedule occurrences', 'kpf-core')} initialOpen={false}>
							{reschedules.map((row, index) => (
								<div
									key={`rs-${index}`}
									style={{
										border: '1px solid #dcdcde',
										padding: 8,
										marginBottom: 8,
										borderRadius: 4,
									}}
								>
									<TextControl
										label={__('Original date', 'kpf-core')}
										type="date"
										value={row.original_date || ''}
										onChange={(original_date) => {
											const next = reschedules.map((item, i) =>
												i === index ? { ...item, original_date } : item
											);
											update({ reschedules: next });
										}}
										__next40pxDefaultSize
										__nextHasNoMarginBottom
									/>
									<TextControl
										label={__('New date', 'kpf-core')}
										type="date"
										value={row.new_date || ''}
										onChange={(new_date) => {
											const next = reschedules.map((item, i) =>
												i === index ? { ...item, new_date } : item
											);
											update({ reschedules: next });
										}}
										__next40pxDefaultSize
										__nextHasNoMarginBottom
									/>
									<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
										<TextControl
											label={__('New start time', 'kpf-core')}
											type="time"
											value={row.start_time || ''}
											onChange={(start_time) => {
												const next = reschedules.map((item, i) =>
													i === index ? { ...item, start_time } : item
												);
												update({ reschedules: next });
											}}
											__next40pxDefaultSize
											__nextHasNoMarginBottom
										/>
										<TextControl
											label={__('New end time', 'kpf-core')}
											type="time"
											value={row.end_time || ''}
											onChange={(end_time) => {
												const next = reschedules.map((item, i) =>
													i === index ? { ...item, end_time } : item
												);
												update({ reschedules: next });
											}}
											__next40pxDefaultSize
											__nextHasNoMarginBottom
										/>
									</div>
									<TextControl
										label={__('Note', 'kpf-core')}
										value={row.note || ''}
										onChange={(note) => {
											const next = reschedules.map((item, i) =>
												i === index ? { ...item, note } : item
											);
											update({ reschedules: next });
										}}
										__next40pxDefaultSize
										__nextHasNoMarginBottom
									/>
									<Button
										variant="link"
										isDestructive
										onClick={() =>
											update({
												reschedules: reschedules.filter((_, i) => i !== index),
											})
										}
									>
										{__('Remove reschedule', 'kpf-core')}
									</Button>
								</div>
							))}
							<Button
								variant="secondary"
								onClick={() =>
									update({
										reschedules: [
											...reschedules,
											{
												original_date: '',
												new_date: '',
												start_time: '',
												end_time: '',
												note: '',
											},
										],
									})
								}
							>
								{__('Add reschedule', 'kpf-core')}
							</Button>
						</PanelBody>
					</>
				) : null}
			</PluginDocumentSettingPanel>

			<PluginDocumentSettingPanel
				name="kpf-event-details"
				title={__('Event details', 'kpf-core')}
			>
				<TextareaControl
					label={__('Description', 'kpf-core')}
					help={__('Used as the meta description for SEO.', 'kpf-core')}
					value={details.description || ''}
					onChange={(description) => update({ description })}
					rows={3}
					__nextHasNoMarginBottom
				/>
				<TextareaControl
					label={__('Details', 'kpf-core')}
					help={__(
						'Longer event details. A public toggle can be added later.',
						'kpf-core'
					)}
					value={details.details || ''}
					onChange={(value) => update({ details: value })}
					rows={5}
					__nextHasNoMarginBottom
				/>
				<SelectControl
					label={__('Food / drinks served', 'kpf-core')}
					value={details.food_drinks || 'none'}
					options={[
						{ label: __('Both', 'kpf-core'), value: 'both' },
						{ label: __('Food', 'kpf-core'), value: 'food' },
						{ label: __('Drinks', 'kpf-core'), value: 'drinks' },
						{ label: __('None', 'kpf-core'), value: 'none' },
					]}
					onChange={(food_drinks) => update({ food_drinks })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<LiveEventsField />
			</PluginDocumentSettingPanel>

			<PluginDocumentSettingPanel
				name="kpf-event-hosts"
				title={__('Hosts & co-hosts', 'kpf-core')}
			>
				<HostPicker
					hostIds={details.host_ids || []}
					onChange={(host_ids) => update({ host_ids })}
				/>
				<div style={{ marginTop: 16 }}>
					<CoHostPicker
						termIds={details.co_host_term_ids || []}
						onChange={(co_host_term_ids) => update({ co_host_term_ids })}
					/>
				</div>
			</PluginDocumentSettingPanel>
		</>
	);
}

registerPlugin('kpf-events-editor', {
	render: EventsPanel,
	icon: 'calendar-alt',
});
