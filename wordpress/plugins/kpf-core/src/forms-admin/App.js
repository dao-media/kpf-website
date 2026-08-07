import apiFetch from '@wordpress/api-fetch';
import {
	Button,
	Notice,
	Spinner,
	TextControl,
	TextareaControl,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { useEffect, useMemo, useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import {
	FIELD_TYPES,
	emptyDraft,
	makeField,
	sanitizeFieldKey,
	slugify,
	uid,
} from './fieldDefaults';
import FormSettings from './FormSettings';
import {
	findFieldLocation,
	normalizeRows,
	placeFieldInSlot,
	removeFieldFromRows,
	reorderRow,
	resizeRowColumns,
	withRowFields,
} from './rowModel';

apiFetch.use(apiFetch.createNonceMiddleware(window.kpfFormsAdmin?.nonce || ''));

const REST_BASE = (window.kpfFormsAdmin?.restBase || '/wp-json/kpf-forms/v1').replace(
	/\/$/,
	''
);
const CONDITION_SOURCES = window.kpfFormsAdmin?.conditions || [];
const OPERATORS = window.kpfFormsAdmin?.operators || [];
const PLATFORMS = window.kpfFormsAdmin?.platforms || [];

const DND_TYPE = 'application/x-kpf-form-type';
const DND_FIELD = 'application/x-kpf-form-field';
const DND_ROW = 'application/x-kpf-form-row';

function groupTypes() {
	const groups = {};
	for (const type of FIELD_TYPES) {
		if (!groups[type.group]) groups[type.group] = [];
		groups[type.group].push(type);
	}
	return groups;
}

function FieldPreview({ field }) {
	const common = {
		className: 'kpf-forms-canvas__control',
		disabled: true,
		placeholder: field.placeholder || field.label,
	};

	switch (field.type) {
		case 'long_text':
			return <textarea {...common} rows={3} />;
		case 'select':
		case 'multiselect':
			return (
				<select
					{...common}
					multiple={field.type === 'multiselect'}
					value={
						field.type === 'multiselect'
							? parseDefaultMulti(field.defaultValue, field.options)
							: field.defaultValue || ''
					}
					readOnly
				>
					{field.type === 'select' && (
						<option value="">{field.placeholder || 'Select…'}</option>
					)}
					{(field.options || []).map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
			);
		case 'radio':
		case 'checkbox_group':
			return (
				<div className="kpf-forms-canvas__choices">
					{(field.options || []).map((opt) => {
						const checked =
							field.type === 'radio'
								? field.defaultValue === opt.value
								: parseDefaultMulti(field.defaultValue, field.options).includes(
										opt.value
									);
						return (
							<label key={opt.value}>
								<input
									type={field.type === 'radio' ? 'radio' : 'checkbox'}
									disabled
									checked={checked}
									readOnly
								/>
								{opt.label}
							</label>
						);
					})}
				</div>
			);
		case 'checkbox':
		case 'toggle':
			return (
				<label className="kpf-forms-canvas__toggle">
					<input type="checkbox" disabled /> {field.label}
				</label>
			);
		case 'html':
			return (
				<div
					className="kpf-forms-canvas__html"
					dangerouslySetInnerHTML={{ __html: field.html || '' }}
				/>
			);
		case 'divider':
			return <hr />;
		case 'captcha':
			return <div className="kpf-forms-canvas__captcha">Captcha / honeypot</div>;
		case 'file':
			return <input type="file" disabled className="kpf-forms-canvas__control" />;
		case 'ranking':
			return (
				<ol className="kpf-forms-canvas__ranking">
					{(field.options || []).map((opt) => (
						<li key={opt.value}>{opt.label}</li>
					))}
				</ol>
			);
		case 'tel':
			return (
				<div className="kpf-forms-canvas__tel">
					<select disabled>
						<option>+1</option>
					</select>
					<input {...common} />
				</div>
			);
		default:
			return <input {...common} type={field.type === 'password' ? 'password' : 'text'} />;
	}
}

function readDragPayload(event) {
	const customType = event.dataTransfer.getData(DND_TYPE);
	if (customType && FIELD_TYPES.some((item) => item.id === customType)) {
		return { kind: 'type', typeId: customType };
	}

	const plain = event.dataTransfer.getData('text/plain') || '';
	if (plain.startsWith('kpf-type:')) {
		const typeId = plain.slice('kpf-type:'.length);
		if (FIELD_TYPES.some((item) => item.id === typeId)) {
			return { kind: 'type', typeId };
		}
	}

	const customRow =
		event.dataTransfer.getData(DND_ROW) ||
		(plain.startsWith('kpf-row:') ? plain.slice('kpf-row:'.length) : '');
	if (customRow) {
		return { kind: 'row', rowId: customRow };
	}

	const fieldRaw =
		event.dataTransfer.getData(DND_FIELD) ||
		(plain.startsWith('kpf-field:') ? plain.slice('kpf-field:'.length) : '');
	if (!fieldRaw) return null;

	try {
		const parsed = JSON.parse(fieldRaw);
		if (parsed?.fieldId) {
			return { kind: 'field', ...parsed };
		}
	} catch (error) {
		return null;
	}
	return null;
}

function isChoiceField(type) {
	return ['select', 'multiselect', 'radio', 'checkbox_group', 'ranking'].includes(type);
}

function isSelectorField(type) {
	return ['select', 'multiselect', 'radio', 'checkbox_group'].includes(type);
}

function isMultiSelectorField(type) {
	return type === 'multiselect' || type === 'checkbox_group';
}

function formatOptionsText(options) {
	return (Array.isArray(options) ? options : [])
		.map((opt) =>
			opt.value === opt.label ? opt.label : `${opt.label}|${opt.value}`
		)
		.join('\n');
}

function parseOptionsText(text) {
	return String(text || '')
		.split('\n')
		.map((line) => line.trim())
		.filter(Boolean)
		.map((line) => {
			const [label, value] = line.split('|').map((part) => part.trim());
			return { label, value: value || label };
		});
}

function parseDefaultMulti(defaultValue, options) {
	const allowed = new Set((options || []).map((opt) => opt.value));
	if (Array.isArray(defaultValue)) {
		return defaultValue.filter((value) => allowed.has(value));
	}
	return String(defaultValue || '')
		.split(',')
		.map((part) => part.trim())
		.filter((value) => value && allowed.has(value));
}

function FormEditor({
	draft,
	onChange,
	onSave,
	onCancel,
	saving,
	selection,
	onSelect,
}) {
	const definition = draft.definition;
	const fields = definition.fields || {};
	const rows = useMemo(
		() => normalizeRows(definition.rows || []),
		[definition.rows]
	);
	const selectedFieldId = selection?.kind === 'field' ? selection.fieldId : null;
	const selected = selectedFieldId ? fields[selectedFieldId] : null;
	const selectedSlot =
		selection?.kind === 'slot'
			? selection
			: selectedFieldId
				? (() => {
						const loc = findFieldLocation(rows, selectedFieldId);
						return loc
							? { kind: 'slot', rowId: loc.rowId, slotIndex: loc.slotIndex }
							: null;
					})()
				: null;
	const groups = useMemo(() => groupTypes(), []);
	const [dropTarget, setDropTarget] = useState(null);
	const [rowDropTarget, setRowDropTarget] = useState(null);
	const [draggingRowId, setDraggingRowId] = useState(null);
	const [editorTab, setEditorTab] = useState('builder');
	const [optionsDraft, setOptionsDraft] = useState('');
	const [nameDraft, setNameDraft] = useState('');

	useEffect(() => {
		if (!selected || !isChoiceField(selected.type)) {
			setOptionsDraft('');
			return;
		}
		setOptionsDraft(formatOptionsText(selected.options));
	}, [selected?.id, selected?.type]);

	useEffect(() => {
		setNameDraft(selected?.name || '');
	}, [selected?.id]);

	function selectTarget(next) {
		onSelect(next);
		if (next?.kind === 'field' || next?.kind === 'slot') {
			setEditorTab('builder');
		}
	}

	function patchDefinition(patch) {
		onChange({ ...draft, definition: { ...definition, ...patch } });
	}

	function patchSettings(patch) {
		patchDefinition({ settings: { ...definition.settings, ...patch } });
	}

	function patchField(id, patch) {
		patchDefinition({
			fields: {
				...fields,
				[id]: { ...fields[id], ...patch },
			},
		});
	}

	function setRows(nextRows) {
		patchDefinition({ rows: normalizeRows(nextRows).map((row) => withRowFields(row)) });
	}

	function resolveTargetSlot() {
		if (selection?.kind === 'slot') {
			return { rowId: selection.rowId, slotIndex: selection.slotIndex };
		}
		if (selection?.kind === 'field') {
			const loc = findFieldLocation(rows, selection.fieldId);
			if (loc) return { rowId: loc.rowId, slotIndex: loc.slotIndex };
		}
		return null;
	}

	function addColumns(columns) {
		const row = withRowFields({
			id: uid('row'),
			columns: Number(columns) === 2 ? 2 : 1,
			slots: Number(columns) === 2 ? [[], []] : [[]],
		});
		setRows([...rows, row]);
		selectTarget({ kind: 'slot', rowId: row.id, slotIndex: 0 });
	}

	function addField(typeMeta, target = null) {
		const id = uid('field');
		const width = typeMeta.defaultWidth || 'full';
		const field = makeField(id, typeMeta.id, typeMeta.label, slugify(typeMeta.label), width);
		const dest = target || resolveTargetSlot();

		let nextRows;
		if (dest) {
			nextRows = placeFieldInSlot(
				rows,
				id,
				dest.rowId,
				dest.slotIndex,
				dest.atIndex ?? null
			);
		} else {
			const row = withRowFields({
				id: uid('row'),
				columns: 1,
				slots: [[id]],
			});
			nextRows = [...rows, row];
		}

		patchDefinition({
			fields: { ...fields, [id]: field },
			rows: nextRows,
		});
		selectTarget({ kind: 'field', fieldId: id });
	}

	function removeField(fieldId) {
		const nextFields = { ...fields };
		delete nextFields[fieldId];
		patchDefinition({
			fields: nextFields,
			rows: removeFieldFromRows(rows, fieldId),
		});
		if (selectedFieldId === fieldId) selectTarget(null);
	}

	function removeRow(rowId) {
		const row = rows.find((item) => item.id === rowId);
		if (!row) return;
		const nextFields = { ...fields };
		for (const fieldId of row.fields || []) {
			delete nextFields[fieldId];
		}
		patchDefinition({
			fields: nextFields,
			rows: rows.filter((item) => item.id !== rowId),
		});
		if (
			selection?.kind === 'slot' && selection.rowId === rowId
			|| (selection?.kind === 'field' && (row.fields || []).includes(selection.fieldId))
		) {
			selectTarget(null);
		}
	}

	function setRowColumns(rowId, columns) {
		setRows(
			rows.map((row) =>
				row.id === rowId ? resizeRowColumns(row, columns) : row
			)
		);
	}

	function moveRow(rowId, dir) {
		const index = rows.findIndex((row) => row.id === rowId);
		if (index < 0) return;
		const target = index + dir;
		if (target < 0 || target >= rows.length) return;
		const next = [...rows];
		const [item] = next.splice(index, 1);
		next.splice(target, 0, item);
		setRows(next);
	}

	function updateRowDropTarget(event, rowId) {
		if (!isRowDrag(event)) return false;
		event.preventDefault();
		event.stopPropagation();
		event.dataTransfer.dropEffect = 'move';
		const rowEl = event.currentTarget.closest('.kpf-forms-canvas__row');
		if (!rowEl) return true;
		const rect = rowEl.getBoundingClientRect();
		const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
		setRowDropTarget({ rowId, position });
		setDropTarget(null);
		return true;
	}

	function handleDropOnRow(event, rowId) {
		const payload = readDragPayload(event);
		if (payload?.kind !== 'row') return false;

		event.preventDefault();
		event.stopPropagation();
		const position =
			rowDropTarget?.rowId === rowId ? rowDropTarget.position : 'before';
		setRows(reorderRow(rows, payload.rowId, rowId, position));
		setRowDropTarget(null);
		setDraggingRowId(null);
		setDropTarget(null);
		return true;
	}

	function handleDropOnSlot(event, rowId, slotIndex, atIndex = null) {
		if (handleDropOnRow(event, rowId)) return;

		event.preventDefault();
		event.stopPropagation();
		setDropTarget(null);
		setRowDropTarget(null);
		const payload = readDragPayload(event);
		if (!payload || payload.kind === 'row') return;

		if (payload.kind === 'type') {
			const typeMeta = FIELD_TYPES.find((item) => item.id === payload.typeId);
			if (!typeMeta) return;
			addField(typeMeta, { rowId, slotIndex, atIndex });
			return;
		}

		if (payload.kind === 'field' && payload.fieldId) {
			setRows(placeFieldInSlot(rows, payload.fieldId, rowId, slotIndex, atIndex));
			selectTarget({ kind: 'field', fieldId: payload.fieldId });
		}
	}

	function updateOptionsText(text) {
		if (!selected) return;
		// Keep the raw draft so Enter / blank lines aren't stripped while typing.
		setOptionsDraft(text);
		const options = parseOptionsText(text);
		const patch = { options };
		if (isSelectorField(selected.type)) {
			if (isMultiSelectorField(selected.type)) {
				patch.defaultValue = parseDefaultMulti(
					selected.defaultValue,
					options
				).join(',');
			} else if (
				selected.defaultValue &&
				!options.some((opt) => opt.value === selected.defaultValue)
			) {
				patch.defaultValue = '';
			}
		}
		patchField(selected.id, patch);
	}

	function addCondition() {
		if (!selected) return;
		const condition = {
			id: uid('cond'),
			action: 'show',
			match: 'all',
			rules: [
				{
					source: 'field',
					operator: 'equals',
					fieldId: '',
					key: '',
					value: '',
				},
			],
		};
		patchField(selected.id, {
			conditions: [...(selected.conditions || []), condition],
		});
	}

	const targetHint = selectedSlot
		? sprintf(
				/* translators: 1: column number, 2: columns count */
				__('Adding into column %1$d of %2$d', 'kpf-core'),
				(selectedSlot.slotIndex || 0) + 1,
				rows.find((row) => row.id === selectedSlot.rowId)?.columns || 1
			)
		: __('Select a column, then click a field — or drag fields onto a column.', 'kpf-core');

	return (
		<div className="kpf-forms-editor">
			<div className="kpf-forms-editor__toolbar">
				<nav className="kpf-forms-editor__tabs" aria-label={__('Form editor', 'kpf-core')}>
					<button
						type="button"
						className={`kpf-forms-editor__tab${
							editorTab === 'builder' ? ' is-active' : ''
						}`}
						onClick={() => setEditorTab('builder')}
					>
						{__('Builder', 'kpf-core')}
					</button>
					<button
						type="button"
						className={`kpf-forms-editor__tab${
							editorTab === 'settings' ? ' is-active' : ''
						}`}
						onClick={() => setEditorTab('settings')}
					>
						{__('Settings', 'kpf-core')}
					</button>
					{draft.title ? (
						<span className="kpf-forms-editor__title">{draft.title}</span>
					) : null}
				</nav>
				<div className="kpf-forms-editor__actions">
					<Button variant="secondary" onClick={onCancel} disabled={saving}>
						{__('Cancel', 'kpf-core')}
					</Button>
					<Button variant="primary" onClick={onSave} isBusy={saving} disabled={saving}>
						{__('Save form', 'kpf-core')}
					</Button>
				</div>
			</div>

			{editorTab === 'settings' ? (
				<FormSettings
					draft={draft}
					onChange={onChange}
					definition={definition}
					patchDefinition={patchDefinition}
					patchSettings={patchSettings}
				/>
			) : (
			<div className="kpf-forms-editor__layout">
				<aside className="kpf-forms-palette">
					<h2>{__('Add', 'kpf-core')}</h2>
					<p className="kpf-forms-palette__hint">{targetHint}</p>
					<div className="kpf-forms-palette__group">
						<h3>{__('Layout', 'kpf-core')}</h3>
						<button
							type="button"
							className="kpf-forms-palette__item"
							onClick={() => addColumns(1)}
						>
							{__('1 Column', 'kpf-core')}
						</button>
						<button
							type="button"
							className="kpf-forms-palette__item"
							onClick={() => addColumns(2)}
						>
							{__('2 Columns', 'kpf-core')}
						</button>
					</div>
					{Object.entries(groups).map(([group, types]) => (
						<div key={group} className="kpf-forms-palette__group">
							<h3>{group}</h3>
							{types.map((type) => (
								<button
									key={type.id}
									type="button"
									className="kpf-forms-palette__item"
									draggable
									onDragStart={(event) => {
										event.dataTransfer.setData(DND_TYPE, type.id);
										event.dataTransfer.setData('text/plain', `kpf-type:${type.id}`);
										event.dataTransfer.effectAllowed = 'copy';
									}}
									onClick={() => addField(type)}
								>
									{type.label}
								</button>
							))}
						</div>
					))}
				</aside>

				<section className="kpf-forms-canvas">
					<h2>{__('Canvas', 'kpf-core')}</h2>
					{rows.length === 0 && (
						<p className="description">
							{__(
								'Add a 1 or 2 column layout, then drop or click fields into a column.',
								'kpf-core'
							)}
						</p>
					)}
					{rows.map((row) => {
						const rowDropClass =
							rowDropTarget?.rowId === row.id
								? ` is-drop-${rowDropTarget.position}`
								: '';
						const draggingClass =
							draggingRowId === row.id ? ' is-dragging' : '';
						return (
						<div
							key={row.id}
							className={`kpf-forms-canvas__row is-cols-${row.columns}${rowDropClass}${draggingClass}`}
							onDragOver={(event) => updateRowDropTarget(event, row.id)}
							onDragLeave={(event) => {
								if (!event.currentTarget.contains(event.relatedTarget)) {
									setRowDropTarget((current) =>
										current?.rowId === row.id ? null : current
									);
								}
							}}
							onDrop={(event) => {
								if (!handleDropOnRow(event, row.id)) {
									// Field/type drops are handled on slots.
								}
							}}
						>
							<div className="kpf-forms-canvas__row-tools">
								<button
									type="button"
									className="kpf-forms-canvas__row-drag"
									draggable
									aria-label={__('Drag to reorder columns', 'kpf-core')}
									title={__('Drag to reorder', 'kpf-core')}
									onDragStart={(event) => {
										event.dataTransfer.setData(DND_ROW, row.id);
										event.dataTransfer.setData(
											'text/plain',
											`kpf-row:${row.id}`
										);
										event.dataTransfer.effectAllowed = 'move';
										setDraggingRowId(row.id);
									}}
									onDragEnd={() => {
										setDraggingRowId(null);
										setRowDropTarget(null);
									}}
								>
									<span aria-hidden="true">⋮⋮</span>
								</button>
								<SelectControl
									label={__('Columns', 'kpf-core')}
									value={String(row.columns)}
									options={[
										{ label: __('1 Column', 'kpf-core'), value: '1' },
										{ label: __('2 Columns', 'kpf-core'), value: '2' },
									]}
									onChange={(value) => setRowColumns(row.id, value)}
								/>
								<div className="kpf-forms-canvas__row-move">
									<Button
										size="small"
										onClick={() => moveRow(row.id, -1)}
										variant="tertiary"
									>
										↑
									</Button>
									<Button
										size="small"
										onClick={() => moveRow(row.id, 1)}
										variant="tertiary"
									>
										↓
									</Button>
									<Button
										size="small"
										isDestructive
										variant="tertiary"
										onClick={() => removeRow(row.id)}
									>
										{__('Remove', 'kpf-core')}
									</Button>
								</div>
							</div>
							<div className="kpf-forms-canvas__cols">
								{(row.slots || [[]]).map((slotFields, slotIndex) => {
									const isSlotSelected =
										selectedSlot?.rowId === row.id &&
										selectedSlot?.slotIndex === slotIndex;
									const isDrop =
										dropTarget?.rowId === row.id &&
										dropTarget?.slotIndex === slotIndex;
									return (
										<div
											key={`${row.id}-slot-${slotIndex}`}
											className={`kpf-forms-canvas__slot${
												isSlotSelected ? ' is-selected' : ''
											}${isDrop ? ' is-drop-target' : ''}`}
											onClick={(event) => {
												if (event.target === event.currentTarget) {
													selectTarget({
														kind: 'slot',
														rowId: row.id,
														slotIndex,
													});
												}
											}}
											onDragOver={(event) => {
												if (updateRowDropTarget(event, row.id)) return;
												event.preventDefault();
												const types = Array.from(
													event.dataTransfer.types || []
												);
												event.dataTransfer.dropEffect = types.includes(
													DND_TYPE
												)
													? 'copy'
													: 'move';
												setDropTarget({ rowId: row.id, slotIndex });
											}}
											onDragLeave={() => {
												setDropTarget((current) =>
													current?.rowId === row.id &&
													current?.slotIndex === slotIndex
														? null
														: current
												);
											}}
											onDrop={(event) =>
												handleDropOnSlot(event, row.id, slotIndex, null)
											}
										>
											<div className="kpf-forms-canvas__slot-label">
												<button
													type="button"
													className="kpf-forms-canvas__slot-select"
													onClick={() =>
														selectTarget({
															kind: 'slot',
															rowId: row.id,
															slotIndex,
														})
													}
												>
													{row.columns === 2
														? sprintf(
																/* translators: %d: column number */
																__('Column %d', 'kpf-core'),
																slotIndex + 1
															)
														: __('Column', 'kpf-core')}
												</button>
											</div>
											{slotFields.length === 0 && (
												<div className="kpf-forms-canvas__slot-empty">
													{__('Drop fields here', 'kpf-core')}
												</div>
											)}
											{slotFields.map((fieldId, fieldIndex) => {
												const field = fields[fieldId];
												if (!field) return null;
												const isSelected = selectedFieldId === fieldId;
												return (
													<button
														key={fieldId}
														type="button"
														draggable
														className={`kpf-forms-canvas__field${
															isSelected ? ' is-selected' : ''
														}`}
														onClick={() =>
															selectTarget({ kind: 'field', fieldId })
														}
														onDragStart={(event) => {
															const payload = JSON.stringify({
																fieldId,
																rowId: row.id,
																slotIndex,
																index: fieldIndex,
															});
															event.dataTransfer.setData(DND_FIELD, payload);
															event.dataTransfer.setData(
																'text/plain',
																`kpf-field:${payload}`
															);
															event.dataTransfer.effectAllowed = 'move';
														}}
														onDragOver={(event) => {
															if (updateRowDropTarget(event, row.id)) {
																return;
															}
															event.preventDefault();
															event.stopPropagation();
															setDropTarget({
																rowId: row.id,
																slotIndex,
															});
														}}
														onDrop={(event) =>
															handleDropOnSlot(
																event,
																row.id,
																slotIndex,
																fieldIndex
															)
														}
													>
														{field.type !== 'checkbox' &&
															field.type !== 'toggle' &&
															field.type !== 'html' &&
															field.type !== 'divider' && (
																<span className="kpf-forms-canvas__label">
																	{field.label}
																	{field.required ? ' *' : ''}
																</span>
															)}
														<FieldPreview field={field} />
													</button>
												);
											})}
										</div>
									);
								})}
							</div>
						</div>
						);
					})}
					<div className="kpf-forms-canvas__submit">
						<button type="button" className="button button-primary" disabled>
							{definition.settings?.submitLabel || __('Send', 'kpf-core')}
						</button>
					</div>
				</section>

				<aside className="kpf-forms-inspector">
					{selected ? (
						<>
							<div className="kpf-forms-inspector__header">
								<h2>{__('Field', 'kpf-core')}</h2>
								<Button
									isDestructive
									variant="tertiary"
									onClick={() => removeField(selected.id)}
								>
									{__('Remove', 'kpf-core')}
								</Button>
							</div>
							<p className="description">{selected.type}</p>
							<TextControl
								label={__('Label', 'kpf-core')}
								value={selected.label}
								onChange={(label) => patchField(selected.id, { label })}
							/>
							<TextControl
								label={__('Name / key', 'kpf-core')}
								value={nameDraft}
								onChange={(name) => {
									const next = sanitizeFieldKey(name);
									setNameDraft(next);
									patchField(selected.id, {
										name: next || selected.id,
									});
								}}
								help={__(
									'Letters, numbers, hyphens, and underscores only.',
									'kpf-core'
								)}
							/>
							<TextControl
								label={__('Placeholder', 'kpf-core')}
								value={selected.placeholder}
								onChange={(placeholder) => patchField(selected.id, { placeholder })}
							/>
							<TextControl
								label={__('Help text', 'kpf-core')}
								value={selected.help}
								onChange={(help) => patchField(selected.id, { help })}
							/>
							<TextControl
								label={__('Analytics tag', 'kpf-core')}
								value={selected.analyticsTag}
								onChange={(analyticsTag) => patchField(selected.id, { analyticsTag })}
								help={__('Used for GA / dataLayer field targeting.', 'kpf-core')}
							/>
							<ToggleControl
								label={__('Required', 'kpf-core')}
								checked={!!selected.required}
								onChange={(required) => patchField(selected.id, { required })}
							/>
							{isChoiceField(selected.type) && (
								<TextareaControl
									label={__('Options (label|value per line)', 'kpf-core')}
									value={optionsDraft}
									onChange={updateOptionsText}
									rows={5}
									help={__(
										'One option per line. Optional value after a pipe, e.g. Label|value.',
										'kpf-core'
									)}
								/>
							)}
							{isSelectorField(selected.type) && (() => {
								const optionList = parseOptionsText(optionsDraft);
								const selectedDefaults = parseDefaultMulti(
									selected.defaultValue,
									optionList
								);
								return (
									<div className="kpf-forms-default-options">
										<p className="kpf-forms-default-options__heading">
											{__('Selected by default on load', 'kpf-core')}
										</p>
										<p className="description" style={{ marginTop: 0 }}>
											{isMultiSelectorField(selected.type)
												? __(
														'Check the options from the list above that should start selected.',
														'kpf-core'
													)
												: __(
														'Pick one option from the list above, or None for an empty start.',
														'kpf-core'
													)}
										</p>
										{optionList.length === 0 ? (
											<p className="description">
												{__(
													'Add options above to choose a default.',
													'kpf-core'
												)}
											</p>
										) : isMultiSelectorField(selected.type) ? (
											optionList.map((opt) => {
												const checked = selectedDefaults.includes(opt.value);
												return (
													<label
														key={opt.value}
														className="kpf-forms-default-options__item"
													>
														<input
															type="checkbox"
															checked={checked}
															onChange={() => {
																const next = checked
																	? selectedDefaults.filter(
																			(value) => value !== opt.value
																		)
																	: [...selectedDefaults, opt.value];
																patchField(selected.id, {
																	defaultValue: next.join(','),
																});
															}}
														/>
														<span>{opt.label}</span>
													</label>
												);
											})
										) : (
											<>
												<label className="kpf-forms-default-options__item">
													<input
														type="radio"
														name={`kpf-default-${selected.id}`}
														checked={!selected.defaultValue}
														onChange={() =>
															patchField(selected.id, {
																defaultValue: '',
															})
														}
													/>
													<span>{__('None', 'kpf-core')}</span>
												</label>
												{optionList.map((opt) => (
													<label
														key={opt.value}
														className="kpf-forms-default-options__item"
													>
														<input
															type="radio"
															name={`kpf-default-${selected.id}`}
															checked={
																selected.defaultValue === opt.value
															}
															onChange={() =>
																patchField(selected.id, {
																	defaultValue: opt.value,
																})
															}
														/>
														<span>{opt.label}</span>
													</label>
												))}
											</>
										)}
									</div>
								);
							})()}
							{selected.type === 'html' && (
								<TextareaControl
									label={__('HTML', 'kpf-core')}
									value={selected.html}
									onChange={(html) => patchField(selected.id, { html })}
									rows={4}
								/>
							)}
							{selected.type === 'social' && (
								<SelectControl
									label={__('Platform', 'kpf-core')}
									value={selected.platform}
									options={PLATFORMS.map((platform) => ({
										label: platform,
										value: platform,
									}))}
									onChange={(platform) => patchField(selected.id, { platform })}
								/>
							)}
							{selected.type === 'file' && (
								<TextControl
									label={__('Accepted files', 'kpf-core')}
									value={selected.accept}
									onChange={(accept) => patchField(selected.id, { accept })}
								/>
							)}

							<h3>{__('Conditional logic', 'kpf-core')}</h3>
							{(selected.conditions || []).map((condition, cIndex) => (
								<div key={condition.id} className="kpf-forms-condition">
									<SelectControl
										label={__('Action', 'kpf-core')}
										value={condition.action}
										options={[
											{ label: 'Show', value: 'show' },
											{ label: 'Hide', value: 'hide' },
											{ label: 'Require', value: 'require' },
										]}
										onChange={(action) => {
											const conditions = [...(selected.conditions || [])];
											conditions[cIndex] = { ...condition, action };
											patchField(selected.id, { conditions });
										}}
									/>
									{(condition.rules || []).map((rule, rIndex) => (
										<div key={rIndex} className="kpf-forms-condition__rule">
											<SelectControl
												label={__('Source', 'kpf-core')}
												value={rule.source}
												options={CONDITION_SOURCES.map((source) => ({
													label: source.label,
													value: source.id,
												}))}
												onChange={(source) => {
													const conditions = [
														...(selected.conditions || []),
													];
													const rules = [...(condition.rules || [])];
													rules[rIndex] = { ...rule, source };
													conditions[cIndex] = { ...condition, rules };
													patchField(selected.id, { conditions });
												}}
											/>
											<SelectControl
												label={__('Operator', 'kpf-core')}
												value={rule.operator}
												options={OPERATORS.map((operator) => ({
													label: operator,
													value: operator,
												}))}
												onChange={(operator) => {
													const conditions = [
														...(selected.conditions || []),
													];
													const rules = [...(condition.rules || [])];
													rules[rIndex] = { ...rule, operator };
													conditions[cIndex] = { ...condition, rules };
													patchField(selected.id, { conditions });
												}}
											/>
											{rule.source === 'field' && (
												<SelectControl
													label={__('Field', 'kpf-core')}
													value={rule.fieldId}
													options={[
														{ label: '—', value: '' },
														...Object.values(fields)
															.filter((item) => item.id !== selected.id)
															.map((item) => ({
																label: item.label,
																value: item.id,
															})),
													]}
													onChange={(fieldId) => {
														const conditions = [
															...(selected.conditions || []),
														];
														const rules = [...(condition.rules || [])];
														rules[rIndex] = { ...rule, fieldId };
														conditions[cIndex] = { ...condition, rules };
														patchField(selected.id, { conditions });
													}}
												/>
											)}
											{['utm', 'query', 'history', 'path', 'referrer'].includes(
												rule.source
											) && (
												<TextControl
													label={__('Key / path', 'kpf-core')}
													value={rule.key}
													onChange={(key) => {
														const conditions = [
															...(selected.conditions || []),
														];
														const rules = [...(condition.rules || [])];
														rules[rIndex] = { ...rule, key };
														conditions[cIndex] = { ...condition, rules };
														patchField(selected.id, { conditions });
													}}
												/>
											)}
											{!['empty', 'not_empty', 'checked', 'unchecked'].includes(
												rule.operator
											) && (
												<TextControl
													label={__('Value', 'kpf-core')}
													value={rule.value}
													onChange={(value) => {
														const conditions = [
															...(selected.conditions || []),
														];
														const rules = [...(condition.rules || [])];
														rules[rIndex] = { ...rule, value };
														conditions[cIndex] = { ...condition, rules };
														patchField(selected.id, { conditions });
													}}
												/>
											)}
										</div>
									))}
								</div>
							))}
							<Button variant="secondary" onClick={addCondition}>
								{__('Add condition', 'kpf-core')}
							</Button>
						</>
					) : (
						<>
							<h2>
								{selectedSlot
									? __('Column selected', 'kpf-core')
									: __('Inspector', 'kpf-core')}
							</h2>
							{selectedSlot ? (
								<p className="description" style={{ marginTop: 0 }}>
									{__(
										'Click a field type in the palette (or drag one) to add it to this column.',
										'kpf-core'
									)}
								</p>
							) : (
								<>
									<p className="description" style={{ marginTop: 0 }}>
										{__(
											'Select a field to edit its options, or open Settings for form name, success, notifications, and receipts.',
											'kpf-core'
										)}
									</p>
									<Button variant="secondary" onClick={() => setEditorTab('settings')}>
										{__('Open settings', 'kpf-core')}
									</Button>
								</>
							)}
						</>
					)}
				</aside>
			</div>
			)}
		</div>
	);
}

export default function App() {
	const [rows, setRows] = useState([]);
	const [draft, setDraft] = useState(null);
	const [selection, setSelection] = useState(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [notice, setNotice] = useState(null);
	const [search, setSearch] = useState('');
	const [copiedEmbedId, setCopiedEmbedId] = useState(null);

	const startNew =
		window.kpfFormsAdmin?.startNew ||
		document.querySelector('.kpf-forms-admin')?.dataset?.startNew === '1';

	async function load() {
		setLoading(true);
		try {
			const data = await apiFetch({ url: `${REST_BASE}/forms` });
			setRows(data.forms || []);
		} catch (error) {
			setNotice({
				status: 'error',
				message: error?.message || __('Could not load forms.', 'kpf-core'),
			});
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		load().then(() => {
			if (startNew) {
				setDraft(emptyDraft());
				setSelection(null);
			}
		});
	}, []);

	const filtered = useMemo(() => {
		const q = search.trim().toLowerCase();
		if (!q) return rows;
		return rows.filter(
			(row) =>
				row.title.toLowerCase().includes(q) ||
				row.slug.toLowerCase().includes(q) ||
				(row.embed || '').toLowerCase().includes(q)
		);
	}, [rows, search]);

	async function saveDraft() {
		if (!draft?.title || !draft?.slug) {
			setNotice({
				status: 'error',
				message: __('Title and slug are required.', 'kpf-core'),
			});
			return;
		}
		setSaving(true);
		setNotice(null);
		try {
			const payload = {
				title: draft.title,
				slug: draft.slug,
				status: draft.status || 'publish',
				definition: {
					...draft.definition,
					rows: normalizeRows(draft.definition?.rows || []),
				},
			};
			const saved = draft.id
				? await apiFetch({
						url: `${REST_BASE}/forms/${draft.id}`,
						method: 'POST',
						data: payload,
					})
				: await apiFetch({
						url: `${REST_BASE}/forms`,
						method: 'POST',
						data: payload,
					});
			setDraft(null);
			setSelection(null);
			await load();
			setNotice({
				status: 'success',
				message: sprintf(
					__('Saved “%s”. Embed with %s.', 'kpf-core'),
					saved.title,
					saved.embed
				),
			});
		} catch (error) {
			setNotice({
				status: 'error',
				message: error?.message || __('Could not save the form.', 'kpf-core'),
			});
		} finally {
			setSaving(false);
		}
	}

	async function deleteForm(id) {
		if (!window.confirm(__('Move this form to trash?', 'kpf-core'))) return;
		try {
			await apiFetch({ url: `${REST_BASE}/forms/${id}`, method: 'DELETE' });
			await load();
		} catch (error) {
			setNotice({
				status: 'error',
				message: error?.message || __('Could not delete the form.', 'kpf-core'),
			});
		}
	}

	async function copyEmbed(id, embed) {
		const value = String(embed || '');
		if (!value) return;

		try {
			if (navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(value);
			} else {
				const input = document.createElement('textarea');
				input.value = value;
				input.setAttribute('readonly', '');
				input.style.position = 'absolute';
				input.style.left = '-9999px';
				document.body.appendChild(input);
				input.select();
				document.execCommand('copy');
				document.body.removeChild(input);
			}
			setCopiedEmbedId(id);
			window.setTimeout(() => {
				setCopiedEmbedId((current) => (current === id ? null : current));
			}, 1600);
		} catch (error) {
			setNotice({
				status: 'error',
				message: __('Could not copy embed code.', 'kpf-core'),
			});
		}
	}

	if (draft) {
		return (
			<>
				{notice && (
					<Notice status={notice.status} isDismissible onRemove={() => setNotice(null)}>
						{notice.message}
					</Notice>
				)}
				<FormEditor
					draft={draft}
					onChange={setDraft}
					onSave={saveDraft}
					onCancel={() => {
						setDraft(null);
						setSelection(null);
					}}
					saving={saving}
					selection={selection}
					onSelect={setSelection}
				/>
			</>
		);
	}

	return (
		<div className="kpf-forms-list">
			{notice && (
				<Notice status={notice.status} isDismissible onRemove={() => setNotice(null)}>
					{notice.message}
				</Notice>
			)}
			<div className="kpf-forms-list__toolbar">
				<TextControl
					label={__('Search forms', 'kpf-core')}
					value={search}
					onChange={setSearch}
				/>
				<Button variant="primary" onClick={() => setDraft(emptyDraft())}>
					{__('Add form', 'kpf-core')}
				</Button>
			</div>
			{loading ? (
				<Spinner />
			) : (
				<table className="widefat striped">
					<thead>
						<tr>
							<th>{__('Title', 'kpf-core')}</th>
							<th>{__('Slug', 'kpf-core')}</th>
							<th>{__('Fields', 'kpf-core')}</th>
							<th>{__('Embed', 'kpf-core')}</th>
							<th>{__('Status', 'kpf-core')}</th>
							<th>{__('Actions', 'kpf-core')}</th>
						</tr>
					</thead>
					<tbody>
						{filtered.length === 0 && (
							<tr>
								<td colSpan={6}>{__('No forms yet.', 'kpf-core')}</td>
							</tr>
						)}
						{filtered.map((row) => (
							<tr key={row.id}>
								<td>
									<strong>{row.title}</strong>
								</td>
								<td>
									<code>{row.slug}</code>
								</td>
								<td>{row.fieldCount}</td>
								<td>
									<div className="kpf-forms-list__embed">
										<code>{row.embed}</code>
										<Button
											size="small"
											variant="secondary"
											onClick={() => copyEmbed(row.id, row.embed)}
											aria-label={
												copiedEmbedId === row.id
													? __('Embed code copied', 'kpf-core')
													: __('Copy embed code', 'kpf-core')
											}
										>
											{copiedEmbedId === row.id
												? __('Copied', 'kpf-core')
												: __('Copy', 'kpf-core')}
										</Button>
									</div>
								</td>
								<td>
									{row.definition?.status || row.status}
								</td>
								<td>
									<Button
										variant="secondary"
										onClick={() => {
											setDraft({
												id: row.id,
												title: row.title,
												slug: row.slug,
												status: row.status,
												definition: {
													...row.definition,
													rows: normalizeRows(row.definition?.rows || []),
												},
											});
											setSelection(null);
										}}
									>
										{__('Edit', 'kpf-core')}
									</Button>{' '}
									<Button
										isDestructive
										variant="tertiary"
										onClick={() => deleteForm(row.id)}
									>
										{__('Delete', 'kpf-core')}
									</Button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
