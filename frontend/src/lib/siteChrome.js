const KPF_SITE_CHROME_QUERY = `
  kpfSiteChrome {
    dateTime {
      timezone
      timezoneAbbr
      dateFormat
      timeFormat
      locale
      hour
    }
    header {
      databaseId
      title
      role
      html
      behavior {
        version
        mode
        retractDelayMs
        scrollThresholdPx
        transitionMs
        revealAtTop
        overlayHero
        transparentAtTop
        zIndex
        fullWidth
      }
    }
    footer {
      databaseId
      title
      role
      html
      behavior {
        version
        mode
        retractDelayMs
        scrollThresholdPx
        transitionMs
        revealAtTop
        overlayHero
        transparentAtTop
        zIndex
        fullWidth
      }
    }
  }
`;

function clampInt(value, min, max, fallback) {
  const next = Number(value);
  if (!Number.isFinite(next)) return fallback;
  return Math.max(min, Math.min(max, Math.round(next)));
}

function normalizeHeaderBehavior(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const mode = ["inline", "sticky", "sticky-hide-reveal"].includes(src.mode)
    ? src.mode
    : "sticky";

  // Scaffold / default chrome: floating pill over content (Figma 414:532 Nav).
  const floatDefaults = !raw || typeof raw !== "object" || Object.keys(src).length === 0;

  return {
    version: 1,
    mode,
    retractDelayMs: clampInt(src.retractDelayMs, 0, 2000, 180),
    scrollThresholdPx: clampInt(src.scrollThresholdPx, 0, 200, 12),
    transitionMs: clampInt(src.transitionMs, 0, 2000, 280),
    revealAtTop: src.revealAtTop !== false,
    overlayHero: floatDefaults ? true : Boolean(src.overlayHero),
    transparentAtTop: floatDefaults ? true : Boolean(src.transparentAtTop),
    zIndex: clampInt(src.zIndex, 1, 9999, 100),
  };
}

function normalizeFooterBehavior(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const mode = ["inline", "sticky-bottom"].includes(src.mode)
    ? src.mode
    : "inline";

  return {
    version: 1,
    mode,
    fullWidth: src.fullWidth !== false,
  };
}

/**
 * Decide whether the smart-sticky header should be visible.
 */
function shouldRevealSmartHeader({
  direction,
  scrollY,
  thresholdPx,
  revealAtTop,
  hasFocusWithin,
  reducedMotion,
}) {
  if (hasFocusWithin) return true;
  if (reducedMotion) return true;
  if (revealAtTop && scrollY <= thresholdPx) return true;
  if (direction === "up") return true;
  if (direction === "down") return false;
  return true;
}

function headerClassNames(behavior, { visible = true, atTop = true } = {}) {
  const classes = ["kpf-site-chrome__header"];
  classes.push(`kpf-site-chrome__header--${behavior.mode}`);
  if (behavior.overlayHero) classes.push("kpf-site-chrome__header--overlay");
  if (behavior.transparentAtTop && atTop) {
    classes.push("kpf-site-chrome__header--transparent-top");
  }
  if (behavior.mode === "sticky-hide-reveal" && !visible) {
    classes.push("kpf-site-chrome__header--retracted");
  }
  return classes.join(" ");
}

function footerClassNames(behavior) {
  const classes = ["kpf-site-chrome__footer"];
  classes.push(`kpf-site-chrome__footer--${behavior.mode}`);
  if (behavior.fullWidth) classes.push("kpf-site-chrome__footer--full-width");
  else classes.push("kpf-site-chrome__footer--contained");
  return classes.join(" ");
}

function headerStyleVars(behavior) {
  return {
    "--kpf-chrome-transition": `${behavior.transitionMs}ms`,
    "--kpf-chrome-z": String(behavior.zIndex),
  };
}

module.exports = {
  KPF_SITE_CHROME_QUERY,
  clampInt,
  footerClassNames,
  headerClassNames,
  headerStyleVars,
  normalizeFooterBehavior,
  normalizeHeaderBehavior,
  shouldRevealSmartHeader,
};
