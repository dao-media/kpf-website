import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import KpfMobileNav from "@/components/KpfMobileNav";
import DonateButton from "@/components/DonateButton";
import {
  KPF_PRIMARY_NAV,
  isCurrentPath,
} from "@/lib/navigation";
import { restoreHeaderBadge } from "@/lib/headerBadge";

const { scheduleAfterLcp } = require("@/lib/thirdPartyIdle");

const BRAND_BADGE_SRC = "/media/brand/50-badge.webp";
const BRAND_LABEL_FULL = "Kevin Popke Foundation";
const BADGE_DROP_ANIMATION = "kpf-header-badge-drop";

/**
 * Two-line wordmark — keeps the full name readable in the compact nav bar
 * (no “KPF” truncation).
 */
function brandLines(full = BRAND_LABEL_FULL) {
  const label = String(full || BRAND_LABEL_FULL).trim();
  if (!label || label === BRAND_LABEL_FULL) {
    return ["Kevin Popke", "Foundation"];
  }
  const parts = label.split(/\s+/);
  if (parts.length < 2) return [label];
  return [parts.slice(0, -1).join(" "), parts[parts.length - 1]];
}

function BrandText({ full = BRAND_LABEL_FULL }) {
  const lines = brandLines(full);
  return (
    <span className="kpf-header__brand-text">
      <span className="kpf-header__brand-text-label">
        {lines.map((line) => (
          <span key={line} className="kpf-header__brand-line">
            {line}
          </span>
        ))}
      </span>
    </span>
  );
}

/** Survives SPA remounts within one full document load; resets on hard refresh. */
let navEntrancePlayed = false;
/** GSAP instance after the motion path loads — never imported on reduced-motion. */
let headerGsap = null;

/** Force badge/header to resting visibility — clears GSAP inline hide only. */
function settleHeaderEntrance(header, badge) {
  if (!header) return;
  if (typeof document !== "undefined") {
    document.documentElement.classList.add("kpf-nav-entered");
    document.documentElement.classList.remove("kpf-nav-entering");
  }
  header.style.opacity = "";
  header.style.visibility = "";
  if (badge) {
    if (headerGsap) {
      headerGsap.killTweensOf(badge, "autoAlpha,opacity,visibility,y");
    }
    badge.style.opacity = "";
    badge.style.visibility = "";
    badge.style.transform = "";
  } else {
    restoreHeaderBadge({ gsap: headerGsap });
  }
  navEntrancePlayed = true;
}

