/**
 * Row / column slot helpers for the forms builder.
 *
 * A row is a layout unit with 1 or 2 columns. Each column is a slot that can
 * hold many field IDs stacked vertically.
 *
 * Shape:
 *   { id, columns: 1|2, slots: string[][], fields: string[] }
 * `fields` is the flattened slot list (kept for older readers).
 */

export function makeRow(columns = 1, slots = null) {
	const cols = Number(columns) === 2 ? 2 : 1;
	const nextSlots =
		Array.isArray(slots) && slots.length === cols
			? slots.map((slot) => (Array.isArray(slot) ? [...slot] : []))
			: Array.from({ length: cols }, () => []);
	return {
		id: null, // caller sets id
		columns: cols,
		slots: nextSlots,
		fields: flattenSlots(nextSlots),
	};
}

export function flattenSlots(slots) {
	const out = [];
	for (const slot of slots || []) {
		for (const id of slot || []) {
			if (id && !out.includes(id)) out.push(id);
		}
	}
	return out;
}

/**
 * Normalize a row from storage (legacy `fields` only, or `slots`).
 */
export function normalizeRow(row) {
	if (!row || typeof row !== 'object') {
		return makeRow(1);
	}
	const columns = Number(row.columns) === 2 ? 2 : 1;
	let slots;

	if (Array.isArray(row.slots) && row.slots.length > 0) {
		slots = Array.from({ length: columns }, (_, index) => {
			const slot = row.slots[index];
			return Array.isArray(slot) ? slot.filter(Boolean) : [];
		});
	} else {
		const legacy = Array.isArray(row.fields) ? row.fields.filter(Boolean) : [];
		if (columns === 2) {
			slots = [[], []];
			if (legacy[0]) slots[0].push(legacy[0]);
			if (legacy[1]) slots[1].push(legacy[1]);
			// Extra legacy ids (should be rare) go into the first column.
			for (let i = 2; i < legacy.length; i++) {
				slots[0].push(legacy[i]);
			}
		} else {
			slots = [legacy];
		}
	}

	return {
		id: row.id,
		columns,
		slots,
		fields: flattenSlots(slots),
	};
}

export function normalizeRows(rows) {
	return (Array.isArray(rows) ? rows : []).map((row) => normalizeRow(row));
}

export function withRowFields(row) {
	const normalized = normalizeRow(row);
	return {
		...normalized,
		fields: flattenSlots(normalized.slots),
	};
}

/**
 * Resize columns without dropping fields.
 * 2→1 merges slots; 1→2 keeps all fields in the left column.
 */
export function resizeRowColumns(row, columns) {
	const current = normalizeRow(row);
	const cols = Number(columns) === 2 ? 2 : 1;
	if (cols === current.columns) {
		return withRowFields(current);
	}
	if (cols === 1) {
		return withRowFields({
			...current,
			columns: 1,
			slots: [flattenSlots(current.slots)],
		});
	}
	return withRowFields({
		...current,
		columns: 2,
		slots: [flattenSlots(current.slots), []],
	});
}

export function removeFieldFromRows(rows, fieldId) {
	return normalizeRows(rows).map((row) =>
		withRowFields({
			...row,
			slots: row.slots.map((slot) => slot.filter((id) => id !== fieldId)),
		})
	);
}

export function findFieldLocation(rows, fieldId) {
	const normalized = normalizeRows(rows);
	for (let rowIndex = 0; rowIndex < normalized.length; rowIndex++) {
		const row = normalized[rowIndex];
		for (let slotIndex = 0; slotIndex < row.slots.length; slotIndex++) {
			const index = row.slots[slotIndex].indexOf(fieldId);
			if (index >= 0) {
				return { rowIndex, rowId: row.id, slotIndex, index };
			}
		}
	}
	return null;
}

/**
 * Insert a field id into a slot. Removes it from any previous location first.
 * @param {number|null} atIndex - null appends
 */
export function placeFieldInSlot(rows, fieldId, rowId, slotIndex, atIndex = null) {
	const previous = findFieldLocation(rows, fieldId);
	let next = normalizeRows(rows).map((row) =>
		withRowFields({
			...row,
			slots: row.slots.map((slot) => slot.filter((id) => id !== fieldId)),
		})
	);

	const rowIndex = next.findIndex((row) => row.id === rowId);
	if (rowIndex < 0) return next;

	const row = next[rowIndex];
	const safeSlot = Math.max(0, Math.min(slotIndex, row.columns - 1));
	const slot = [...row.slots[safeSlot]];
	let insertAt =
		atIndex === null || atIndex === undefined
			? slot.length
			: Math.max(0, Math.min(atIndex, slot.length));

	// Removing an earlier item in the same slot shifts the insert index down.
	if (
		previous &&
		previous.rowId === rowId &&
		previous.slotIndex === safeSlot &&
		previous.index < insertAt
	) {
		insertAt -= 1;
	}

	slot.splice(insertAt, 0, fieldId);

	const slots = row.slots.map((existing, index) =>
		index === safeSlot ? slot : [...existing]
	);
	next[rowIndex] = withRowFields({ ...row, slots });
	return next;
}

/**
 * Move a row before or after another row.
 * @param {'before'|'after'} position
 */
export function reorderRow(rows, fromRowId, toRowId, position = 'before') {
	const normalized = normalizeRows(rows);
	if (!fromRowId || !toRowId || fromRowId === toRowId) {
		return normalized;
	}

	const fromIndex = normalized.findIndex((row) => row.id === fromRowId);
	if (fromIndex < 0) return normalized;

	const moving = normalized[fromIndex];
	const without = normalized.filter((row) => row.id !== fromRowId);
	const targetIndex = without.findIndex((row) => row.id === toRowId);
	if (targetIndex < 0) return normalized;

	const insertAt = position === 'after' ? targetIndex + 1 : targetIndex;
	without.splice(insertAt, 0, moving);
	return without;
}
