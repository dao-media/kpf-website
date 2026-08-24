import { useEffect, useMemo, useRef, useState } from "react";
import { submitForm } from "@/lib/forms";
import { useAccessibility } from "@/components/AccessibilityRuntime";

const {
  buildFormContext,
  formatNationalTel,
  pushDataLayerEvent,
  resolveFieldVisibility,
} = require("@/lib/formContext");

const COUNTRIES = [
  { code: "US", dial: "1", label: "United States" },
  { code: "CA", dial: "1", label: "Canada" },
  { code: "GB", dial: "44", label: "United Kingdom" },
  { code: "AU", dial: "61", label: "Australia" },
  { code: "IE", dial: "353", label: "Ireland" },
  { code: "DE", dial: "49", label: "Germany" },
  { code: "FR", dial: "33", label: "France" },
  { code: "MX", dial: "52", label: "Mexico" },
  { code: "IN", dial: "91", label: "India" },
  { code: "BR", dial: "55", label: "Brazil" },
  { code: "NZ", dial: "64", label: "New Zealand" },
  { code: "PH", dial: "63", label: "Philippines" },
];

function parseDefinition(definition) {
  if (!definition) return null;
  if (typeof definition === "string") {
    try {
      return JSON.parse(definition);
    } catch {
      return null;
    }
  }
  return typeof definition === "object" ? definition : null;
}

function initialValues(fields) {
  const values = {};
  for (const field of Object.values(fields || {})) {
    if (!field?.id) continue;
    if (field.type === "checkbox" || field.type === "toggle") {
      values[field.id] = Boolean(field.defaultValue);
    } else if (field.type === "checkbox_group" || field.type === "multiselect") {
      values[field.id] = parseDefaultMulti(field.defaultValue, field.options);
    } else if (field.type === "tel") {
      values[field.id] = {
        country: field.countryDefault || "US",
        national: "",
      };
    } else if (field.type === "social") {
      values[field.id] = {
        platform: field.platform || "x",
        handle: "",
      };
    } else if (field.type === "city_state") {
      values[field.id] = { city: "", state: "", label: "" };
    } else if (field.type === "ranking") {
      values[field.id] = (field.options || []).map((opt) => opt.value);
    } else {
      values[field.id] = field.defaultValue || "";
    }
  }
  return values;
}

function parseDefaultMulti(defaultValue, options) {
  const allowed = new Set((options || []).map((opt) => opt.value));
  if (Array.isArray(defaultValue)) {
    return defaultValue.filter((value) => allowed.has(value));
  }
  return String(defaultValue || "")
    .split(",")
    .map((part) => part.trim())
    .filter((value) => value && allowed.has(value));
}

function serializeValue(field, value) {
  if (value == null) return "";
  if (field.type === "tel" && typeof value === "object") {
    const country = COUNTRIES.find((row) => row.code === value.country) || COUNTRIES[0];
    const national = String(value.national || "").replace(/\D/g, "");
    return national ? `+${country.dial} ${value.national}` : "";
  }
  if (field.type === "social" && typeof value === "object") {
    return value.handle ? `${value.platform}:${value.handle}` : "";
  }
  if (field.type === "city_state" && typeof value === "object") {
    return value.label || [value.city, value.state].filter(Boolean).join(", ");
  }
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "1" : "0";
  return String(value);
}

function fieldClass(type) {
  return `kpf-field kpf-field--${type || "text"}`;
}

async function suggestCities(query) {
  const response = await fetch(
    `/api/forms/cities?q=${encodeURIComponent(query || "")}`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) return [];
  const payload = await response.json().catch(() => ({}));
  return payload.cities || [];
}

