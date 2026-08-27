const wordpressUrl = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(
  /\/$/,
  ""
);

const DEFAULT_TIMEOUT_MS = 1500;

function requestSignal(init = {}) {
  if (init.signal) return init.signal;
  const timeoutMs = Number.isFinite(init.timeoutMs)
    ? init.timeoutMs
    : DEFAULT_TIMEOUT_MS;
  if (timeoutMs <= 0) return undefined;
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

export async function fetchSeoPublic(path, init = {}) {
  if (!wordpressUrl) {
    throw new Error("NEXT_PUBLIC_WORDPRESS_URL is not configured");
  }

  const { timeoutMs, signal, ...rest } = init;
  const response = await fetch(`${wordpressUrl}/wp-json/kpf-seo/v1${path}`, {
    ...rest,
    headers: {
      Accept: "application/json",
      ...(init.headers || {}),
    },
    signal: requestSignal({ timeoutMs, signal }),
    next: undefined,
  });

  if (!response.ok) {
    throw new Error(`SEO public request failed: ${response.status}`);
  }

  return response.json();
}

export function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
