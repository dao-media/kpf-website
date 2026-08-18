import { useEffect } from "react";
import { observeAnalyticsUi } from "@/lib/analyticsUi";

/**
 * Delegated GA4 / GTM tracking for interactive stylesheet UI
 * (`.kpf-btn`, nav, accordion, grantee cards, footer links, …).
 *
 * Mark high-value CTAs with `data-kpf-track="event_name"` to override the default event.
 */
export default function AnalyticsRuntime() {
  useEffect(() => observeAnalyticsUi(document), []);
  return null;
}
