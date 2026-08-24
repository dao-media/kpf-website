// Faust SSG talks to live WP during `next build`. Unknown fields fail the
// whole page query, so this fragment stays on the schema currently published
// at kpf.dreamhosters.com. Newer keys (skipLabel, display, …) are filled in
// by normalizeAccessibility() until kpf-core is updated on DreamHost.
const KPF_ACCESSIBILITY_QUERY = `
  kpfAccessibility {
    preset
    navigation {
      skipLink
      skipTarget
      focusRing
      focusRingColor
      focusRingWidth
    }
    content {
      language
      underlineLinks
      routeAnnouncer
    }
    media {
      blockAutoplayReducedMotion
    }
    motion {
      honorPrefersReducedMotion
      forceReduceMotion
    }
    forms {
      enhancedFocus
      statusLiveRegion
    }
    advanced {
      customCss
      debugOutlines
    }
  }
`;

function asAnchor(value, fallback) {
  return typeof value === "string" && /^#[A-Za-z][\w:-]*$/.test(value)
    ? value
    : fallback;
}

function asTargetSize(value) {
  return ["off", "aa", "comfortable"].includes(value) ? value : "off";
}

function normalizeAccessibility(raw) {
  const navigation = raw?.navigation || {};
  const content = raw?.content || {};
  const display = raw?.display || {};
  const media = raw?.media || {};
  const motion = raw?.motion || {};
  const forms = raw?.forms || {};
  const advanced = raw?.advanced || {};

  const skipLabel =
    typeof navigation.skipLabel === "string" && navigation.skipLabel.trim()
      ? navigation.skipLabel.trim().slice(0, 80)
      : "Skip to content";

  return {
    preset: raw?.preset || "recommended",
    navigation: {
      skipLink: Boolean(navigation.skipLink),
      skipTarget: asAnchor(navigation.skipTarget, "#main"),
      skipLabel,
      skipFooter: Boolean(navigation.skipFooter),
      footerTarget: asAnchor(navigation.footerTarget, "#kpf-footer"),
      focusRing: Boolean(navigation.focusRing),
      focusRingColor: navigation.focusRingColor || "#2271b1",
      focusRingWidth: Math.min(
        8,
        Math.max(1, Number(navigation.focusRingWidth) || 3),
      ),
      focusNotObscured: Boolean(navigation.focusNotObscured),
      focusScrollMargin: Math.min(
        240,
        Math.max(0, Number(navigation.focusScrollMargin) || 96),
      ),
    },
    content: {
      language: content.language || "en",
      underlineLinks: Boolean(content.underlineLinks),
      routeAnnouncer: Boolean(content.routeAnnouncer),
      announceNewWindows: Boolean(content.announceNewWindows),
      readableMeasure: Boolean(content.readableMeasure),
    },
    display: {
      textScale: Math.min(200, Math.max(100, Number(display.textScale) || 100)),
      contrastBoost: Boolean(display.contrastBoost),
      honorPrefersContrast: Boolean(display.honorPrefersContrast),
      minTargetSize: asTargetSize(display.minTargetSize),
    },
    media: {
      blockAutoplayReducedMotion: Boolean(media.blockAutoplayReducedMotion),
    },
    motion: {
      honorPrefersReducedMotion: Boolean(motion.honorPrefersReducedMotion),
      forceReduceMotion: Boolean(motion.forceReduceMotion),
    },
    forms: {
      enhancedFocus: Boolean(forms.enhancedFocus),
      statusLiveRegion: Boolean(forms.statusLiveRegion),
      requiredVisible: Boolean(forms.requiredVisible),
      focusFirstError: Boolean(forms.focusFirstError),
    },
    advanced: {
      customCss: advanced.customCss || "",
      debugOutlines: Boolean(advanced.debugOutlines),
    },
  };
}

function contrastBoostCss() {
  return `
.kpf-site-chrome {
  --kpf-mute: #3d2c2d;
  --kpf-ink-soft: #1a1010;
  --kpf-color-text-secondary: #3d2c2d;
  --kpf-color-text-muted: #3d2c2d;
}
.kpf-site-chrome .kpf-mute,
.kpf-site-chrome .kpf-footer__legal,
.kpf-site-chrome .kpf-footer__copy,
.kpf-site-chrome .kpf-field__help,
.kpf-site-chrome .kpf-search__status {
  color: #3d2c2d;
}
`;
}

