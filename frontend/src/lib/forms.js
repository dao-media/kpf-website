export async function submitForm(data, { signal } = {}) {
  const response = await fetch("/api/forms/submit", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
    signal,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "Your message could not be sent.");
    error.code = payload.code;
    error.field = payload.field;
    error.status = response.status;
    throw error;
  }

  return payload;
}
