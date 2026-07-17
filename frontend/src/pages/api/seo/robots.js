import { fetchSeoPublic } from "@/lib/wordpressPublic";

export default async function handler(req, res) {
  try {
    const data = await fetchSeoPublic("/public/robots");
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    res.status(200).send(data.body || "User-agent: *\nAllow: /\n");
  } catch (error) {
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.status(200).send("User-agent: *\nAllow: /\n");
  }
}