/** Rosette stays still; ribbons (lower clip) get a soft displacement gust. */
function Brandmark({ className = "kpf-header__mark" }) {
  const reactId = useId().replace(/:/g, "");
  const filterId = `kpf-badge-breeze-${reactId}`;
  const stringShadowId = `kpf-badge-string-shadow-${reactId}`;
  const rosetteClipId = `kpf-badge-rosette-${reactId}`;
  const ribbonsClipId = `kpf-badge-ribbons-${reactId}`;
  const badgeRef = useRef(null);

  useEffect(() => {
    const badge = badgeRef.current;
    if (!badge) return undefined;

    const turbulence = badge.querySelector("feTurbulence");
    const displacement = badge.querySelector("feDisplacementMap");
    const ribbons = badge.querySelector(".kpf-header__mark-ribbons");
    if (!turbulence || !displacement || !ribbons) return undefined;

    const hoverRoot =
      badge.closest(".kpf-header__brand") || badge;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      displacement.setAttribute("scale", "0");
      return undefined;
    }

    let cancelled = false;
    let revert = () => {};

    const startBreeze = () => {
      if (cancelled) return;
      import("gsap").then(({ gsap }) => {
        if (cancelled) return;
        headerGsap = gsap;
      const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: reduce)", () => {
      displacement.setAttribute("scale", "0");
      gsap.set(ribbons, { clearProps: "transform" });
    });

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      // Soft cloth sway: keep frequency fixed (animating it morphs the pattern
      // into a glitch). ~12% above the prior soft gust for a bit more cloth.
      const INTENSITY = 1.12;
      const breeze = { scale: 0 };
      const applyBreeze = () => {
        displacement.setAttribute("scale", String(breeze.scale));
      };

      applyBreeze();
      gsap.set(ribbons, { transformOrigin: "50% 8%" });

      const peak = 7 * INTENSITY; // ~7.84
      const mid = 3 * INTENSITY; // ~3.36
      const crest = 5.5 * INTENSITY; // ~6.16
      const echo = 4.2 * INTENSITY; // ~4.7 — extra half-sway before settle
      const rotPeak = 1.1 * INTENSITY;
      const rotMid = -0.5 * INTENSITY;
      const rotCrest = 0.7 * INTENSITY;
      const rotEcho = -0.45 * INTENSITY;
      const yPeak = 1.5 * INTENSITY;
      const yMid = 0.6 * INTENSITY;
      const yCrest = 1.1 * INTENSITY;
      const yEcho = 0.55 * INTENSITY;
      // 30% faster than the prior timing.
      const SPEED = 0.7;
      const d = (seconds) => seconds * SPEED;

      function buildGust(vars = {}) {
        const tl = gsap.timeline({
          defaults: { ease: "sine.inOut", onUpdate: applyBreeze },
          ...vars,
        });

        tl.to(breeze, { scale: peak, duration: d(1.1) })
          .to(
            ribbons,
            {
              rotation: rotPeak,
              y: yPeak,
              duration: d(1.1),
              ease: "sine.inOut",
            },
            "<",
          )
          .to(breeze, { scale: mid, duration: d(0.7) })
          .to(
            ribbons,
            {
              rotation: rotMid,
              y: yMid,
              duration: d(0.7),
              ease: "sine.inOut",
            },
            "<",
          )
          .to(breeze, { scale: crest, duration: d(0.9) })
          .to(
            ribbons,
            {
              rotation: rotCrest,
              y: yCrest,
              duration: d(0.9),
              ease: "sine.inOut",
            },
            "<",
          )
          // One more back-and-forth before settle.
          .to(breeze, { scale: mid * 0.85, duration: d(0.65) })
          .to(
            ribbons,
            {
              rotation: rotEcho,
              y: yEcho,
              duration: d(0.65),
              ease: "sine.inOut",
            },
            "<",
          )
          .to(breeze, { scale: echo, duration: d(0.75) })
          .to(
            ribbons,
            {
              rotation: rotCrest * 0.75,
              y: yCrest * 0.7,
              duration: d(0.75),
              ease: "sine.inOut",
            },
            "<",
          )
          .to(breeze, { scale: 0, duration: d(1.4), ease: "sine.out" })
          .to(
            ribbons,
            { rotation: 0, y: 0, duration: d(1.4), ease: "sine.out" },
            "<",
          );

        return tl;
      }

      const idle = buildGust({
        repeat: -1,
        repeatDelay: gsap.utils.random(3.2, 5.8),
        delay: gsap.utils.random(0.8, 1.8),
      });

      idle.eventCallback("onRepeat", () => {
        idle.repeatDelay(gsap.utils.random(3.2, 5.8));
      });

      let hoverGust = null;
      let hovered = false;

      const playHoverGust = () => {
        if (hovered) return;
        hovered = true;
        idle.pause(0);
        breeze.scale = 0;
        applyBreeze();
        gsap.set(ribbons, { rotation: 0, y: 0 });
        hoverGust?.kill();
        // Hover: same shape, slightly snappier lead-in so it feels responsive.
        hoverGust = buildGust({
          onComplete: () => {
            hoverGust = null;
            if (!hovered) {
              idle.restart(true);
            }
          },
        });
      };

      const endHover = (event) => {
        if (!hovered) return;
        // Ignore focus moves that stay inside the brand link.
        if (
          event?.type === "focusout" &&
          event.relatedTarget &&
          hoverRoot.contains(event.relatedTarget)
        ) {
          return;
        }
        hovered = false;
        // If hover gust already finished, resume idle; otherwise it resumes in onComplete.
        if (!hoverGust) {
          idle.restart(true);
        }
      };

      hoverRoot.addEventListener("mouseenter", playHoverGust);
      hoverRoot.addEventListener("mouseleave", endHover);
      hoverRoot.addEventListener("focusin", playHoverGust);
      hoverRoot.addEventListener("focusout", endHover);

      return () => {
        hoverRoot.removeEventListener("mouseenter", playHoverGust);
        hoverRoot.removeEventListener("mouseleave", endHover);
        hoverRoot.removeEventListener("focusin", playHoverGust);
        hoverRoot.removeEventListener("focusout", endHover);
        hoverGust?.kill();
        idle.kill();
        breeze.scale = 0;
        applyBreeze();
        gsap.set(ribbons, { clearProps: "transform" });
      };
    });

      revert = () => mm.revert();
    });
    };

    const cancelLcp = scheduleAfterLcp(startBreeze);
    return () => {
      cancelled = true;
      cancelLcp();
      revert();
    };
  }, []);

  // Use CSS clip-path (not the SVG clipPath attribute) so SSR `clip-path`
  // does not disagree with React's attribute reconciliation on hydrate.
  return (
    <span className="kpf-header__badge" ref={badgeRef} data-kpf-badge="">
      {/*
        Suspension cords — converge on the GSAP pivot (50% 0%). Nested in the
        badge so they rotate with the hover swing.
      */}
      <svg
        className="kpf-header__badge-strings"
        viewBox="0 0 86 177"
        width={86}
        height={177}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter
            id={stringShadowId}
            x="-40%"
            y="-20%"
            width="180%"
            height="140%"
            colorInterpolationFilters="sRGB"
          >
            <feDropShadow
              dx="0"
              dy="0.6"
              stdDeviation="0.55"
              floodColor="#12090a"
              floodOpacity="0.28"
            />
          </filter>
        </defs>
        <g
          className="kpf-header__badge-strings-group"
          filter={`url(#${stringShadowId})`}
          stroke="currentColor"
          strokeWidth="1.15"
          strokeLinecap="round"
          fill="none"
        >
          <line x1="43" y1="5" x2="31" y2="52" />
          <line x1="43" y1="5" x2="55" y2="52" />
        </g>
        <circle
          className="kpf-header__badge-string-pin"
          cx="43"
          cy="5"
          r="1.65"
          filter={`url(#${stringShadowId})`}
        />
      </svg>
      <svg
        className={className}
        viewBox="0 0 320 480"
        width={86}
        height={129}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter
            id={filterId}
            x="-20%"
            y="-10%"
            width="140%"
            height="130%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.006 0.014"
              numOctaves="1"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="0"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <clipPath id={rosetteClipId}>
            <rect x="0" y="0" width="320" height="268" />
          </clipPath>
          <clipPath id={ribbonsClipId}>
            <rect x="0" y="248" width="320" height="232" />
          </clipPath>
        </defs>
        <image
          href={BRAND_BADGE_SRC}
          width="320"
          height="480"
          style={{ clipPath: `url(#${rosetteClipId})` }}
          preserveAspectRatio="xMidYMid meet"
        />
        <image
          className="kpf-header__mark-ribbons"
          href={BRAND_BADGE_SRC}
          width="320"
          height="480"
          style={{ clipPath: `url(#${ribbonsClipId})` }}
          filter={`url(#${filterId})`}
          preserveAspectRatio="xMidYMid meet"
        />
      </svg>
    </span>
  );
}

