const HISTORY_KEY = "kpf_form_path_history";
const UTM_KEY = "kpf_form_utm";
const MAX_HISTORY = 20;

const UTM_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
];

function canUseStorage() {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

function readJson(key, fallback) {
  if (!canUseStorage()) return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  if (!canUseStorage()) return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota / private mode failures.
  }
}

function captureUtmFromLocation(search = "") {
  const params = new URLSearchParams(
    search || (typeof window !== "undefined" ? window.location.search : ""),
  );
  const utm = {};
  for (const key of UTM_PARAMS) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  if (Object.keys(utm).length === 0) {
    return readJson(UTM_KEY, {});
  }
  writeJson(UTM_KEY, utm);
  return utm;
}

function recordPath(pathname) {
  const path =
    pathname ||
    (typeof window !== "undefined" ? window.location.pathname : "");
  if (!path) return readJson(HISTORY_KEY, []);

  const history = readJson(HISTORY_KEY, []).filter((item) => item !== path);
  history.unshift(path);
  const next = history.slice(0, MAX_HISTORY);
  writeJson(HISTORY_KEY, next);
  return next;
}

function getPathHistory() {
  return readJson(HISTORY_KEY, []);
}

function getStoredUtm() {
  return readJson(UTM_KEY, {});
}

function getQueryParams(search = "") {
  const params = new URLSearchParams(
    search || (typeof window !== "undefined" ? window.location.search : ""),
  );
  const out = {};
  for (const [key, value] of params.entries()) {
    out[key] = value;
  }
  return out;
}

function getReferrerParts() {
  if (typeof document === "undefined" || !document.referrer) {
    return { host: "", path: "", href: "" };
  }
  try {
    const url = new URL(document.referrer);
    return {
      host: url.host,
      path: url.pathname,
      href: document.referrer,
    };
  } catch {
    return { host: "", path: "", href: document.referrer };
  }
}

/**
 * Snapshot used for condition evaluation and submission context.
 */
function buildFormContext({
  pathname,
  search,
  loggedIn = false,
  capability = "",
} = {}) {
  const path =
    pathname ||
    (typeof window !== "undefined" ? window.location.pathname : "");
  const utm = captureUtmFromLocation(search);
  const history = recordPath(path);
  const referrer = getReferrerParts();
  const query = getQueryParams(search);

  return {
    path,
    history,
    referrer,
    utm,
    query,
    auth: {
      loggedIn: Boolean(loggedIn),
      capability: capability || "",
    },
    now: new Date().toISOString(),
  };
}

function evaluateRule(rule, { values, context }) {
  if (!rule || typeof rule !== "object") return false;
  const operator = rule.operator || "equals";
  let left = "";

  switch (rule.source) {
    case "field": {
      const fieldId = rule.fieldId || "";
      left = values?.[fieldId] ?? values?.[rule.key] ?? "";
      break;
    }
    case "path":
      left = context?.path || "";
      break;
    case "history": {
      const history = context?.history || [];
      if (operator === "includes" || operator === "contains") {
        return history.some((item) =>
          String(item).includes(String(rule.value || rule.key || "")),
        );
      }
      left = history.join(" ");
      break;
    }
    case "referrer":
      left =
        rule.key === "host"
          ? context?.referrer?.host || ""
          : rule.key === "path"
            ? context?.referrer?.path || ""
            : context?.referrer?.href || "";
      break;
    case "utm":
      left = context?.utm?.[rule.key || "utm_source"] || "";
      break;
    case "query":
      left = context?.query?.[rule.key || ""] || "";
      break;
    case "auth":
      if (operator === "checked" || rule.value === "logged_in") {
        return Boolean(context?.auth?.loggedIn);
      }
      if (rule.value === "logged_out") {
        return !context?.auth?.loggedIn;
      }
      left = context?.auth?.capability || "";
      break;
    case "schedule":
      left = context?.now || new Date().toISOString();
      break;
    default:
      left = "";
  }

  const right = rule.value ?? "";
  const leftStr = Array.isArray(left) ? left.join(",") : String(left ?? "");
  const rightStr = String(right ?? "");

  switch (operator) {
    case "equals":
      return leftStr === rightStr;
    case "not_equals":
      return leftStr !== rightStr;
    case "contains":
    case "includes":
      return leftStr.toLowerCase().includes(rightStr.toLowerCase());
    case "not_contains":
      return !leftStr.toLowerCase().includes(rightStr.toLowerCase());
    case "empty":
      return leftStr.trim() === "" || left === false;
    case "not_empty":
      return leftStr.trim() !== "" && left !== false;
    case "checked":
      return Boolean(left) && left !== "0" && left !== "false";
    case "unchecked":
      return !left || left === "0" || left === "false";
    case "matches":
      try {
        return new RegExp(rightStr, "i").test(leftStr);
      } catch {
        return false;
      }
    case "after":
      return leftStr > rightStr;
    case "before":
      return leftStr < rightStr;
    default:
      return false;
  }
}

function evaluateCondition(condition, ctx) {
  if (!condition || !Array.isArray(condition.rules) || condition.rules.length === 0) {
    return true;
  }
  const match = condition.match === "any" ? "any" : "all";
  const results = condition.rules.map((rule) => evaluateRule(rule, ctx));
  return match === "any" ? results.some(Boolean) : results.every(Boolean);
}

/**
 * @returns {{ visible: boolean, required: boolean }}
 */
function resolveFieldVisibility(field, ctx) {
  const conditions = field?.conditions || [];
  let visible = true;
  let required = Boolean(field?.required);

  const showConditions = conditions.filter((condition) => condition.action === "show");
  const hideConditions = conditions.filter((condition) => condition.action === "hide");
  const requireConditions = conditions.filter(
    (condition) => condition.action === "require",
  );

  if (showConditions.length > 0) {
    visible = showConditions.some((condition) => evaluateCondition(condition, ctx));
  }

  for (const condition of hideConditions) {
    if (evaluateCondition(condition, ctx)) {
      visible = false;
    }
  }

  for (const condition of requireConditions) {
    if (evaluateCondition(condition, ctx)) {
      required = true;
    }
  }

  return { visible, required };
}

function formatNationalTel(digits, countryCode = "US") {
  const cleaned = String(digits || "").replace(/\D/g, "").slice(0, 15);
  if (countryCode === "US" || countryCode === "CA") {
    const parts = [
      cleaned.slice(0, 3),
      cleaned.slice(3, 6),
      cleaned.slice(6, 10),
    ].filter(Boolean);
    if (parts.length === 0) return "";
    if (parts.length === 1) return `(${parts[0]}`;
    if (parts.length === 2) return `(${parts[0]}) ${parts[1]}`;
    return `(${parts[0]}) ${parts[1]}-${parts[2]}`;
  }
  return cleaned;
}

function pushDataLayerEvent(eventName, payload = {}) {
  if (!eventName || typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...payload });
}

module.exports = {
  captureUtmFromLocation,
  recordPath,
  getPathHistory,
  getStoredUtm,
  getQueryParams,
  getReferrerParts,
  buildFormContext,
  evaluateRule,
  evaluateCondition,
  resolveFieldVisibility,
  formatNationalTel,
  pushDataLayerEvent,
};
