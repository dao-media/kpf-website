import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { gsap } from "gsap";
import KpfMobileNav from "@/components/KpfMobileNav";
import {
  KPF_DONATE_HREF,
  KPF_PRIMARY_NAV,
  isCurrentPath,
} from "@/lib/navigation";

const BRAND_BADGE_SRC = "/media/brand/50-badge.png";

/** Survives SPA remounts within one full document load; resets on hard refresh. */
let navEntrancePlayed = false;

/** Rosette stays still; ribbons (lower clip) get a soft displacement gust. */
function Brandmark({ className = "kpf-header__mark" }) {
  const reactId = useId().replace(/:/g, "");
  const filterId = `kpf-badge-breeze-${reactId}`;
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

    const badge = header.querySelector("[data-kpf-badge]");
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const settle = () => {
      gsap.set(header, { clearProps: "opacity,visibility,transform" });
      if (badge) gsap.set(badge, { clearProps: "opacity,visibility,transform" });
      navEntrancePlayed = true;
    };

    if (navEntrancePlayed || reduceMotion) {
      settle();
      return undefined;
    }

    // Hide, then enter — after hydration has committed matching markup.
    gsap.set(header, { autoAlpha: 0, scale: 0.96, y: -10 });
    if (badge) gsap.set(badge, { autoAlpha: 0, y: -140 });

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "power3.out" },
        onComplete: settle,
      });

      tl.to(header, {
        autoAlpha: 1,
        scale: 1,
        y: 0,
        duration: 0.55,
        ease: "power3.out",
      });

      if (badge) {
        tl.to(
          badge,
          {
            autoAlpha: 1,
            y: 0,
            duration: 0.7,
            ease: "power3.out",
          },
          "-=0.12",
        );
      }
    }, header);

    return () => ctx.revert();
  }, []);

  return (
    <header
      ref={headerRef}
      className="kpf-header"
      data-kpf-header="float"
    >
      <Link className="kpf-header__brand" href="/" aria-label={brandLabel}>
        <Brandmark />
        <span className="kpf-header__brand-text">{brandLabel}</span>
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
        <Link href={donateHref} className="kpf-btn kpf-btn--primary">
          {donateLabel}
        </Link>
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
