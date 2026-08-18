import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { gsap } from "gsap";
import KpfMobileNav from "@/components/KpfMobileNav";
import KpfButton from "@/components/KpfButton";
import {
  KPF_DONATE_HREF,
  KPF_PRIMARY_NAV,
  isCurrentPath,
} from "@/lib/navigation";

const BRAND_BADGE_SRC = "/media/brand/50-badge.png";
const BRAND_LABEL_FULL = "Kevin Popke Foundation";
const BRAND_LABEL_SHORT = "KPF";

/** Survives SPA remounts within one full document load; resets on hard refresh. */
let navEntrancePlayed = false;

/**
 * Wordmark that matches nav-link type, swapping to a short label when the
 * flex slot is narrower than the full name (no ellipsis).
 */
function BrandText({
  full = BRAND_LABEL_FULL,
  short = BRAND_LABEL_SHORT,
}) {
  const slotRef = useRef(null);
  const measureRef = useRef(null);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const slot = slotRef.current;
    const measure = measureRef.current;
    if (!slot || !measure || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const brand = slot.closest(".kpf-header__brand");
    const header = brand?.closest(".kpf-header") || brand?.parentElement;
    if (!brand || !header) return undefined;

    const sync = () => {
      const needed = measure.offsetWidth;
      if (needed <= 0) return;

      const badge = brand.querySelector(".kpf-header__badge");
      const brandCs = getComputedStyle(brand);
      const gap = parseFloat(brandCs.gap) || 0;
      const brandPad =
        (parseFloat(brandCs.paddingLeft) || 0) +
        (parseFloat(brandCs.paddingRight) || 0);
      const fullBrandW =
        (badge?.offsetWidth || 0) + gap + needed + brandPad;

      const headerCs = getComputedStyle(header);
      const headerPad =
        (parseFloat(headerCs.paddingLeft) || 0) +
        (parseFloat(headerCs.paddingRight) || 0);
      const headerGap = parseFloat(headerCs.gap) || 0;
      const spacer = header.querySelector(".kpf-header__spacer");
      const spacerMin = spacer
        ? parseFloat(getComputedStyle(spacer).minWidth) || 0
        : 0;
      // Spacer flex-grows into leftover space — exclude it or available
      // collapses to the brand's *current* width and KPF never expands back.
      let fixed = 0;
      for (const child of header.children) {
        if (child === brand || child === spacer) continue;
        fixed += child.offsetWidth;
      }
      const availableForBrand =
        header.clientWidth -
        headerPad -
        fixed -
        spacerMin -
        headerGap * Math.max(0, header.children.length - 1);

      setCompact((prev) => {
        if (prev) return availableForBrand < fullBrandW + 4;
        return availableForBrand < fullBrandW;
      });
    };

    const ro = new ResizeObserver(sync);
    ro.observe(header);
    ro.observe(brand);
    sync();
    return () => ro.disconnect();
  }, [full]);

  return (
    <span
      ref={slotRef}
      className="kpf-header__brand-text"
      data-compact={compact ? "true" : undefined}
    >
      <span className="kpf-header__brand-text-label">{compact ? short : full}</span>
      <span
        ref={measureRef}
        className="kpf-header__brand-text-measure"
        aria-hidden="true"
      >
        {full}
      </span>
    </span>
  );
}

/** Force badge/header to resting visibility — clears GSAP inline hide only. */
function settleHeaderEntrance(header, badge) {
  if (!header) return;
  // overwrite:"auto" only interrupts conflicting props (opacity/y), so CMS
  // badge-swing rotation and ribbon breeze tweens keep running.
  gsap.set(header, {
    autoAlpha: 1,
    y: 0,
    overwrite: "auto",
    clearProps: "transform",
  });
  if (badge) {
    gsap.set(badge, {
      autoAlpha: 1,
      y: 0,
      overwrite: "auto",
    });
    // Prefer stylesheet as source of truth after entrance.
    badge.style.opacity = "";
    badge.style.visibility = "";
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

    return () => mm.revert();
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
        role="img"
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
 * First document load: bar fades/pops in, then badge drops from above.
 * Client-side route changes keep the resting state (no replay).
 */
export default function KpfHeader({
  brandLabel = "Kevin Popke Foundation",
  navItems = KPF_PRIMARY_NAV,
  donateHref = KPF_DONATE_HREF,
  donateLabel = "Donate",
}) {
  const router = useRouter();
  const pathname = router?.asPath?.split(/[?#]/)[0] || "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef(null);

  // useEffect (not useLayoutEffect): keep first client paint identical to SSR,
  // then run the entrance after hydrate so React does not see a DOM mismatch.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return undefined;

    // Re-query on settle — Brandmark may remount with a new node.
    const badgeEl = () => header.querySelector("[data-kpf-badge]");
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const settle = () => settleHeaderEntrance(header, badgeEl());

    if (navEntrancePlayed || reduceMotion) {
      settle();
      return undefined;
    }

    const badge = badgeEl();

    // Hide, then enter — after hydration has committed matching markup.
    // Opacity + slight y only — never scale the header (scale reflows Donate
    // ~1–2px on both axes and reads as a persistent “proportion shift”).
    // overwrite:false so CMS hover / transformOrigin seeds cannot kill this
    // mid-flight and leave autoAlpha stuck at 0.
    gsap.set(header, { autoAlpha: 0, y: -8, overwrite: false });
    if (badge) gsap.set(badge, { autoAlpha: 0, y: -140, overwrite: false });

    let settled = false;
    const settleOnce = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(safetyTimer);
      settle();
    };

    // If the timeline is killed (Strict Mode, route remount, CMS overwrite),
    // still force the badge visible — never park at autoAlpha 0.
    const safetyTimer = window.setTimeout(settleOnce, 1600);

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out", overwrite: false },
        onComplete: settleOnce,
      });

      tl.to(header, {
        autoAlpha: 1,
        y: 0,
        duration: 0.5,
        ease: "power3.out",
        overwrite: false,
      });

      if (badge) {
        tl.to(
          badge,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
            overwrite: false,
          },
          "-=0.12",
        );
      }
    }, header);

    return () => {
      window.clearTimeout(safetyTimer);
      ctx.revert();
      // Treat interrupt as "entrance done" so remounts never re-hide the badge.
      settleOnce();
    };
  }, []);

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

      <ul className="kpf-header__nav" aria-label="Primary">
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

      <div className="kpf-header__actions">
        <KpfButton
          href={donateHref}
          className="kpf-btn kpf-btn--primary"
          data-kpf-track="donate_header_clicked"
        >
          {donateLabel}
        </KpfButton>
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
