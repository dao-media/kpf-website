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

function normalizeAccessibility(raw) {
  const navigation = raw?.navigation || {};
  const content = raw?.content || {};
  const media = raw?.media || {};
  const motion = raw?.motion || {};
  const forms = raw?.forms || {};
  const advanced = raw?.advanced || {};

  const skipTarget =
    typeof navigation.skipTarget === "string" &&
    /^#[A-Za-z][\w:-]*$/.test(navigation.skipTarget)
      ? navigation.skipTarget
      : "#main";

  return {
    preset: raw?.preset || "recommended",
    navigation: {
      skipLink: Boolean(navigation.skipLink),
      skipTarget,
      focusRing: Boolean(navigation.focusRing),
      focusRingColor: navigation.focusRingColor || "#2271b1",
      focusRingWidth: Math.min(
        8,
        Math.max(1, Number(navigation.focusRingWidth) || 3),
      ),
    },
    content: {
      language: content.language || "en",
      underlineLinks: Boolean(content.underlineLinks),
      routeAnnouncer: Boolean(content.routeAnnouncer),
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
    },
    advanced: {
      customCss: advanced.customCss || "",
      debugOutlines: Boolean(advanced.debugOutlines),
    },
  };
}

function buildAccessibilityCss(config) {
  const parts = [];
  const nav = config.navigation;
  const content = config.content;
  const motion = config.motion;
  const forms = config.forms;
  const advanced = config.advanced;
  const media = config.media;

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

  if (content.underlineLinks) {
    parts.push(`
.kpf-site-chrome__main a:not(.kpf-button):not(.kpf-button__link):not([class*="btn"]) {
  text-decoration: underline;
  text-underline-offset: 0.15em;
}
`);
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
    const selector = motion.forceReduceMotion
      ? ":root"
      : "@media (prefers-reduced-motion: reduce)";
    const body = `
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
  }
`;
    if (motion.forceReduceMotion) {
      parts.push(`${selector} {${body}}`);
    } else {
      parts.push(`${selector} {${body}}`);
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
