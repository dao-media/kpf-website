import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const {
  buildAccessibilityCss,
  normalizeAccessibility,
} = require("@/lib/accessibility");

export default function AccessibilityRuntime({ config: rawConfig }) {
  const router = useRouter();
  const config = normalizeAccessibility(rawConfig);
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

  const showSkip = config.navigation.skipLink;
  const showLive =
    config.content.routeAnnouncer || config.forms.statusLiveRegion;

  return (
    <>
      {showSkip ? (
        <a className="kpf-skip-link" href={config.navigation.skipTarget}>
          Skip to content
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
          className="kpf-a11y-live"
          aria-live="polite"
          aria-atomic="true"
        >
          {announcement}
        </div>
      ) : null}
    </>
  );
}
