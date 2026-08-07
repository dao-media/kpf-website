/**
 * Format dates/times using the WordPress site timezone from GraphQL (kpfSiteChrome.dateTime / kpfDateTime).
 */

function readConfig(override) {
  return { ...(override || {}) };
}

function wallTimeInTimeZoneToDate(year, month, day, hour, minute, second, timeZone) {
  if (!timeZone) {
    return new Date(year, month - 1, day, hour, minute, second);
  }

  const targetAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let utc = targetAsUtc;

  for (let pass = 0; pass < 3; pass += 1) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      })
        .formatToParts(new Date(utc))
        .filter((part) => part.type !== "literal")
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
  if (input == null || input === "") return null;
  if (input instanceof Date) {
    return Number.isNaN(input.getTime()) ? null : input;
  }
  if (typeof input === "number") {
    const ms = input < 1e12 ? input * 1000 : input;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const raw = String(input).trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    return wallTimeInTimeZoneToDate(year, month, day, 12, 0, 0, timeZone);
  }

  const localMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (localMatch && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    const [, y, m, d, hh, mm, ss = "0"] = localMatch;
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

export function formatSiteDateTime(input, options = {}) {
  const config = readConfig(options.config);
  const timeZone = config.timezone || undefined;
  const locale = config.locale || undefined;
  const date = toDate(input, timeZone);
  if (!date) return "";

  const dateStyle = options.dateStyle || "medium";
  const timeStyle = options.dateOnly ? undefined : options.timeStyle || "short";

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
  return formatSiteDateTime(input, { ...options, dateOnly: true, timeStyle: undefined });
}
