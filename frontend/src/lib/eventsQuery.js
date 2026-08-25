/**
 * Events page — WPGraphQL foundationEvents + eventDetails.
 */

const KPF_EVENTS_QUERY = `
  foundationEvents(first: 50) {
    nodes {
      databaseId
      title
      slug
      eventDetails {
        featured
        logline
        description
        scheduleLabel
        timeLabel
        calendarUrl
        ticketingLink
        website
        location {
          display
          mapsUrl
        }
        hosts {
          termId
          name
          logoId
          logoUrl
        }
      }
    }
  }
`;

/**
 * @param {string} text
 * @returns {string[]}
 */
function splitParagraphs(text) {
  return String(text || "")
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * @param {unknown} raw
 * @returns {Array<{ termId: number, name: string, logoId: number, logoUrl: string }>}
 */
function normalizeHosts(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((host) => {
      if (!host || typeof host !== "object") return null;
      const name = String(host.name || "").trim();
      const logoUrl = String(host.logoUrl || "").trim();
      if (!name && !logoUrl) return null;
      return {
        termId: Number(host.termId) || 0,
        name,
        logoId: Number(host.logoId) || 0,
        logoUrl,
      };
    })
    .filter(Boolean);
}

/**
 * @param {unknown} nodes
 * @returns {Array<Record<string, unknown>>}
 */
function normalizeEventNodes(nodes) {
  if (!Array.isArray(nodes)) return [];

  return nodes
    .map((node) => {
      const details = node?.eventDetails && typeof node.eventDetails === "object"
        ? node.eventDetails
        : {};
      const title = String(node?.title || "").trim();
      if (!title) return null;

      const description = String(details.description || "").trim();
      const logline = String(details.logline || "").trim();
      const scheduleLabel = String(details.scheduleLabel || "").trim();
      const timeLabel = String(details.timeLabel || "").trim();
      const calendarUrl = String(details.calendarUrl || "").trim();
      const locationLabel = String(details.location?.display || "").trim();
      const locationHref = String(details.location?.mapsUrl || "").trim();
      const ticketingLink = String(details.ticketingLink || "").trim();
      const website = String(details.website || "").trim();
      const ticketsHref = ticketingLink || website;
      const hosts = normalizeHosts(details.hosts);

      return {
        id: String(node?.databaseId || node?.slug || title),
        databaseId: Number(node?.databaseId) || 0,
        title,
        slug: String(node?.slug || "").trim(),
        featured: Boolean(details.featured),
        logline,
        description,
        bodyParagraphs: splitParagraphs(description),
        scheduleLabel,
        timeLabel,
        calendarUrl,
        locationLabel,
        locationHref,
        ticketingLink,
        website,
        ticketsHref,
        ticketsExternal: /^https?:\/\//i.test(ticketsHref),
        dateLabel: scheduleLabel,
        body: logline || description,
        ticketsLabel: ticketsHref ? "Get tickets" : "Tickets",
        hosts,
      };
    })
    .filter(Boolean);
}

/**
 * Prefer the featured event; otherwise the first published node.
 * @param {unknown} nodes
 * @returns {Record<string, unknown> | null}
 */
function pickFeaturedEvent(nodes) {
  const list = normalizeEventNodes(nodes);
  if (!list.length) return null;
  return list.find((event) => event.featured) || list[0] || null;
}

/**
 * Build Featured section fields from an event post (title, description, details).
 * Falls back to scaffold copy when a field is empty.
 *
 * @param {Record<string, unknown> | null | undefined} event
 * @param {{ title?: string, body?: string[], meta?: Array<Record<string, unknown>>, actions?: Array<Record<string, unknown>> }} fallback
 */
function featuredSectionFromEvent(event, fallback = {}) {
  const base = fallback && typeof fallback === "object" ? fallback : {};
  if (!event) {
    return {
      title: String(base.title || ""),
      body: Array.isArray(base.body) ? base.body : [],
      meta: Array.isArray(base.meta) ? base.meta : [],
      actions: Array.isArray(base.actions) ? base.actions : [],
    };
  }

  const body =
    Array.isArray(event.bodyParagraphs) && event.bodyParagraphs.length > 0
      ? event.bodyParagraphs
      : event.logline
        ? [String(event.logline)]
        : Array.isArray(base.body)
          ? base.body
          : [];

  const meta = [];
  if (event.scheduleLabel) {
    meta.push({
      icon: "calendar",
      label: String(event.scheduleLabel),
      href: event.calendarUrl ? String(event.calendarUrl) : "",
      external: true,
    });
  }
  if (event.timeLabel) {
    meta.push({
      icon: "clock",
      label: String(event.timeLabel),
      href: event.calendarUrl ? String(event.calendarUrl) : "",
      external: true,
    });
  }
  if (event.locationLabel) {
    meta.push({
      icon: "map",
      label: String(event.locationLabel),
      href: event.locationHref ? String(event.locationHref) : "",
      external: true,
    });
  }
  // Tickets live in the CTA row below — no red chip here.
  if (!meta.length && Array.isArray(base.meta)) {
    meta.push(
      ...base.meta.filter(
        (chip) =>
          chip &&
          chip.icon !== "ticket" &&
          chip.variant !== "link",
      ),
    );
  }

  const actions = Array.isArray(base.actions)
    ? base.actions.map((action) => {
        if (
          action &&
          typeof action === "object" &&
          String(action.label || "")
            .toLowerCase()
            .includes("ticket") &&
          event.ticketsHref
        ) {
          return {
            ...action,
            href: String(event.ticketsHref),
            external: Boolean(event.ticketsExternal),
            trailingIcon: "ticket",
          };
        }
        return action;
      })
    : [];

  return {
    title: String(event.title || base.title || ""),
    body,
    meta,
    actions,
  };
}

module.exports = {
  KPF_EVENTS_QUERY,
  normalizeEventNodes,
  pickFeaturedEvent,
  featuredSectionFromEvent,
};
