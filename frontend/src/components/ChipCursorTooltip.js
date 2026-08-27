import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";

const {
  SCALE_EXIT,
  edgeBufferForRect,
  edgeExitProgress,
  poseFromProgress,
} = require("@/lib/chipTooltipProximity");

const DURATION = 0.2;
const TIP_GAP = 12;
const VIEWPORT_PAD = 8;
// Leave starts the 0.2s exit immediately. An inner buffer already eases
// scale/alpha, so a hide grace would park the tip and delay the fade.
const HIDE_GRACE_MS = 0;
const MOBILE_HOLD = 2;
const MOBILE_STAGGER = 1;
const MOBILE_MQ = "(max-width: 63.999rem)";
const FINE_POINTER_MQ = "(hover: hover) and (pointer: fine)";
const DESKTOP_FINE_POINTER_MQ =
  "(hover: hover) and (pointer: fine) and (min-width: 64rem)";

/** @type {WeakMap<Element, { showAt: Function, hide: Function, getLabel: Function }>} */
const tipRegistry = new WeakMap();

/** @type {Element | null} */
let activeTipHost = null;

/**
 * Only one tip open at a time — force the previous tip’s exit anim immediately.
 * @param {Element} host
 * @param {() => void} claim
 */
function claimActiveTip(host, claim) {
  if (activeTipHost && activeTipHost !== host) {
    const prev = tipRegistry.get(activeTipHost);
    prev?.hide();
  }
  activeTipHost = host;
  claim();
}

/**
 * @param {Element} host
 */
function releaseActiveTip(host) {
  if (activeTipHost === host) activeTipHost = null;
}

function isFinePointer() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(FINE_POINTER_MQ).matches;
}

function isDesktopFinePointer() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(DESKTOP_FINE_POINTER_MQ).matches;
}

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Bind cursor-tracked tooltip behavior to an existing host + tip node.
 * @returns {() => void}
 */
