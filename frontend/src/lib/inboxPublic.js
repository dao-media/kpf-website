import { createHash, createHmac } from "node:crypto";

const wordpressUrl = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(
  /\/$/,
  ""
);

export async function submitInboxForm(body, { clientIp = "", signal } = {}) {
  if (!wordpressUrl) {
    throw new Error("NEXT_PUBLIC_WORDPRESS_URL is not configured");
  }
  if (!process.env.FAUST_SECRET_KEY) {
    throw new Error("FAUST_SECRET_KEY is not configured");
  }

  const payload = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyHash = createHash("sha256").update(payload).digest("hex");
  const signature = createHmac("sha256", process.env.FAUST_SECRET_KEY)
    .update(`${timestamp}.${clientIp}.${bodyHash}`)
    .digest("hex");

  const response = await fetch(
    `${wordpressUrl}/wp-json/kpf-inbox/v1/public/forms/submit`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-KPF-Client-IP": clientIp,
        "X-KPF-Form-Signature": signature,
        "X-KPF-Form-Timestamp": timestamp,
      },
      body: payload,
      signal,
    }
  );

  const data = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}