function prefersContrastCss() {
  return `
@media (prefers-contrast: more) {
  .kpf-site-chrome {
    --kpf-mute: #3d2c2d;
    --kpf-ink-soft: #1a1010;
    --kpf-color-border: #1a1010;
  }
  .kpf-site-chrome :is(a, button, input, select, textarea, .kpf-btn) {
    text-decoration-thickness: 0.12em;
  }
  .kpf-site-chrome .kpf-btn--outline,
  .kpf-site-chrome .kpf-btn--ghost {
    border-width: 2px;
  }
}
`;
}

function targetSizeCss(size) {
  if (size === "aa") {
    return `
.kpf-site-chrome :is(button, [role="button"], .kpf-btn, .kpf-mobile-nav__toggle, .kpf-mobile-nav__item, .kpf-partners__dot, .kpf-history__dots button, input:not([type="hidden"]), select, textarea) {
  min-height: 24px;
  min-width: 24px;
}
`;
  }
  if (size === "comfortable") {
    return `
.kpf-site-chrome :is(button, [role="button"], .kpf-btn, .kpf-mobile-nav__toggle, .kpf-mobile-nav__item, .kpf-partners__dot, .kpf-history__dots button, input:not([type="hidden"]), select, textarea) {
  min-height: 44px;
  min-width: 44px;
}
`;
  }
  return "";
}

function buildAccessibilityCss(config) {
  const parts = [];
  const nav = config.navigation;
  const content = config.content;
  const display = config.display;
  const motion = config.motion;
  const forms = config.forms;
  const advanced = config.advanced;
  const media = config.media;

  if (display.textScale && display.textScale !== 100) {
    parts.push(`html { font-size: ${display.textScale}%; }`);
  }

  if (nav.focusRing) {
    const width = nav.focusRingWidth;
    const color = nav.focusRingColor;
    parts.push(`
:focus { outline: none; }
:focus-visible {
  outline: ${width}px solid ${color};
  outline-offset: 2px;
}
.kpf-skip-link:focus,
.kpf-skip-link:focus-visible {
  outline: ${width}px solid ${color};
  outline-offset: 2px;
}
`);
  }

  if (nav.focusNotObscured) {
    const margin = nav.focusScrollMargin || 96;
    parts.push(`
:focus,
:focus-visible,
:target {
  scroll-margin-top: ${margin}px;
  scroll-margin-bottom: 72px;
}
#main:focus,
#main:focus-visible {
  outline: none;
}
`);
  }

  if (content.underlineLinks) {
    parts.push(`
.kpf-site-chrome__main a:not(.kpf-button):not(.kpf-button__link):not(.kpf-btn):not([class*="btn"]) {
  text-decoration: underline;
  text-underline-offset: 0.15em;
}
`);
  }

  if (content.readableMeasure) {
    parts.push(`
.kpf-site-chrome__main :is(.kpf-post-body, .kpf-page__article, .kpf-story) :is(p, li) {
  max-width: 65ch;
}
`);
  }

  if (display.contrastBoost) {
    parts.push(contrastBoostCss());
  }

  if (display.honorPrefersContrast) {
    parts.push(prefersContrastCss());
  }

  const targetCss = targetSizeCss(display.minTargetSize);
  if (targetCss) {
    parts.push(targetCss);
  }

  if (forms.enhancedFocus) {
    parts.push(`
.kpf-site-chrome__main :is(input, select, textarea, button):focus-visible {
  outline: ${nav.focusRingWidth || 3}px solid ${nav.focusRingColor || "#2271b1"};
  outline-offset: 2px;
}
`);
  }

  const reduceMotion =
    motion.forceReduceMotion || motion.honorPrefersReducedMotion;
  if (reduceMotion) {
    const body = `
  html {
    scroll-behavior: auto;
  }
  .kpf-site-chrome *,
  .kpf-site-chrome *::before,
  .kpf-site-chrome *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
  }
`;
    if (motion.forceReduceMotion) {
      parts.push(body);
    } else {
      parts.push(`@media (prefers-reduced-motion: reduce) {${body}}`);
    }
  }

  if (media.blockAutoplayReducedMotion) {
    parts.push(`
@media (prefers-reduced-motion: reduce) {
  .kpf-site-chrome__main video[autoplay] {
    display: none;
  }
}
`);
    if (motion.forceReduceMotion) {
      parts.push(`
.kpf-site-chrome__main video[autoplay] {
  display: none;
}
`);
    }
  }

  if (advanced.debugOutlines) {
    parts.push(`
.kpf-site-chrome__main :is(a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])) {
  outline: 1px dashed #d63638 !important;
}
`);
  }

  if (advanced.customCss) {
    parts.push(advanced.customCss);
  }

  return parts.join("\n").trim();
}

module.exports = {
  KPF_ACCESSIBILITY_QUERY,
  normalizeAccessibility,
  buildAccessibilityCss,
};
