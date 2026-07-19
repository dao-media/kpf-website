const KPF_SITE_CHROME_QUERY = `
  kpfSiteChrome {
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

function normalizeHeaderBehavior(raw = {}) {
  const mode = ["inline", "sticky", "sticky-hide-reveal"].includes(raw.mode)
    ? raw.mode
    : "sticky";

  return {
    version: 1,
    mode,
    retractDelayMs: clampInt(raw.retractDelayMs, 0, 2000, 180),
    scrollThresholdPx: clampInt(raw.scrollThresholdPx, 0, 200, 12),
    transitionMs: clampInt(raw.transitionMs, 0, 2000, 280),
    revealAtTop: raw.revealAtTop !== false,
    overlayHero: Boolean(raw.overlayHero),
    transparentAtTop: Boolean(raw.transparentAtTop),
    zIndex: clampInt(raw.zIndex, 1, 9999, 50),
  };
}

function normalizeFooterBehavior(raw = {}) {
  const mode = ["inline", "sticky-bottom"].includes(raw.mode)
    ? raw.mode
    : "inline";

  return {
    version: 1,
    mode,
    fullWidth: raw.fullWidth !== false,
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