function FieldControl({ field, value, onChange, required, error }) {
  const id = `kpf-field-${field.id}`;
  const describedBy = [
    field.help ? `${id}-help` : "",
    error ? `${id}-error` : "",
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const common = {
    id,
    name: field.name || field.id,
    className: "kpf-field__control kpf-input",
    "aria-invalid": error ? "true" : undefined,
    "aria-describedby": describedBy,
    required,
    placeholder: field.placeholder || undefined,
    "aria-required": required ? "true" : undefined,
  };

  switch (field.type) {
    case "long_text":
      return (
        <textarea
          {...common}
          className="kpf-field__control kpf-textarea"
          rows={4}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "select":
      return (
        <select
          {...common}
          className="kpf-field__control kpf-select"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{field.placeholder || "Select…"}</option>
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case "multiselect":
      return (
        <select
          {...common}
          className="kpf-field__control kpf-select"
          multiple
          value={value || []}
          onChange={(event) =>
            onChange(
              Array.from(event.target.selectedOptions).map((opt) => opt.value),
            )
          }
        >
          {(field.options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case "radio":
      return (
        <div className="kpf-field__choices" role="radiogroup" aria-labelledby={`${id}-label`}>
          {(field.options || []).map((opt) => (
            <label key={opt.value} className="kpf-field__choice">
              <input
                type="radio"
                name={field.name || field.id}
                value={opt.value}
                checked={value === opt.value}
                required={required}
                onChange={() => onChange(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      );
    case "checkbox_group":
      return (
        <div className="kpf-field__choices">
          {(field.options || []).map((opt) => {
            const checked = Array.isArray(value) && value.includes(opt.value);
            return (
              <label key={opt.value} className="kpf-field__choice">
                <input
                  type="checkbox"
                  value={opt.value}
                  checked={checked}
                  onChange={() => {
                    const current = Array.isArray(value) ? value : [];
                    onChange(
                      checked
                        ? current.filter((item) => item !== opt.value)
                        : [...current, opt.value],
                    );
                  }}
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      );
    case "checkbox":
    case "toggle":
      return (
        <label className="kpf-field__toggle">
          <input
            type="checkbox"
            id={id}
            name={field.name || field.id}
            checked={Boolean(value)}
            required={required}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span>{field.label}</span>
        </label>
      );
    case "tel": {
      const tel = value && typeof value === "object" ? value : { country: "US", national: "" };
      return (
        <div className="kpf-field__tel">
          <select
            className="kpf-select"
            aria-label="Country dial code"
            value={tel.country || "US"}
            onChange={(event) =>
              onChange({
                ...tel,
                country: event.target.value,
                national: formatNationalTel(tel.national, event.target.value),
              })
            }
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                +{country.dial} {country.code}
              </option>
            ))}
          </select>
          <input
            {...common}
            type="tel"
            inputMode="tel"
            value={tel.national || ""}
            onChange={(event) =>
              onChange({
                ...tel,
                national: formatNationalTel(event.target.value, tel.country),
              })
            }
          />
        </div>
      );
    }
    case "city_state": {
      const city = value && typeof value === "object" ? value : { city: "", state: "", label: "" };
      return (
        <CityStateField
          id={id}
          value={city}
          required={required}
          describedBy={describedBy}
          placeholder={field.placeholder}
          onChange={onChange}
        />
      );
    }
    case "social": {
      const social =
        value && typeof value === "object"
          ? value
          : { platform: field.platform || "x", handle: "" };
      return (
        <div className="kpf-field__social">
          <select
            className="kpf-select"
            value={social.platform}
            onChange={(event) =>
              onChange({ ...social, platform: event.target.value })
            }
          >
            {(
              field.platforms || [
                "x",
                "instagram",
                "facebook",
                "linkedin",
                "youtube",
                "tiktok",
                "github",
                "other",
              ]
            ).map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>
          <input
            {...common}
            type="text"
            value={social.handle || ""}
            onChange={(event) =>
              onChange({ ...social, handle: event.target.value })
            }
          />
        </div>
      );
    }
    case "ranking": {
      const order = Array.isArray(value)
        ? value
        : (field.options || []).map((opt) => opt.value);
      return (
        <ol className="kpf-field__ranking">
          {order.map((optValue, index) => {
            const opt = (field.options || []).find((row) => row.value === optValue);
            return (
              <li key={optValue}>
                <span>{opt?.label || optValue}</span>
                <span className="kpf-field__ranking-actions">
                  <button
                    type="button"
                    className="kpf-btn kpf-btn--ghost kpf-btn--sm"
                    disabled={index === 0}
                    onClick={() => {
                      const next = [...order];
                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                      onChange(next);
                    }}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="kpf-btn kpf-btn--ghost kpf-btn--sm"
                    disabled={index === order.length - 1}
                    onClick={() => {
                      const next = [...order];
                      [next[index + 1], next[index]] = [next[index], next[index + 1]];
                      onChange(next);
                    }}
                  >
                    ↓
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      );
    }
    case "file":
      return (
        <input
          {...common}
          className="kpf-field__control"
          type="file"
          accept={field.accept || undefined}
          onChange={(event) => {
            const file = event.target.files?.[0];
            onChange(file ? file.name : "");
          }}
        />
      );
    case "html":
      return (
        <div
          className="kpf-field__html"
          dangerouslySetInnerHTML={{ __html: field.html || "" }}
        />
      );
    case "divider":
      return <hr className="kpf-field__divider" />;
    case "captcha":
      return (
        <div className="kpf-field__captcha" aria-hidden="true">
          <label className="kpf-field__honeypot">
            Website
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={value || ""}
              onChange={(event) => onChange(event.target.value)}
            />
          </label>
        </div>
      );
    case "hidden":
      return (
        <input type="hidden" name={field.name || field.id} value={value || ""} />
      );
    case "number":
      return (
        <input
          {...common}
          type="number"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "email":
      return (
        <input
          {...common}
          type="email"
          autoComplete="email"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "url":
      return (
        <input
          {...common}
          type="url"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "password":
      return (
        <input
          {...common}
          type="password"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    case "date":
    case "time":
    case "datetime":
      return (
        <input
          {...common}
          type={field.type === "datetime" ? "datetime-local" : field.type}
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
    default:
      return (
        <input
          {...common}
          type="text"
          value={value || ""}
          onChange={(event) => onChange(event.target.value)}
        />
      );
  }
}

function CityStateField({ id, value, onChange, required, describedBy, placeholder }) {
  const [suggestions, setSuggestions] = useState([]);
  const [query, setQuery] = useState(value?.label || "");

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (!query || query.length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        setSuggestions(await suggestCities(query));
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="kpf-field__city-state">
      <input
        id={id}
        className="kpf-field__control kpf-input"
        value={query}
        required={required}
        aria-describedby={describedBy}
        placeholder={placeholder || "City, ST"}
        autoComplete="off"
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          onChange({ city: next, state: "", label: next });
        }}
      />
      {suggestions.length > 0 ? (
        <ul className="kpf-field__suggestions" role="listbox">
          {suggestions.map((row) => (
            <li key={row.label}>
              <button
                type="button"
                onClick={() => {
                  setQuery(row.label);
                  setSuggestions([]);
                  onChange({
                    city: row.city,
                    state: row.state,
                    label: row.label,
                  });
                }}
              >
                {row.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function FormRenderer({
  definition: rawDefinition,
  slug = "",
  formId = 0,
  title = "",
}) {
  const definition = useMemo(() => parseDefinition(rawDefinition), [rawDefinition]);
  const fields = definition?.fields || {};
  const rows = definition?.rows || [];
  const settings = definition?.settings || {};

  const [values, setValues] = useState(() => initialValues(fields));
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [context, setContext] = useState(null);
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaRef = useRef(null);
  const formRef = useRef(null);
  const modalCloseRef = useRef(null);
  const a11y = useAccessibility();

  const captchaMode = settings.captchaMode || settings.captcha?.mode || "honeypot";
  const captchaSiteKey = settings.captcha?.siteKey || "";
  const captchaVersion = settings.captcha?.version || "v2";
  const isChallengeCaptcha =
    (captchaMode === "turnstile" || captchaMode === "recaptcha") &&
    Boolean(captchaSiteKey);

  useEffect(() => {
    setValues(initialValues(fields));
  }, [rawDefinition]);

  useEffect(() => {
    setContext(buildFormContext());
  }, []);

  useEffect(() => {
    setCaptchaToken("");
    if (!isChallengeCaptcha) {
      return undefined;
    }

    let widgetId = null;
    let cancelled = false;

    if (captchaMode === "turnstile") {
      function renderTurnstile() {
        if (cancelled || !captchaRef.current || !window.turnstile) return;
        try {
          widgetId = window.turnstile.render(captchaRef.current, {
            sitekey: captchaSiteKey,
            callback: (token) => setCaptchaToken(token || ""),
            "expired-callback": () => setCaptchaToken(""),
            "error-callback": () => setCaptchaToken(""),
          });
        } catch {
          setCaptchaToken("");
        }
      }

      if (window.turnstile) {
        renderTurnstile();
      } else {
        const existing = document.querySelector("script[data-kpf-turnstile]");
        if (existing) {
          existing.addEventListener("load", renderTurnstile);
        } else {
          const script = document.createElement("script");
          script.src =
            "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
          script.async = true;
          script.dataset.kpfTurnstile = "1";
          script.addEventListener("load", renderTurnstile);
          document.head.appendChild(script);
        }
      }

      return () => {
        cancelled = true;
        if (widgetId != null && window.turnstile?.remove) {
          window.turnstile.remove(widgetId);
        }
      };
    }

    // Google reCAPTCHA v2 checkbox (v3 executes on submit).
    if (captchaMode === "recaptcha" && captchaVersion !== "v3") {
      function renderRecaptcha() {
        if (cancelled || !captchaRef.current || !window.grecaptcha?.render) return;
        try {
          widgetId = window.grecaptcha.render(captchaRef.current, {
            sitekey: captchaSiteKey,
            callback: (token) => setCaptchaToken(token || ""),
            "expired-callback": () => setCaptchaToken(""),
            "error-callback": () => setCaptchaToken(""),
          });
        } catch {
          setCaptchaToken("");
        }
      }

      function onReady() {
        if (window.grecaptcha?.ready) {
          window.grecaptcha.ready(renderRecaptcha);
        } else {
          renderRecaptcha();
        }
      }

      if (window.grecaptcha?.render) {
        onReady();
      } else {
        const existing = document.querySelector("script[data-kpf-recaptcha]");
        if (existing) {
          existing.addEventListener("load", onReady);
        } else {
          const script = document.createElement("script");
          script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
          script.async = true;
          script.defer = true;
          script.dataset.kpfRecaptcha = "1";
          script.addEventListener("load", onReady);
          document.head.appendChild(script);
        }
      }

      return () => {
        cancelled = true;
      };
    }

    // Prefetch reCAPTCHA v3 script.
    if (captchaMode === "recaptcha" && captchaVersion === "v3") {
      if (!document.querySelector("script[data-kpf-recaptcha-v3]")) {
        const script = document.createElement("script");
        script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(captchaSiteKey)}`;
        script.async = true;
        script.dataset.kpfRecaptchaV3 = "1";
        document.head.appendChild(script);
      }
    }

    return undefined;
  }, [captchaMode, captchaSiteKey, captchaVersion, isChallengeCaptcha]);

  const visibility = useMemo(() => {
    const map = {};
    const ctx = { values, context: context || buildFormContext() };
    for (const field of Object.values(fields)) {
      map[field.id] = resolveFieldVisibility(field, ctx);
    }
    return map;
  }, [fields, values, context]);

  if (!definition || definition.status === "inactive") {
    return null;
  }

  function setFieldValue(fieldId, next) {
    setValues((current) => ({ ...current, [fieldId]: next }));
    setErrors((current) => {
      if (!current[fieldId]) return current;
      const copy = { ...current };
      delete copy[fieldId];
      return copy;
    });
  }

  function validate() {
    const nextErrors = {};
    for (const field of Object.values(fields)) {
      const state = visibility[field.id] || { visible: true, required: field.required };
      if (!state.visible || ["html", "divider", "captcha", "hidden"].includes(field.type)) {
        continue;
      }
      const raw = values[field.id];
      const serialized = serializeValue(field, raw);
      if (state.required && !String(serialized).trim()) {
        nextErrors[field.id] = "This field is required.";
      }
      if (field.type === "email" && serialized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(serialized)) {
        nextErrors[field.id] = "Enter a valid email address.";
      }
    }
    setErrors(nextErrors);
    const firstId = Object.keys(nextErrors)[0];
    if (firstId) {
      setStatus("error");
      setMessage("Please fix the highlighted fields.");
      if (a11y.forms.focusFirstError) {
        window.requestAnimationFrame(() => {
          document.getElementById(`kpf-field-${firstId}`)?.focus();
        });
      }
    }
    return !firstId;
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (status === "submitting") return;
    if (!validate()) return;

    const liveContext = buildFormContext();
    setContext(liveContext);
    setStatus("submitting");
    setMessage("");

    const fieldMap = {};
    let name = "";
    let email = "";
    let phone = "";
    let messageBody = "";
    let website = honeypot;

    for (const field of Object.values(fields)) {
      const state = visibility[field.id] || { visible: true };
      if (!state.visible || ["html", "divider"].includes(field.type)) continue;
      if (field.type === "captcha") {
        website = values[field.id] || website;
        continue;
      }
      const serialized = serializeValue(field, values[field.id]);
      const key = field.label || field.name || field.id;
      fieldMap[key] = serialized;
      const nameKey = (field.name || "").toLowerCase();
      if (["name", "full_name", "fullname"].includes(nameKey)) name = serialized;
      if (field.type === "email" || nameKey === "email") email = serialized;
      if (field.type === "tel" || nameKey === "phone" || nameKey === "tel") {
        phone = serialized;
      }
      if (field.type === "long_text" || nameKey === "message") {
        messageBody = serialized;
      }
    }

    try {
      const payload = {
        form_name: settings.inboxFormName || title || slug || "Website form",
        form_slug: slug || undefined,
        form_id: formId || undefined,
        name,
        email,
        phone,
        message: messageBody,
        fields: fieldMap,
        website,
        context: liveContext,
      };

      if (captchaMode === "turnstile") {
        if (!captchaToken) {
          setStatus("error");
          setMessage("Please complete the captcha challenge.");
          return;
        }
        payload.turnstile_token = captchaToken;
      }

      if (captchaMode === "recaptcha") {
        let token = captchaToken;
        if (captchaVersion === "v3") {
          if (!captchaSiteKey || !window.grecaptcha?.execute) {
            setStatus("error");
            setMessage("Captcha is not ready. Please try again.");
            return;
          }
          try {
            await new Promise((resolve) => {
              window.grecaptcha.ready(resolve);
            });
            token = await window.grecaptcha.execute(captchaSiteKey, {
              action: "submit",
            });
          } catch {
            setStatus("error");
            setMessage("Captcha verification failed. Please try again.");
            return;
          }
        }
        if (!token) {
          setStatus("error");
          setMessage("Please complete the captcha challenge.");
          return;
        }
        payload.recaptcha_token = token;
      }

      const result = await submitForm(payload);

      setStatus("success");
      setMessage(result.message || settings.successMessage || "Thank you.");
      const eventName =
        settings.analytics?.eventName &&
        settings.analytics.eventName !== "kpf_form_submit"
          ? settings.analytics.eventName
          : "form_submitted";
      const formParams = {
        form_slug: slug,
        form_tag: settings.analytics?.formTag || "",
        form_id: formId || undefined,
        page_path: typeof window !== "undefined" ? window.location.pathname : "",
      };
      pushDataLayerEvent(eventName, formParams);
      if (String(slug || "") === "contact") {
        pushDataLayerEvent("generate_lead", formParams);
      }

      if (settings.redirectUrl) {
        const delay =
          (settings.successDisplay || "inline") === "inline" ? 400 : 1600;
        window.setTimeout(() => {
          window.location.assign(settings.redirectUrl);
        }, delay);
      }
    } catch (error) {
      setStatus("error");
      setMessage(error?.message || "Your message could not be sent.");
      pushDataLayerEvent("form_error", {
        form_slug: slug,
        form_tag: settings.analytics?.formTag || "",
        form_id: formId || undefined,
        page_path: typeof window !== "undefined" ? window.location.pathname : "",
      });
      if (error?.field) {
        const match = Object.values(fields).find(
          (field) => field.name === error.field || field.id === error.field,
        );
        if (match) {
          setErrors((current) => ({
            ...current,
            [match.id]: error.message,
          }));
        }
      }
    }
  }

  const hasCaptchaField = Object.values(fields).some((field) => field.type === "captcha");
  const successDisplay = settings.successDisplay || "inline";
  const showInlineStatus =
    Boolean(message) &&
    (status === "error" || successDisplay === "inline" || status === "submitting");
  const showToast =
    Boolean(message) && status === "success" && successDisplay === "toast";
  const showModal =
    Boolean(message) && status === "success" && successDisplay === "modal";

  useEffect(() => {
    if (!showModal) return undefined;
    const previouslyFocused = document.activeElement;
    modalCloseRef.current?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        setMessage("");
        previouslyFocused?.focus?.();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [showModal]);

  return (
    <form
      ref={formRef}
      className="kpf-form"
      data-form-slug={slug || undefined}
      onSubmit={onSubmit}
      noValidate
      aria-busy={status === "submitting" ? "true" : undefined}
    >
      <div className="kpf-form__rows">
        {rows.map((row) => {
          const columns = Number(row.columns) === 2 ? 2 : 1;
          const slots =
            Array.isArray(row.slots) && row.slots.length > 0
              ? row.slots
              : columns === 2
                ? [
                    row.fields?.[0] ? [row.fields[0]] : [],
                    row.fields?.[1] ? [row.fields[1]] : [],
                  ]
                : [row.fields || []];

          return (
            <div
              key={row.id}
              className={`kpf-form__row kpf-form__row--cols-${columns}`}
            >
              {slots.map((slotFields, slotIndex) => {
                const colClass =
                  columns === 2
                    ? "kpf-form__col kpf-form__col--half"
                    : "kpf-form__col kpf-form__col--full";

                return (
                  <div key={`${row.id}-col-${slotIndex}`} className={colClass}>
                    {(slotFields || []).map((fieldId) => {
                      const field = fields[fieldId];
                      if (!field) return null;
                      const state = visibility[fieldId] || {
                        visible: true,
                        required: field.required,
                      };
                      if (!state.visible) return null;

                      if (field.type === "html" || field.type === "divider") {
                        return (
                          <div key={fieldId} className={fieldClass(field.type)}>
                            <FieldControl
                              field={field}
                              value={values[fieldId]}
                              onChange={() => {}}
                              required={false}
                              error=""
                            />
                          </div>
                        );
                      }

                      const showLabel = ![
                        "checkbox",
                        "toggle",
                        "hidden",
                        "captcha",
                      ].includes(field.type);

                      return (
                        <div key={fieldId} className={fieldClass(field.type)}>
                          {showLabel ? (
                            <label
                              className="kpf-field__label"
                              htmlFor={`kpf-field-${field.id}`}
                              id={`kpf-field-${field.id}-label`}
                            >
                              {field.label}
                              {state.required ? (
                                <>
                                  {a11y.forms.requiredVisible ? (
                                    <span aria-hidden="true"> *</span>
                                  ) : null}
                                  <span className="kpf-u-sr-only"> required</span>
                                </>
                              ) : null}
                            </label>
                          ) : null}
                          <FieldControl
                            field={field}
                            value={values[fieldId]}
                            onChange={(next) => setFieldValue(fieldId, next)}
                            required={state.required}
                            error={errors[fieldId]}
                          />
                          {field.help ? (
                            <p
                              className="kpf-field__help"
                              id={`kpf-field-${field.id}-help`}
                            >
                              {field.help}
                            </p>
                          ) : null}
                          {errors[fieldId] ? (
                            <p
                              className="kpf-field__error"
                              id={`kpf-field-${field.id}-error`}
                              role="alert"
                            >
                              {errors[fieldId]}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {!hasCaptchaField && captchaMode !== "off" && !isChallengeCaptcha ? (
        <div className="kpf-field__honeypot" aria-hidden="true">
          <label>
            Website
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </label>
        </div>
      ) : null}

      {captchaMode === "turnstile" && captchaSiteKey ? (
        <div className="kpf-field kpf-field--captcha">
          <div ref={captchaRef} className="kpf-field__turnstile" />
        </div>
      ) : null}

      {captchaMode === "recaptcha" && captchaSiteKey && captchaVersion !== "v3" ? (
        <div className="kpf-field kpf-field--captcha">
          <div ref={captchaRef} className="kpf-field__recaptcha" />
        </div>
      ) : null}

      {(captchaMode === "turnstile" || captchaMode === "recaptcha") &&
      !captchaSiteKey ? (
        <p className="kpf-form__status kpf-form__status--error" role="status">
          Captcha is not configured. Add provider keys in Forms → Settings.
        </p>
      ) : null}

      {showInlineStatus ? (
        <p
          className={`kpf-form__status kpf-form__status--${status}`}
          role={status === "error" ? "alert" : "status"}
          aria-live={status === "error" ? "assertive" : "polite"}
        >
          {message}
        </p>
      ) : null}

      {showToast ? (
        <div
          className={`kpf-form__toast kpf-form__toast--${status}`}
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      ) : null}

      {showModal ? (
        <div
          className="kpf-form__modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="kpf-form-modal-title"
        >
          <div className="kpf-form__modal-card">
            <p
              id="kpf-form-modal-title"
              className={`kpf-form__status kpf-form__status--${status}`}
            >
              {message}
            </p>
            <button
              ref={modalCloseRef}
              type="button"
              className="kpf-btn kpf-btn--primary"
              onClick={() => {
                setMessage("");
                if (settings.redirectUrl) {
                  window.location.assign(settings.redirectUrl);
                }
              }}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <div className="kpf-form__actions">
        {settings.showReset || settings.resetLabel ? (
          <button
            type="button"
            className="kpf-btn kpf-btn--outline"
            disabled={status === "submitting"}
            onClick={() => {
              setValues(initialValues(fields));
              setErrors({});
              setStatus("idle");
              setMessage("");
              setHoneypot("");
              setCaptchaToken("");
            }}
          >
            {settings.showResetIcon !== false ? (
              <span className="kpf-btn__icon kpf-btn__icon--leading" aria-hidden="true">
                <img
                  src="/media/contact/icons/rotate-ccw.svg"
                  alt=""
                  width={20}
                  height={20}
                />
              </span>
            ) : null}
            {settings.resetLabel || "Start over"}
          </button>
        ) : null}
        <button
          type="submit"
          className="kpf-btn kpf-btn--primary"
          disabled={status === "submitting" || status === "success"}
          aria-disabled={status === "submitting" || status === "success" ? "true" : undefined}
        >
          {status === "submitting"
            ? "Sending…"
            : settings.submitLabel || "Send"}
          {status !== "submitting" && settings.showSubmitIcon ? (
            <span className="kpf-btn__icon kpf-btn__icon--trailing" aria-hidden="true">
              <img
                src="/media/contact/icons/send.svg"
                alt=""
                width={20}
                height={20}
              />
            </span>
          ) : null}
        </button>
      </div>
    </form>
  );
}
