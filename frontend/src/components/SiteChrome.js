import { useEffect, useRef, useState } from "react";
import AccessibilityRuntime from "@/components/AccessibilityRuntime";
import KpfChromeRuntime from "@/components/KpfChromeRuntime";
import KpfFooter from "@/components/KpfFooter";
import KpfHeader from "@/components/KpfHeader";
import LinkArrowRuntime from "@/components/LinkArrowRuntime";
import ScrollSmootherRuntime from "@/components/ScrollSmootherRuntime";
import AnalyticsRuntime from "@/components/AnalyticsRuntime";
import CodeSnippetsRuntime from "@/components/CodeSnippetsRuntime";
import { SiteDateTimeProvider } from "@/components/SiteDateTimeProvider";

const {
  footerClassNames,
  headerClassNames,
  headerStyleVars,
  normalizeFooterBehavior,
  normalizeHeaderBehavior,
  shouldRevealSmartHeader,
} = require("@/lib/siteChrome");

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function defaultHeaderComponent(component) {
  return {
    databaseId: component?.databaseId || 0,
    html: component?.html || "",
    behavior: component?.behavior || null,
  };
}

function ChromeHeader({ component, useScaffold }) {
  const behavior = normalizeHeaderBehavior(component?.behavior);
  const shellRef = useRef(null);
  const barRef = useRef(null);
  const [height, setHeight] = useState(0);
  const [visible, setVisible] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const lastScrollY = useRef(0);
  const retractTimer = useRef(null);

  useEffect(() => {
    const node = barRef.current;
    if (!node || typeof ResizeObserver === "undefined") {
      setHeight(node?.offsetHeight || 0);
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      setHeight(node.offsetHeight || 0);
    });
    observer.observe(node);
    setHeight(node.offsetHeight || 0);
    return () => observer.disconnect();
  }, [component?.html, useScaffold]);

  useEffect(() => {
    if (behavior.mode !== "sticky-hide-reveal" && !behavior.transparentAtTop) {
      return undefined;
    }

    lastScrollY.current = window.scrollY || 0;
    setAtTop(lastScrollY.current <= behavior.scrollThresholdPx);

    function clearRetract() {
      if (retractTimer.current) {
        window.clearTimeout(retractTimer.current);
        retractTimer.current = null;
      }
    }

    function onScroll() {
      const scrollY = window.scrollY || 0;
      const delta = scrollY - lastScrollY.current;
      const threshold = behavior.scrollThresholdPx;
      const direction =
        Math.abs(delta) < threshold ? "none" : delta > 0 ? "down" : "up";
      const hasFocusWithin = Boolean(shellRef.current?.matches(":focus-within"));
      const reducedMotion = prefersReducedMotion();
      setAtTop(scrollY <= threshold);

      if (behavior.mode === "sticky-hide-reveal") {
        const shouldShow = shouldRevealSmartHeader({
          direction,
          scrollY,
          thresholdPx: threshold,
          revealAtTop: behavior.revealAtTop,
          hasFocusWithin,
          reducedMotion,
        });

        if (shouldShow) {
          clearRetract();
          setVisible(true);
        } else if (direction === "down") {
          clearRetract();
          retractTimer.current = window.setTimeout(() => {
            if (shellRef.current?.matches(":focus-within")) {
              setVisible(true);
              return;
            }
            setVisible(false);
          }, behavior.retractDelayMs);
        }
      }

      lastScrollY.current = scrollY;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      clearRetract();
      window.removeEventListener("scroll", onScroll);
    };
  }, [
    behavior.mode,
    behavior.retractDelayMs,
    behavior.revealAtTop,
    behavior.scrollThresholdPx,
    behavior.transparentAtTop,
  ]);

  const reserveSpace = !behavior.overlayHero && behavior.mode !== "inline";
  const headerVisible =
    behavior.mode === "sticky-hide-reveal" ? visible : true;

  return (
    <div
      ref={shellRef}
      className={headerClassNames(behavior, {
        visible: headerVisible,
        atTop,
      })}
      style={headerStyleVars(behavior)}
      data-kpf-chrome-role="header"
      data-kpf-chrome-id={component.databaseId || undefined}
      data-kpf-chrome-source={useScaffold ? "scaffold" : "cms"}
    >
      {reserveSpace ? (
        <div
          className="kpf-site-chrome__header-spacer"
          style={{ height }}
          aria-hidden="true"
        />
      ) : null}
      <div ref={barRef} className="kpf-site-chrome__header-bar">
        {useScaffold ? (
          <KpfHeader />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: component.html || "" }} />
        )}
      </div>
    </div>
  );
}

function ChromeFooter({ component, useScaffold }) {
  const behavior = normalizeFooterBehavior(component?.behavior);
  const className = footerClassNames(behavior);

  if (useScaffold) {
    return (
      <div
        className={className}
        data-kpf-chrome-role="footer"
        data-kpf-chrome-id={component?.databaseId || undefined}
        data-kpf-chrome-source="scaffold"
      >
        <KpfFooter />
      </div>
    );
  }

  // CMS HTML already includes <footer class="kpf-footer"> — wrap in a div.
  return (
    <div
      id="kpf-footer"
      className={className}
      data-kpf-chrome-role="footer"
      data-kpf-chrome-id={component.databaseId}
      data-kpf-chrome-source="cms"
      dangerouslySetInnerHTML={{ __html: component.html || "" }}
    />
  );
}

export default function SiteChrome({
  chrome,
  snippets = [],
  accessibility = null,
  children,
}) {
  const cmsHeader = chrome?.header || null;
  const cmsFooter = chrome?.footer || null;
  // Prefer React chrome so Figma Nav + footer cigar/layout always ship.
  const useHeaderScaffold = true;
  const useFooterScaffold = true;

  const header = {
    databaseId: cmsHeader?.databaseId || 0,
    html: "",
    behavior: {
      mode: "sticky",
      ...(cmsHeader?.behavior || {}),
      overlayHero: true,
      transparentAtTop: true,
      zIndex: 100,
    },
  };
  const footer = cmsFooter
    ? useFooterScaffold
      ? { databaseId: cmsFooter.databaseId || 0, html: "", behavior: cmsFooter.behavior || null }
      : cmsFooter
    : useFooterScaffold
      ? { databaseId: 0, html: "", behavior: null }
      : null;
  const footerBehavior = footer
    ? normalizeFooterBehavior(footer.behavior)
    : null;
  const shellClass =
    footerBehavior?.mode === "sticky-bottom"
      ? "kpf-site-chrome kpf-site-chrome--sticky-footer"
      : "kpf-site-chrome";

  return (
    <SiteDateTimeProvider value={chrome?.dateTime || null}>
      <AccessibilityRuntime config={accessibility}>
      <div className={shellClass}>
        <ChromeHeader component={header} useScaffold={useHeaderScaffold} />
        <KpfChromeRuntime enabled={!useHeaderScaffold} />
        <LinkArrowRuntime />
        <ScrollSmootherRuntime />
        <AnalyticsRuntime />
        <CodeSnippetsRuntime snippets={snippets} slot="header" />
        <div id="smooth-wrapper" className="kpf-smooth-wrapper">
          <div id="smooth-content" className="kpf-smooth-content">
            <div id="main" className="kpf-site-chrome__main" tabIndex={-1}>
              {children}
            </div>
            {footer ? (
              <ChromeFooter component={footer} useScaffold={useFooterScaffold} />
            ) : null}
            <CodeSnippetsRuntime snippets={snippets} slot="footer" />
          </div>
        </div>
      </div>
      </AccessibilityRuntime>
    </SiteDateTimeProvider>
  );
}
