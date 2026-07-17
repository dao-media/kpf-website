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

export function composeEventDate(parts, precision) {
	if (precision === 'unknown') {
		return '';
	}

	let year = parts.year || '';
	if (!year) {
		return '';
	}

	if (precision === 'decade') {
		const numeric = parseInt(year, 10);
		if (!numeric) {
			return '';
		}
		return String(Math.floor(numeric / 10) * 10);
	}

	if (precision === 'year') {
		return year;
	}

	const month = parts.month || '';
	if (!month) {
		return '';
	}

	if (precision === 'month') {
		return `${year}-${month}`;
	}

	const day = parts.day || '';
	if (!day) {
		return '';
	}

	const maxDay = daysInMonth(year, month);
	const safeDay = Math.min(parseInt(day, 10), maxDay);
	return `${year}-${month}-${pad2(safeDay)}`;
}

function yearOptions() {
	const end = currentYear();
	const options = [
		{ label: __('Choose year…', 'kpf-core'), value: '' },
	];
	for (let year = end; year >= START_YEAR; year -= 1) {
		options.push({ label: String(year), value: String(year) });
	}
	return options;
}

function decadeOptions() {
	const endDecade = Math.floor(currentYear() / 10) * 10;
	const options = [
		{ label: __('Choose decade…', 'kpf-core'), value: '' },
	];
	for (let decade = endDecade; decade >= START_YEAR; decade -= 10) {
		options.push({
			label: `${decade}s`,
			value: String(decade),
		});
	}
	return options;
}

function monthOptions() {
	return [
		{ label: __('Choose month…', 'kpf-core'), value: '' },
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
	const options = [{ label: __('Choose day…', 'kpf-core'), value: '' }];
	for (let day = 1; day <= max; day += 1) {
		options.push({ label: String(day), value: pad2(day) });
	}
	return options;
}

/**
 * Friendly date pickers for scrapbook historical dates.
 * Still stores event_date as YYYY / YYYY-MM / YYYY-MM-DD for the API.
 */
export default function HistoricalDateFields({
	precision,
	eventDate,
	onChange,
}) {
	if (precision === 'unknown') {
		return null;
	}

	const parts = parseDateParts(eventDate);

	function commit(nextParts) {
		onChange(composeEventDate(nextParts, precision));
	}

	if (precision === 'decade') {
		const decadeValue = parts.year
			? String(Math.floor(parseInt(parts.year, 10) / 10) * 10)
			: '';
		return (
			<SelectControl
				label={__('Decade', 'kpf-core')}
				help={__('Choose the decade this photo or story is from.', 'kpf-core')}
				value={decadeValue}
				options={decadeOptions()}
				onChange={(year) => commit({ ...parts, year, month: '', day: '' })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
		);
	}

	if (precision === 'year') {
		return (
			<SelectControl
				label={__('Year', 'kpf-core')}
				value={parts.year}
				options={yearOptions()}
				onChange={(year) => commit({ ...parts, year, month: '', day: '' })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
		);
	}

	const showDay = precision === 'exact';
	let dayValue = parts.day;
	if (showDay && parts.year && parts.month && dayValue) {
		const max = daysInMonth(parts.year, parts.month);
		if (parseInt(dayValue, 10) > max) {
			dayValue = pad2(max);
		}
	}

	return (
		<>
			<SelectControl
				label={__('Month', 'kpf-core')}
				value={parts.month}
				options={monthOptions()}
				onChange={(month) => {
					const next = { ...parts, month };
					if (showDay && next.day && next.year && month) {
						const max = daysInMonth(next.year, month);
						if (parseInt(next.day, 10) > max) {
							next.day = pad2(max);
						}
					}
					commit(next);
				}}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			{showDay ? (
				<SelectControl
					label={__('Day', 'kpf-core')}
					value={dayValue}
					options={dayOptions(parts.year, parts.month)}
					onChange={(day) => commit({ ...parts, day })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			) : null}
			<SelectControl
				label={__('Year', 'kpf-core')}
				value={parts.year}
				options={yearOptions()}
				onChange={(year) => {
					const next = { ...parts, year };
					if (showDay && next.day && next.month && year) {
						const max = daysInMonth(year, next.month);
						if (parseInt(next.day, 10) > max) {
							next.day = pad2(max);
						}
					}
					commit(next);
				}}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
		</>
	);
}
