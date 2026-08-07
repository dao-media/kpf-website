/**
 * Format dates/times using the WordPress site timezone.
 *
 * Config is injected as window.kpfSiteDateTime (admin-shell) and/or
 * per-app localization. Changing the site timezone updates display on reload
 * because absolute values are formatted with the current setting.
 */

function readConfig(override) {
	const fromWindow =
		(typeof window !== 'undefined' &&
			(window.kpfSiteDateTime ||
				window.kpfAdminShell?.dateTime ||
				window.kpfBackupsAdmin?.dateTime ||
				window.kpfDashboardAdmin?.dateTime)) ||
		{};
	return { ...fromWindow, ...(override || {}) };
}

/**
 * Convert a wall-clock time in `timeZone` to a Date (UTC instant).
 */
function wallTimeInTimeZoneToDate(year, month, day, hour, minute, second, timeZone) {
	if (!timeZone) {
		return new Date(year, month - 1, day, hour, minute, second);
	}

	const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
	let utc = targetAsUtc;

	for (let pass = 0; pass < 3; pass += 1) {
		const parts = Object.fromEntries(
			new Intl.DateTimeFormat('en-US', {
				timeZone,
				year: 'numeric',
				month: '2-digit',
				day: '2-digit',
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
				hourCycle: 'h23',
			})
				.formatToParts(new Date(utc))
				.filter((part) => part.type !== 'literal')
				.map((part) => [part.type, part.value])
		);

		const asUtc = Date.UTC(
			Number(parts.year),
			Number(parts.month) - 1,
			Number(parts.day),
			Number(parts.hour),
			Number(parts.minute),
			Number(parts.second)
		);
		utc += targetAsUtc - asUtc;
	}

	return new Date(utc);
}

function toDate(input, timeZone) {
	if (input == null || input === '') {
		return null;
	}

	if (input instanceof Date) {
		return Number.isNaN(input.getTime()) ? null : input;
	}

	if (typeof input === 'number') {
		const ms = input < 1e12 ? input * 1000 : input;
		const date = new Date(ms);
		return Number.isNaN(date.getTime()) ? null : date;
	}

	const raw = String(input).trim();
	if (!raw) {
		return null;
	}

	if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
		const [year, month, day] = raw.split('-').map(Number);
		return wallTimeInTimeZoneToDate(year, month, day, 12, 0, 0, timeZone);
	}

	const localMatch = raw.match(
		/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/
	);
	if (localMatch && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
		const [, y, m, d, hh, mm, ss = '0'] = localMatch;
		return wallTimeInTimeZoneToDate(
			Number(y),
			Number(m),
			Number(d),
			Number(hh),
			Number(mm),
			Number(ss),
			timeZone
		);
	}

	const parsed = new Date(raw);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * @param {number|string|Date|null|undefined} input
 * @param {{ dateStyle?: string, timeStyle?: string, dateOnly?: boolean, config?: object }} [options]
 */
export function formatSiteDateTime(input, options = {}) {
	const config = readConfig(options.config);
	const timeZone = config.timezone || undefined;
	const locale = config.locale || undefined;
	const date = toDate(input, timeZone);
	if (!date) {
		return '';
	}

	const dateStyle = options.dateStyle || 'medium';
	const timeStyle = options.dateOnly ? undefined : options.timeStyle || 'short';

	try {
		return new Intl.DateTimeFormat(locale, {
			dateStyle,
			...(timeStyle ? { timeStyle } : {}),
			...(timeZone ? { timeZone } : {}),
		}).format(date);
	} catch (error) {
		try {
			return date.toLocaleString(locale, {
				dateStyle,
				...(timeStyle ? { timeStyle } : {}),
				...(timeZone ? { timeZone } : {}),
			});
		} catch (fallbackError) {
			return date.toISOString();
		}
	}
}

export function formatSiteDate(input, options = {}) {
	return formatSiteDateTime(input, { ...options, dateOnly: true });
}

export function siteTimezoneLabel(configOverride) {
	const config = readConfig(configOverride);
	const timezone = config.timezone || '';
	const abbr = config.timezoneAbbr || '';
	if (timezone && abbr && abbr !== timezone) {
		return `${timezone} (${abbr})`;
	}
	return timezone || abbr || '';
}

export function siteHour(configOverride) {
	const config = readConfig(configOverride);
	const hour = Number(config.hour);
	if (Number.isFinite(hour)) {
		return hour;
	}
	try {
		const timeZone = config.timezone || undefined;
		const parts = new Intl.DateTimeFormat(config.locale || undefined, {
			hour: 'numeric',
			hour12: false,
			hourCycle: 'h23',
			...(timeZone ? { timeZone } : {}),
		}).formatToParts(new Date());
		const value = parts.find((part) => part.type === 'hour')?.value;
		return Number(value) || 0;
	} catch (error) {
		return new Date().getHours();
	}
}