/**
 * Sticky floating site header — Figma Pages Nav `616:1061`.
 * White bar: brandmark + wordmark · spacer · nav · Donate · mobile menu.
 *
 * First document load: header is visible immediately; badge drops from above.
 * Client-side route changes keep the resting state (no replay).
 */
export default function KpfHeader({
  brandLabel = "Kevin Popke Foundation",
  navItems = KPF_PRIMARY_NAV,
  donateLabel = "Donate",
}) {
  const router = useRouter();
  const pathname = router?.asPath?.split(/[?#]/)[0] || "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);

  // CSS parks the badge above the bar (`html:not(.kpf-nav-entered)`). Adding
  // kpf-nav-entering starts the drop without GSAP measuring a position:fixed
  // descendant (PSI forced reflow).
  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return undefined;

    const badgeEl = () => header.querySelector("[data-kpf-badge]");
    const html = document.documentElement;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const settle = () => settleHeaderEntrance(header, badgeEl());

    if (navEntrancePlayed || reduceMotion) {
      settle();
      return undefined;
    }

    let settled = false;
    let safetyTimer = 0;
    const badge = badgeEl();

    const settleOnce = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(safetyTimer);
      html.classList.remove("kpf-nav-entering");
      settle();
    };

    html.classList.add("kpf-nav-entering");
    safetyTimer = window.setTimeout(settleOnce, 1600);

    const onEnd = (event) => {
      if (event.target !== badge) return;
      if (event.animationName && event.animationName !== BADGE_DROP_ANIMATION) {
        return;
      }
      settleOnce();
    };
    badge?.addEventListener("animationend", onEnd);

    if (!badge) settleOnce();

    return () => {
      window.clearTimeout(safetyTimer);
      badge?.removeEventListener("animationend", onEnd);
      html.classList.remove("kpf-nav-entering");
      settleOnce();
    };
  }, []);

  useEffect(() => {
    if (!navEntrancePlayed) return undefined;
    restoreHeaderBadge({ resetY: true, gsap: headerGsap });
    return undefined;
  }, [pathname]);

  return (
    <header
      ref={headerRef}
      className="kpf-header"
      data-kpf-header="float"
    >
      <Link className="kpf-header__brand" href="/" aria-label={brandLabel}>
        <Brandmark />
        <BrandText full={brandLabel} />
      </Link>

      <div className="kpf-header__spacer" aria-hidden="true" />

      <nav className="kpf-header__nav" aria-label="Primary">
        <ul>
          {navItems.map((item) => {
            const current = isCurrentPath(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="kpf-nav-link"
                  data-label={item.label}
                  aria-current={current ? "page" : undefined}
                >
                  <span className="kpf-nav-link__label">{item.label}</span>
                  <span className="kpf-nav-link__line" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="kpf-header__actions">
        <DonateButton
          label={donateLabel}
          className="kpf-btn kpf-btn--primary"
          data-kpf-track="donate_clicked"
          data-kpf-track-component="header_donate"
        />
      </div>

      <div className="kpf-header__menu-slot">
        <KpfMobileNav
          items={navItems}
          pathname={pathname}
          open={menuOpen}
          onOpenChange={setMenuOpen}
        />
      </div>
    </header>
  );
}