function attachChipCursorTooltip(
  host,
  tip,
  { desktopOnly = false, label = "", labelSoft = "", tipId = "" } = {},
) {
  if (!host || !tip || !label) return () => {};

  const pointerOk = () =>
    desktopOnly ? isDesktopFinePointer() : isFinePointer();

  gsap.set(tip, {
    autoAlpha: 0,
    xPercent: -50,
    yPercent: -100,
    x: 0,
    y: 0,
    scale: SCALE_EXIT,
    transformOrigin: "50% 100%",
    force3D: true,
    pointerEvents: "none",
  });

  let visible = false;
  let hideTimer = null;
  let belowCursor = false;

  const applySide = (nextBelow) => {
    if (belowCursor === nextBelow) return;
    belowCursor = nextBelow;
    gsap.set(tip, {
      x: 0,
      y: 0,
      xPercent: -50,
      yPercent: nextBelow ? 0 : -100,
      transformOrigin: nextBelow ? "50% 0%" : "50% 100%",
    });
    tip.classList.toggle("kpf-chip-tip--below", nextBelow);
  };

  const clearHideTimer = () => {
    if (hideTimer != null) {
      window.clearTimeout(hideTimer);
      hideTimer = null;
    }
  };

  const poseForPoint = (clientX, clientY) => {
    if (typeof clientX !== "number" || typeof clientY !== "number") {
      return poseFromProgress(0);
    }
    const rect = host.getBoundingClientRect();
    return poseFromProgress(
      edgeExitProgress(clientX, clientY, rect, edgeBufferForRect(rect)),
    );
  };

  const applyProximity = (clientX, clientY) => {
    if (!visible || prefersReducedMotion()) return;
    const pose = poseForPoint(clientX, clientY);
    gsap.to(tip, {
      autoAlpha: pose.autoAlpha,
      scale: pose.scale,
      duration: DURATION,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  const place = (clientX, clientY) => {
    const tipH = tip.offsetHeight || 40;
    applySide(clientY - TIP_GAP - tipH < VIEWPORT_PAD);
    const left = clientX;
    const top = belowCursor ? clientY + TIP_GAP : clientY - TIP_GAP;
    /* Pin instantly. Tweening left/top interpolates from CSS 0,0 and the
     * tip flies in from the top of the viewport (loud on The Work mosaic). */
    gsap.set(tip, { left, top });
  };

  const placeOverHost = () => {
    const rect = host.getBoundingClientRect();
    const tipH = tip.offsetHeight || 40;
    applySide(rect.top - TIP_GAP - tipH < VIEWPORT_PAD);
    gsap.set(tip, {
      left: rect.left + rect.width / 2,
      top: belowCursor ? rect.bottom + TIP_GAP : rect.top - TIP_GAP,
    });
  };

  /** @param {number=} clientX @param {number=} clientY */
  const animateIn = (clientX, clientY) => {
    const dur = prefersReducedMotion() ? 0 : DURATION;
    const pose = poseForPoint(clientX, clientY);
    gsap.killTweensOf(tip, "autoAlpha,scale");
    gsap.fromTo(
      tip,
      { autoAlpha: 0, scale: SCALE_EXIT },
      {
        autoAlpha: pose.autoAlpha,
        scale: pose.scale,
        duration: dur,
        ease: "power2.out",
        overwrite: "auto",
      },
    );
  };

  const animateOut = () => {
    const dur = prefersReducedMotion() ? 0 : DURATION;
    gsap.killTweensOf(tip, "autoAlpha,scale");
    gsap.to(tip, {
      autoAlpha: 0,
      scale: SCALE_EXIT,
      duration: dur,
      ease: "power2.out",
      overwrite: "auto",
    });
  };

  /** @param {number=} clientX @param {number=} clientY */
  const show = (clientX, clientY) => {
    clearHideTimer();
    if (typeof clientX === "number" && typeof clientY === "number") {
      place(clientX, clientY);
    } else {
      placeOverHost();
    }

    if (visible) {
      activeTipHost = host;
      return;
    }

    claimActiveTip(host, () => {
      visible = true;
      tip.setAttribute("data-open", "true");
      host.setAttribute("data-kpf-tip-open", "true");
      animateIn(clientX, clientY);
    });
  };

  /** @param {{ force?: boolean }} [opts] */
  const hide = (opts = {}) => {
    clearHideTimer();
    const run = () => {
      if (!visible) return;
      visible = false;
      tip.removeAttribute("data-open");
      host.removeAttribute("data-kpf-tip-open");
      releaseActiveTip(host);
      animateOut();
    };

    if (opts.force || HIDE_GRACE_MS <= 0) {
      run();
      return;
    }

    hideTimer = window.setTimeout(run, HIDE_GRACE_MS);
  };

  tipRegistry.set(host, {
    showAt: (x, y) => show(x, y),
    hide: () => hide({ force: true }),
    getLabel: () => (labelSoft ? `${label} | ${labelSoft}` : label),
  });

  const trigger = host.querySelector("a,button") || host;
  trigger.setAttribute("aria-describedby", tipId);

  const leftHostFor = (related) => {
    if (!(related instanceof Node)) return true;
    if (host.contains(related)) return false;
    if (related instanceof Element && related.closest(".kpf-chip-tip")) {
      return false;
    }
    return true;
  };

  const onEnter = (event) => {
    if (!pointerOk()) return;
    show(event.clientX, event.clientY);
  };

  const onMove = (event) => {
    if (!pointerOk() || !visible) return;
    place(event.clientX, event.clientY);
    applyProximity(event.clientX, event.clientY);
  };

  const onLeave = (event) => {
    if (!pointerOk()) return;
    if (!leftHostFor(event.relatedTarget)) return;
    hide();
  };

  const onFocusIn = () => {
    if (!pointerOk()) return;
    show();
  };

  const onFocusOut = (event) => {
    if (!pointerOk()) return;
    if (!leftHostFor(event.relatedTarget)) return;
    hide();
  };

  const usePointer = typeof window.PointerEvent === "function";
  if (usePointer) {
    host.addEventListener("pointerenter", onEnter);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
  } else {
    host.addEventListener("mouseenter", onEnter);
    host.addEventListener("mousemove", onMove);
    host.addEventListener("mouseleave", onLeave);
  }
  host.addEventListener("focusin", onFocusIn);
  host.addEventListener("focusout", onFocusOut);

  return () => {
    clearHideTimer();
    if (usePointer) {
      host.removeEventListener("pointerenter", onEnter);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
    } else {
      host.removeEventListener("mouseenter", onEnter);
      host.removeEventListener("mousemove", onMove);
      host.removeEventListener("mouseleave", onLeave);
    }
    host.removeEventListener("focusin", onFocusIn);
    host.removeEventListener("focusout", onFocusOut);
    trigger.removeAttribute("aria-describedby");
    tipRegistry.delete(host);
    releaseActiveTip(host);
    host.removeAttribute("data-kpf-tip-open");
    gsap.killTweensOf(tip);
    visible = false;
  };
}

function ChipTipMarkup({ tipRef, tipId, label, labelSoft, icon }) {
  const tipText = labelSoft ? `${label} | ${labelSoft}` : label;
  return (
    <span
      ref={tipRef}
      id={tipId}
      className={["kpf-chip-tip", icon ? "kpf-chip-tip--icon" : ""]
        .filter(Boolean)
        .join(" ")}
      role="tooltip"
    >
      <span className="kpf-chip-tip__label">
        {icon ? (
          <>
            <span className="kpf-chip-tip__icon" aria-hidden="true">
              {icon}
            </span>
            <span className="kpf-u-sr-only">{tipText}</span>
          </>
        ) : (
          <>
            {label}
            {labelSoft ? (
              <span className="kpf-chip-tip__soft">{` | ${labelSoft}`}</span>
            ) : null}
          </>
        )}
      </span>
      <span className="kpf-chip-tip__carrot" aria-hidden="true" />
    </span>
  );
}

/**
 * @param {{
 *   label: string,
 *   children: import("react").ReactNode,
 *   className?: string,
 *   style?: import("react").CSSProperties,
 *   desktopOnly?: boolean,
 *   labelSoft?: string,
 *   icon?: import("react").ReactNode,
 * }} props
 */
export default function ChipCursorTooltip({
  label,
  children,
  className = "",
  style,
  desktopOnly = false,
  labelSoft = "",
  icon = null,
}) {
  const hostRef = useRef(null);
  const tipRef = useRef(null);
  const tipId = useId();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return undefined;
    return attachChipCursorTooltip(hostRef.current, tipRef.current, {
      desktopOnly,
      label,
      labelSoft,
      tipId,
    });
  }, [desktopOnly, icon, label, labelSoft, mounted, tipId]);

  const tipText = labelSoft ? `${label} | ${labelSoft}` : label;

  return (
    <span
      ref={hostRef}
      className={["kpf-chip-tip-host", className].filter(Boolean).join(" ")}
      data-kpf-chip-tip={tipText}
      data-kpf-chip-tip-desktop={desktopOnly ? "true" : undefined}
      style={style}
    >
      {children}
      {mounted
        ? createPortal(
            <ChipTipMarkup
              tipRef={tipRef}
              tipId={tipId}
              label={label}
              labelSoft={labelSoft}
              icon={icon}
            />,
            document.body,
          )
        : null}
    </span>
  );
}

/**
 * Same tooltip as {@link ChipCursorTooltip}, bound to an existing DOM node
 * (WordPress HTML links, design-template buttons).
 */
export function BoundChipCursorTooltip({
  host,
  label,
  labelSoft = "",
  icon = null,
  desktopOnly = false,
  className = "kpf-exit-tip",
}) {
  const tipRef = useRef(null);
  const tipId = useId();
  const [mounted, setMounted] = useState(false);
  const tipText = labelSoft ? `${label} | ${labelSoft}` : label;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !host || !label) return undefined;
    const tokens = ["kpf-chip-tip-host", className]
      .filter(Boolean)
      .flatMap((value) => String(value).split(/\s+/).filter(Boolean));
    tokens.forEach((token) => host.classList.add(token));
    host.setAttribute("data-kpf-chip-tip", tipText);
    if (desktopOnly) host.setAttribute("data-kpf-chip-tip-desktop", "true");
    const detach = attachChipCursorTooltip(host, tipRef.current, {
      desktopOnly,
      label,
      labelSoft,
      tipId,
    });
    return () => {
      detach();
      tokens.forEach((token) => host.classList.remove(token));
      host.removeAttribute("data-kpf-chip-tip");
      host.removeAttribute("data-kpf-chip-tip-desktop");
    };
  }, [
    className,
    desktopOnly,
    host,
    icon,
    label,
    labelSoft,
    mounted,
    tipId,
    tipText,
  ]);

  if (!mounted) return null;
  return createPortal(
    <ChipTipMarkup
      tipRef={tipRef}
      tipId={tipId}
      label={label}
      labelSoft={labelSoft}
      icon={icon}
    />,
    document.body,
  );
}

