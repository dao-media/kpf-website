const wordpressUrl = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(
  /\/$/,
  ""
);

export async function fetchSeoPublic(path, init = {}) {
  if (!wordpressUrl) {
    throw new Error("NEXT_PUBLIC_WORDPRESS_URL is not configured");
  }

  const response = await fetch(`${wordpressUrl}/wp-json/kpf-seo/v1${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.headers || {}),
    },
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
