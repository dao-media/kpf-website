import { useEffect, useRef, useState } from "react";
import SiteHeader from "@/components/SiteHeader";

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

function ChromeHeader({ component }) {
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
  }, [component?.html]);

  useEffect(() => {
    if (behavior.mode !== "sticky-hide-reveal" && !behavior.transparentAtTop) {
      return undefined;
    }

    lastScrollY.current = window.scrollY || 0;

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
    // Initialize from current scroll position after subscribe.
    window.requestAnimationFrame(onScroll);
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
      data-kpf-chrome-id={component.databaseId}
    >
      {reserveSpace ? (
        <div
          className="kpf-site-chrome__header-spacer"
          style={{ height }}
          aria-hidden="true"
        />
      ) : null}
      <header
        ref={barRef}
        className="kpf-site-chrome__header-bar"
        dangerouslySetInnerHTML={{ __html: component.html || "" }}
      />
    </div>
  );
}

function ChromeFooter({ component }) {
  const behavior = normalizeFooterBehavior(component?.behavior);

  return (
    <footer
      className={footerClassNames(behavior)}
      data-kpf-chrome-role="footer"
      data-kpf-chrome-id={component.databaseId}
      dangerouslySetInnerHTML={{ __html: component.html || "" }}
    />
  );
}

export default function SiteChrome({ chrome, children }) {
  const header = chrome?.header?.html ? chrome.header : null;
  const footer = chrome?.footer?.html ? chrome.footer : null;
  const footerBehavior = footer
    ? normalizeFooterBehavior(footer.behavior)
    : null;
  const shellClass =
    footerBehavior?.mode === "sticky-bottom"
      ? "kpf-site-chrome kpf-site-chrome--sticky-footer"
      : "kpf-site-chrome";

  return (
    <div className={shellClass}>
      {header ? <ChromeHeader component={header} /> : <SiteHeader />}
      <div id="main" className="kpf-site-chrome__main" tabIndex={-1}>
        {children}
      </div>
      {footer ? <ChromeFooter component={footer} /> : null}
    </div>
  );
}
