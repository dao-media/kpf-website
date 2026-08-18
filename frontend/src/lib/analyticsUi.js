/**
 * GA4 / GTM hooks for interactive UI classes defined in the foundation + pages stylesheets.
 *
 * Prefer explicit `data-kpf-track` on important CTAs. Everything listed below is also
 * auto-tracked via AnalyticsRuntime (click / accordion toggle).
 *
 * Event naming: object_action (see analytics skill). Properties stay snake_case.
 */

/** @typedef {{ event: string, component: string, selector: string, priority?: number }} AnalyticsUiRule */

/** Interactive stylesheet roots — order matters (first match wins). */
export const ANALYTICS_UI_RULES = /** @type {AnalyticsUiRule[]} */ ([
  {
    event: "cta_clicked",
    component: "btn",
    selector: ".kpf-btn, .kpf-button__link, button.kpf-button__link, a.kpf-button--primary, a.kpf-button--secondary, a.kpf-button--text",
    priority: 10,
  },
  {
    event: "nav_link_clicked",
    component: "header_nav",
    selector: ".kpf-header__nav .kpf-nav-link, .kpf-mobile-nav__item",
    priority: 20,
  },
  {
    event: "mobile_nav_toggled",
    component: "mobile_nav",
    selector: ".kpf-mobile-nav__toggle",
    priority: 20,
  },
  {
    event: "accordion_toggled",
    component: "accordion",
    selector: ".kpf-accordion__header",
    priority: 30,
  },
  {
    event: "grantee_card_clicked",
    component: "grantee_card",
    selector: ".kpf-grantee-card, .kpf-grantee-card a, .kpf-grantee-card [data-kpf-href]",
    priority: 40,
  },
  {
    event: "partner_chip_clicked",
    component: "partners_chip",
    selector: "a.kpf-partners__chip, .kpf-partners__chip[href]",
    priority: 40,
  },
  {
    event: "carousel_control_clicked",
    component: "carousel_dots",
    selector:
      ".kpf-partners__dots button, .kpf-history__dot, .kpf-history__dots button",
    priority: 50,
  },
  {
    event: "archive_card_clicked",
    component: "archive_card",
    selector: "a.kpf-archive__card, .kpf-archive__card[href], a.kpf-blog-row, .kpf-blog-row[href]",
    priority: 40,
  },
  {
    event: "footer_link_clicked",
    component: "footer",
    selector: ".kpf-footer a",
    priority: 60,
  },
  {
    event: "link_clicked",
    component: "link",
    selector: "a.kpf-link",
    priority: 70,
  },
  {
    event: "card_clicked",
    component: "card",
    selector: "a.kpf-card, .kpf-card[href]",
    priority: 80,
  },
]);

export const ANALYTICS_UI_SELECTOR = [
  "[data-kpf-track]",
  ...ANALYTICS_UI_RULES.map((rule) => rule.selector),
].join(", ");

/**
 * Push a GA4-friendly event to dataLayer (GTM) and gtag when present.
 * @param {string} eventName
 * @param {Record<string, unknown>} [payload]
 */
export function pushAnalyticsEvent(eventName, payload = {}) {
  if (!eventName || typeof window === "undefined") return;

  const detail = {
    event: eventName,
    ...payload,
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(detail);

  if (typeof window.gtag === "function") {
    const { event: _ignored, ...params } = detail;
    window.gtag("event", eventName, params);
  }
}

/**
 * @param {Element | null} el
 * @returns {AnalyticsUiRule | null}
 */
export function matchAnalyticsUiRule(el) {
  if (!el || !(el instanceof Element)) return null;

  const ranked = [...ANALYTICS_UI_RULES].sort(
    (a, b) => (a.priority ?? 100) - (b.priority ?? 100),
  );

  for (const rule of ranked) {
    if (el.matches(rule.selector)) return rule;
  }
  return null;
}

/**
 * Resolve the tracked element + rule for a click target.
 * @param {EventTarget | null} target
 */
export function resolveAnalyticsTarget(target) {
  if (!(target instanceof Element)) return null;

  const explicit = target.closest("[data-kpf-track]");
  if (explicit) {
    const rule = matchAnalyticsUiRule(explicit);
    return {
      el: explicit,
      event: explicit.getAttribute("data-kpf-track") || rule?.event || "ui_clicked",
      component:
        explicit.getAttribute("data-kpf-track-component") ||
        rule?.component ||
        "custom",
      rule,
    };
  }

  const hit = target.closest(ANALYTICS_UI_SELECTOR);
  if (!hit) return null;

  const rule = matchAnalyticsUiRule(hit);
  if (!rule) return null;

  return {
    el: hit,
    event: rule.event,
    component: rule.component,
    rule,
  };
}

/**
 * Build standard event params from an interactive element.
 * @param {Element} el
 * @param {{ event: string, component: string }} meta
 */
export function buildAnalyticsParams(el, meta) {
  const text = (el.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  const href =
    el.getAttribute("data-kpf-href") ||
    (el instanceof HTMLAnchorElement && el.getAttribute("href")) ||
    el.getAttribute("href") ||
    "";

  const section =
    el.closest("[data-kpf-section], section[id], [id]")?.id ||
    el.closest("section")?.getAttribute("aria-label") ||
    "";

  const variant = [...el.classList]
    .filter((c) => /^kpf-btn--/.test(c) || /^kpf-button--/.test(c))
    .map((c) => c.replace(/^kpf-(btn|button)--/, ""))
    .join("|");

  const expanded = el.getAttribute("aria-expanded");
  const current = el.getAttribute("aria-current");

  return {
    event_category: "ui",
    component: meta.component,
    track_id: el.getAttribute("data-kpf-track") || "",
    element_text: text,
    link_url: href,
    button_variant: variant,
    section_id: typeof section === "string" ? section.slice(0, 80) : "",
    page_path: typeof window !== "undefined" ? window.location.pathname : "",
    aria_expanded: expanded == null ? "" : expanded,
    aria_current: current || "",
  };
}

/**
 * Bind delegated UI analytics listeners. Returns cleanup.
 * @param {ParentNode} [root]
 */
export function observeAnalyticsUi(root = typeof document !== "undefined" ? document : null) {
  if (!root || typeof window === "undefined") return () => {};

  function onActivate(event) {
    if (!(event instanceof Event)) return;
    // Ignore non-primary clicks / modified clicks for navigation noise control
    if (event instanceof MouseEvent && (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)) {
      return;
    }

    const resolved = resolveAnalyticsTarget(event.target);
    if (!resolved?.el) return;

    const params = buildAnalyticsParams(resolved.el, resolved);

    if (resolved.event === "accordion_toggled") {
      // Read after toggle tick when possible; click fires before some handlers flip state.
      window.setTimeout(() => {
        const next = resolved.el.getAttribute("aria-expanded") || params.aria_expanded;
        pushAnalyticsEvent(resolved.event, {
          ...params,
          aria_expanded: next,
          accordion_state: next === "true" ? "open" : next === "false" ? "closed" : "unknown",
        });
      }, 0);
      return;
    }

    pushAnalyticsEvent(resolved.event, params);
  }

  root.addEventListener("click", onActivate, true);
  return () => {
    root.removeEventListener("click", onActivate, true);
  };
}
