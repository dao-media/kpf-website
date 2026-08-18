import { SelectControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

const START_YEAR = 1900;

function currentYear() {
	return new Date().getFullYear();
}

function pad2(value) {
	return String(value).padStart(2, '0');
}

function daysInMonth(year, month) {
	const y = parseInt(year, 10);
	const m = parseInt(month, 10);
	if (!y || !m) {
		return 31;
	}
	return new Date(y, m, 0).getDate();
}

export function parseDateParts(eventDate = '') {
	const [year = '', month = '', day = ''] = String(eventDate).split('-');
	return {
		year: year || '',
		month: month || '',
		day: day || '',
	};
}

/**
 * Infer precision from filled parts:
 * year only → year (YYYY)
 * year + month → month (YYYY-MM)
 * year + month + day → exact (YYYY-MM-DD)
 * none → unknown
 */
export function precisionFromParts(parts) {
	if (!parts.year) {
		return 'unknown';
	}
	if (!parts.month) {
		return 'year';
	}
	if (!parts.day) {
		return 'month';
	}
	return 'exact';
}

export function composeEventDate(parts, precision = precisionFromParts(parts)) {
	if (precision === 'unknown' || !parts.year) {
		return '';
	}

	if (precision === 'decade') {
		const numeric = parseInt(parts.year, 10);
		if (!numeric) {
			return '';
		}
		return String(Math.floor(numeric / 10) * 10);
	}

	if (precision === 'year' || !parts.month) {
		return parts.year;
	}

	if (precision === 'month' || !parts.day) {
		return `${parts.year}-${parts.month}`;
	}

	const maxDay = daysInMonth(parts.year, parts.month);
	const safeDay = Math.min(parseInt(parts.day, 10), maxDay);
	return `${parts.year}-${parts.month}-${pad2(safeDay)}`;
}

function yearOptions() {
	const end = currentYear();
	const options = [{ label: __('Year…', 'kpf-core'), value: '' }];
	for (let year = end; year >= START_YEAR; year -= 1) {
		options.push({ label: String(year), value: String(year) });
	}
	return options;
}

function monthOptions() {
	return [
		{ label: __('Month…', 'kpf-core'), value: '' },
		{ label: __('January', 'kpf-core'), value: '01' },
		{ label: __('February', 'kpf-core'), value: '02' },
		{ label: __('March', 'kpf-core'), value: '03' },
		{ label: __('April', 'kpf-core'), value: '04' },
		{ label: __('May', 'kpf-core'), value: '05' },
		{ label: __('June', 'kpf-core'), value: '06' },
		{ label: __('July', 'kpf-core'), value: '07' },
		{ label: __('August', 'kpf-core'), value: '08' },
		{ label: __('September', 'kpf-core'), value: '09' },
		{ label: __('October', 'kpf-core'), value: '10' },
		{ label: __('November', 'kpf-core'), value: '11' },
		{ label: __('December', 'kpf-core'), value: '12' },
	];
}

function dayOptions(year, month) {
	const max = daysInMonth(year, month);
	const options = [{ label: __('Day…', 'kpf-core'), value: '' }];
	for (let day = 1; day <= max; day += 1) {
		options.push({ label: String(day), value: pad2(day) });
	}
	return options;
}

/**
 * Flexible When picker: YYYY · Month YYYY · Month D, YYYY.
 * Stores event_date as YYYY / YYYY-MM / YYYY-MM-DD and sets date_precision.
 */
export default function HistoricalDateFields({ eventDate, onChange }) {
	const parts = parseDateParts(eventDate);
	let dayValue = parts.day;
	if (parts.year && parts.month && dayValue) {
		const max = daysInMonth(parts.year, parts.month);
		if (parseInt(dayValue, 10) > max) {
			dayValue = pad2(max);
		}
	}

	function commit(nextParts) {
		const precision = precisionFromParts(nextParts);
		onChange(composeEventDate(nextParts, precision), precision);
	}

	return (
		<>
			<SelectControl
				label={__('When', 'kpf-core')}
				help={__(
					'As much as you know: year only, month and year, or full date.',
					'kpf-core'
				)}
				value={parts.year}
				options={yearOptions()}
				onChange={(year) => {
					if (!year) {
						commit({ year: '', month: '', day: '' });
						return;
					}
					commit({ ...parts, year });
				}}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			<SelectControl
				label={__('Month (optional)', 'kpf-core')}
				value={parts.month}
				options={monthOptions()}
				disabled={!parts.year}
				onChange={(month) => {
					if (!month) {
						commit({ ...parts, month: '', day: '' });
						return;
					}
					commit({ ...parts, month });
				}}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			<SelectControl
				label={__('Day (optional)', 'kpf-core')}
				value={dayValue}
				options={dayOptions(parts.year, parts.month)}
				disabled={!parts.year || !parts.month}
				onChange={(day) => commit({ ...parts, day })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
		</>
	);
}
