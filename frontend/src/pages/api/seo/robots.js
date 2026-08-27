import { fetchSeoPublic } from "@/lib/wordpressPublic";

const {
  applyRobotsHeaders,
  fallbackRobotsTxt,
  sanitizeRobotsTxt,
} = require("@/lib/robotsTxt");
const { publicSiteOrigin, rewriteEphemeralHostsInText } = require("@/lib/publicSiteUrl");

export const config = {
  maxDuration: 8,
};

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).end();
    return;
  }

  applyRobotsHeaders(res);

  if (req.method === "HEAD") {
    res.status(200).end();
    return;
  }

  const origin = publicSiteOrigin();
  let body = fallbackRobotsTxt(origin);

  try {
    const data = await fetchSeoPublic("/public/robots", { timeoutMs: 800 });
    body = sanitizeRobotsTxt(
      rewriteEphemeralHostsInText(data.body || "") || "",
      origin
    );
  } catch {
    body = fallbackRobotsTxt(origin);
  }

  res.status(200).send(body);
}
