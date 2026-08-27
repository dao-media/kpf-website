import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/router";

const {
  buildAccessibilityCss,
  normalizeAccessibility,
} = require("@/lib/accessibility");
const { ensureDomImageAlts } = require("@/lib/imageAlt");

const AccessibilityContext = createContext(
  normalizeAccessibility({
    forms: {
      enhancedFocus: true,
      statusLiveRegion: true,
      requiredVisible: true,
      focusFirstError: true,
    },
  }),
);

export function useAccessibility() {
  return useContext(AccessibilityContext);
}

function announceNewWindowLinks(root) {
  if (!root) return;
  root.querySelectorAll('a[target="_blank"]').forEach((link) => {
    if (link.dataset.kpfNewWindow === "1") return;
    const labelled = `${link.getAttribute("aria-label") || ""} ${link.textContent || ""}`;
    if (/opens in a new (tab|window)/i.test(labelled)) {
      link.dataset.kpfNewWindow = "1";
      return;
    }
    const hint = document.createElement("span");
    hint.className = "kpf-u-sr-only";
    hint.textContent = " (opens in a new tab)";
    link.appendChild(hint);
    link.dataset.kpfNewWindow = "1";
  });
}

export default function AccessibilityRuntime({ config: rawConfig, children }) {
  const router = useRouter();
  const config = useMemo(
    () => normalizeAccessibility(rawConfig),
    [rawConfig],
  );
  const [announcement, setAnnouncement] = useState("");
  const css = buildAccessibilityCss(config);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const lang = config.content.language || "en";
    if (lang) {
      document.documentElement.lang = lang;
    }
  }, [config.content.language]);

  useEffect(() => {
    if (!config.content.routeAnnouncer || typeof document === "undefined") {
      return undefined;
    }

    function announce() {
      const title = document.title?.trim() || "Page loaded";
      setAnnouncement("");
      window.requestAnimationFrame(() => {
        setAnnouncement(title);
      });
    }

    announce();
    router.events?.on("routeChangeComplete", announce);
    return () => {
      router.events?.off("routeChangeComplete", announce);
    };
  }, [config.content.routeAnnouncer, router.events]);

  useEffect(() => {
    if (
      !config.media.blockAutoplayReducedMotion ||
      typeof document === "undefined"
    ) {
      return undefined;
    }

    const force = config.motion.forceReduceMotion;
    const prefersReduce =
      force ||
      (window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    if (!prefersReduce) {
      return undefined;
    }

    document.querySelectorAll("video[autoplay]").forEach((video) => {
      try {
        video.pause();
        video.removeAttribute("autoplay");
      } catch (error) {
        // Ignore media errors.
      }
    });

    return undefined;
  }, [
    config.media.blockAutoplayReducedMotion,
    config.motion.forceReduceMotion,
    router.asPath,
  ]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const root = document.querySelector(".kpf-site-chrome") || document.body;
    function apply() {
      ensureDomImageAlts(root);
      if (config.content.announceNewWindows) {
        announceNewWindowLinks(root);
      }
    }
    apply();

    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [config.content.announceNewWindows, router.asPath]);

  const showSkip = config.navigation.skipLink;
  const showFooterSkip = showSkip && config.navigation.skipFooter;
  const showLive =
    config.content.routeAnnouncer || config.forms.statusLiveRegion;

  const runtime = (
    <>
      {showSkip ? (
        <a className="kpf-skip-link" href={config.navigation.skipTarget}>
          {config.navigation.skipLabel}
        </a>
      ) : null}
      {showFooterSkip ? (
        <a className="kpf-skip-link kpf-skip-link--footer" href={config.navigation.footerTarget}>
          Skip to footer
        </a>
      ) : null}
      {css ? (
        <style
          data-kpf-a11y={config.preset || "custom"}
          dangerouslySetInnerHTML={{ __html: css }}
        />
      ) : null}
      {showLive ? (
        <div
          id="kpf-a11y-live"
          className="kpf-a11y-live kpf-u-sr-only"
          aria-live="polite"
          aria-atomic="true"
        >
          {announcement}
        </div>
      ) : null}
    </>
  );

  if (children == null) {
    return (
      <AccessibilityContext.Provider value={config}>
        {runtime}
      </AccessibilityContext.Provider>
    );
  }

  return (
    <AccessibilityContext.Provider value={config}>
      {runtime}
      {children}
    </AccessibilityContext.Provider>
  );
}