/**
 * When the group enters view on tablet/mobile, show each chip tip for 2s, staggered by 1s.
 * @param {import("react").RefObject<HTMLElement | null>} containerRef
 * @param {unknown[]} [deps]
 */
export function useChipTooltipTour(containerRef, deps = []) {
  useEffect(() => {
    const root = containerRef.current;
    if (!root || typeof window === "undefined") return undefined;

    const mm = gsap.matchMedia();
    let observer = null;
    let played = false;
    /** @type {gsap.core.Timeline | null} */
    let master = null;

    mm.add(
      {
        isCompact: MOBILE_MQ,
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        if (!context.conditions?.isCompact) return undefined;

        const runTour = () => {
          if (played) return;
          const hosts = gsap.utils
            .toArray("[data-kpf-chip-tip]", root)
            .filter(
              (el) =>
                !(el instanceof Element) ||
                el.getAttribute("data-kpf-chip-tip-desktop") !== "true",
            );
          if (!hosts.length) return;

          const apis = hosts
            .map((host) => tipRegistry.get(host))
            .filter(Boolean);
          if (!apis.length) return;

          played = true;
          const hold = context.conditions.reduceMotion ? 0.01 : MOBILE_HOLD;
          const stagger = context.conditions.reduceMotion ? 0 : MOBILE_STAGGER;
          master = gsap.timeline();

          apis.forEach((api, index) => {
            const start = index * stagger;
            master.call(() => api.showAt(), null, start);
            master.call(() => api.hide(), null, start + hold);
          });
        };

        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
                requestAnimationFrame(() => {
                  runTour();
                  if (played) observer?.disconnect();
                });
              }
            });
          },
          { threshold: [0.35] },
        );
        observer.observe(root);

        return () => {
          observer?.disconnect();
          master?.kill();
          master = null;
        };
      },
    );

    return () => {
      mm.revert();
      observer?.disconnect();
      master?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tour rebinds when chip set changes
  }, deps);
}

export function tooltipForChipIcon(icon) {
  if (icon === "map") return "Get directions";
  if (icon === "ticket") return "Get tickets";
  if (icon === "calendar" || icon === "clock") return "Add to Google Calendar";
  return "";
}
