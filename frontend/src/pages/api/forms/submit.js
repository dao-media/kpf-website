import { isIP } from "node:net";
import { submitInboxForm } from "@/lib/inboxPublic";

function requestOrigin(req) {
  const protocol = String(req.headers["x-forwarded-proto"] || "http")
    .split(",")[0]
    .trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim();
  return host ? `${protocol}://${host}` : "";
}

function isSameOrigin(req) {
  const origin = req.headers.origin;
  return !origin || origin === requestOrigin(req);
}

function clientIp(req) {
  // Vercel overwrites x-real-ip with the address calculated by its edge.
  // Do not trust the client-controlled left side of x-forwarded-for.
  const edgeIp = String(req.headers["x-real-ip"] || "").trim();
  if (isIP(edgeIp)) return edgeIp;

  const remote = req.socket?.remoteAddress || "";
  return isIP(remote) ? remote : "";
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      code: "method_not_allowed",
      message: "Use POST to submit a form.",
    });
  }

  if (!isSameOrigin(req)) {
    return res.status(403).json({
      code: "invalid_origin",
      message: "This form must be submitted from this website.",
    });
  }

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    return res.status(400).json({
      code: "invalid_body",
      message: "Send the form as a JSON object.",
    });
  }

  try {
    const result = await submitInboxForm(req.body, {
      clientIp: clientIp(req),
    });
    const message =
      result.data?.message ||
      (result.ok
        ? "Thank you. Your message has been received."
        : "Your message could not be sent.");

    return res.status(result.status).json({
      success: result.ok && result.data?.success !== false,
      code: result.data?.code,
      field: result.data?.data?.field,
      message,
    });
  } catch (error) {
    return res.status(502).json({
      success: false,
      code: "form_service_unavailable",
      message: "The form service is temporarily unavailable. Please try again.",
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "64kb",
    },
  },
};
