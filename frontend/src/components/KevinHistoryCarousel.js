import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const {
  DEFAULT_BACK_OPACITY,
  DEFAULT_EXIT_SCALE,
  DEFAULT_EXIT_X,
  DEFAULT_SCALE_STEP,
  rotateQueue,
  stackLayout,
} = require("@/lib/stackedImageSlider");

gsap.registerPlugin(ScrollTrigger);

const SWIPE_THRESHOLD_PX = 48;
const WHEEL_THRESHOLD = 48;
const STEP_DURATION = 0.7;
const STEP_EASE = "power2.out";
/** Entrance: when the split hits the viewport, wait then stagger imgs from the left. */
const INTRO_DELAY = 0.2;
const INTRO_DURATION = 0.7;
const INTRO_STAGGER = 0.12;
const INTRO_X = -72;
/** Rightward peel on forward exit; no vertical travel — bottom edge stays put. */
const EXIT_X = Math.max(DEFAULT_EXIT_X, 64);
const EXIT_Y = 0;
const EXIT_SCALE = Math.max(DEFAULT_EXIT_SCALE, 1.1);
/** Layers 2–4 (behind the front) are 20% dimmer than the base trail ramp. */
const TRAIL_OPACITY_SCALE = 0.8;
/** Peek neighbors sit smaller; step animates scale up/in ↔ scale down/out. */
const PEEK_NEIGHBOR_SCALE = 0.86;
/** Peek neighbors also sit at 40% opacity (on top of CSS edge/bottom masks). */
const PEEK_NEIGHBOR_OPACITY = 0.4;

/**
 * Fan left offsets relative to the STACK container (not the photo box):
 * - front: right-aligned, then +48px toward the copy card
 * - rear: further left than −20% so more of the back slide clips out
 * - middle slides: evenly spaced between those two left edges
 */
const FAN_FRONT_NUDGE_PX = 48;
const FAN_REAR_LEFT_FRACTION = -0.28;

function fanLeftPercent(slot, visibleCount, stackWidth, photoWidth) {
  const deep = Math.max(1, visibleCount - 1);
  // Allow indices past `deep` so a new rear card can slide in from further left.
  const index = Math.max(0, Number(slot) || 0);
  if (!stackWidth || !photoWidth) {
    return ((FAN_REAR_LEFT_FRACTION * 100) * index) / deep;
  }
  const frontLeftPx = Math.max(0, stackWidth - photoWidth) + FAN_FRONT_NUDGE_PX;
  const rearLeftPx = stackWidth * FAN_REAR_LEFT_FRACTION;
  const leftPx = frontLeftPx + ((rearLeftPx - frontLeftPx) * index) / deep;
  return (leftPx / stackWidth) * 100;
}

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Desktop fan stack vs tablet/mobile horizontal peek strip. */
function modeForViewport() {
  if (typeof window === "undefined" || !window.matchMedia) return "fan";
  return window.matchMedia("(min-width: 64rem)").matches ? "fan" : "peek";
}

function visibleCountForViewport() {
  if (typeof window === "undefined" || !window.matchMedia) return 4;
  if (window.matchMedia("(min-width: 64rem)").matches) return 4;
  // Peek mode shows prev + active + next (and a transitioning neighbor).
  return 3;
}

/** Queue index → signed slot (−1 prev, 0 active, +1 next, …). */
function queueSlot(qi, length) {
  if (qi === 0) return 0;
  if (qi > length / 2) return qi - length;
  return qi;
}

function decodeEntities(value) {
  const raw = String(value || "");
  if (!raw.includes("&")) return raw;
  if (typeof document === "undefined") {
    return raw
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) =>
        String.fromCharCode(parseInt(hex, 16)),
      );
  }
  const el = document.createElement("textarea");
  el.innerHTML = raw;
  return el.value;
}

/**
 * About “Who Kevin was” stack.
 * Fan via CSS `left` %; depth via GSAP `scale` (not width — avoids reflow / fan drift).
 * Step: front peels right + expands + fades, then recycles to the rear.
 * Intro: after the split fully enters the viewport, photos stagger slide/fade in from the left.
 */
export default function KevinHistoryCarousel({
  slides = [],
  cardEyebrow = "",
  ariaLabel = "Who Kevin was",
}) {
  const splitRef = useRef(null);
  const stackRef = useRef(null);
  const layerRefs = useRef([]);
  const animatingRef = useRef(false);
  const tweenRef = useRef(null);
  const activeIndexRef = useRef(0);
  const wheelAccRef = useRef(0);
  const pointerRef = useRef({
    active: false,
    x: 0,
    y: 0,
    pointerId: null,
    locked: null,
  });
  const metricsRef = useRef({ stackWidth: 0, photoWidth: 0 });
  const visibleCountRef = useRef(4);
  const modeRef = useRef("fan");

  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);
  const [metrics, setMetrics] = useState({ stackWidth: 0, photoWidth: 0 });
  const [mode, setMode] = useState("fan");

  activeIndexRef.current = activeIndex;
  metricsRef.current = metrics;
  visibleCountRef.current = visibleCount;
  modeRef.current = mode;

  const items = useMemo(
    () =>
      (Array.isArray(slides) ? slides : [])
        .map((item, index) => {
          const header = decodeEntities(item?.header || item?.title || "");
          const body = decodeEntities(item?.body || "");
          return {
            id: item?.id ?? item?.databaseId ?? `kevin-slide-${index}`,
            src: item?.src || item?.imageUrl || "",
            alt:
              decodeEntities(item?.alt || item?.imageAlt || "") ||
              header ||
              `Photo ${index + 1}`,
            header,
            body,
            bodyParagraphs: Array.isArray(item?.bodyParagraphs)
              ? item.bodyParagraphs.map(decodeEntities)
              : body
                  .split(/\n+/)
                  .map((p) => p.trim())
                  .filter(Boolean),
          };
        })
        .filter((item) => item.src),
    [slides],
  );

  const count = items.length;
  const active = items[activeIndex] || items[0] || null;
  const baseQueue = useMemo(
    () => items.map((_, index) => index),
    [items],
  );

  const paint = useCallback((queue, stepProgress) => {
    const layers = layerRefs.current;
    const { stackWidth, photoWidth } = metricsRef.current;
    if (!stackWidth || !photoWidth || queue.length < 1) return;

    if (modeRef.current === "peek") {
      // ~25% of each neighbor photo peeks past the active frame.
      const peek = Math.max(1, Math.round(photoWidth * 0.25));
      const stride = Math.max(1, photoWidth - peek);
      const centerLeft = (stackWidth - photoWidth) / 2;
      const p = Math.max(0, Math.min(1, Number(stepProgress) || 0));

      queue.forEach((imageIndex, qi) => {
        const layer = layers[imageIndex];
        if (!layer) return;
        const slot = queueSlot(qi, queue.length);
        const offset = slot - p;
        const dist = Math.abs(offset);
        const leftPx = centerLeft + offset * stride;
        const show = dist < 1.85;
        // Active = 1; neighbors = 40% (masks still fade the edges).
        const opacity = show
          ? dist <= 1
            ? 1 + (PEEK_NEIGHBOR_OPACITY - 1) * Math.min(1, dist)
            : PEEK_NEIGHBOR_OPACITY
          : 0;
        // Active = 1; neighbors = smaller. Progress drives scale up/in and down/out.
        const scale =
          dist <= 1
            ? 1 + (PEEK_NEIGHBOR_SCALE - 1) * Math.min(1, dist)
            : PEEK_NEIGHBOR_SCALE;
        let peekRole = "hidden";
        if (dist < 0.35) peekRole = "active";
        else if (offset < 0) peekRole = "prev";
        else if (offset > 0) peekRole = "next";

        layer.dataset.kpfPeek = peekRole;
        gsap.set(layer, {
          left: leftPx,
          x: 0,
          y: 0,
          xPercent: 0,
          yPercent: 0,
          scale,
          opacity,
          zIndex: Math.round(40 - dist * 12),
          transformOrigin: "50% 100%",
          visibility: show ? "visible" : "hidden",
          force3D: true,
        });
      });
      return;
    }

    const visible = visibleCountRef.current;
    const layout = stackLayout({
      queueLength: queue.length,
      stepProgress,
      visibleCount: visible,
      scaleStep: DEFAULT_SCALE_STEP,
      exitScale: EXIT_SCALE,
      backOpacity: DEFAULT_BACK_OPACITY,
      trailOpacityScale: TRAIL_OPACITY_SCALE,
      exitX: EXIT_X,
      exitY: EXIT_Y,
      slotLeftPercent: (slot) =>
        fanLeftPercent(slot, visible, stackWidth, photoWidth),
    });

    layout.forEach((slot) => {
      const imageIndex = queue[slot.queueIndex];
      const layer = layers[imageIndex];
      if (!layer) return;
      delete layer.dataset.kpfPeek;
      const show = slot.visible && slot.opacity > 0.001;
      gsap.set(layer, {
        left: slot.left == null ? "0%" : `${slot.left}%`,
        x: slot.x,
        y: slot.y,
        xPercent: 0,
        yPercent: 0,
        scale: slot.scale,
        opacity: slot.opacity,
        zIndex: slot.zIndex,
        transformOrigin: "50% 100%",
        visibility: show ? "visible" : "hidden",
        force3D: true,
      });
    });
  }, []);

  const measure = useCallback(() => {
    const stack = stackRef.current;
    if (!stack) return;
    const stackWidth = stack.clientWidth;
    const probe = stack.querySelector(".kpf-history__layer, .kpf-history__sizer");
    const photoWidth = probe?.offsetWidth || Math.min(stackWidth, 416);
    const nextMetrics = { stackWidth, photoWidth };
    const nextVisible = visibleCountForViewport();
    const nextMode = modeForViewport();
    metricsRef.current = nextMetrics;
    visibleCountRef.current = nextVisible;
    modeRef.current = nextMode;
    setMetrics(nextMetrics);
    setVisibleCount(nextVisible);
    setMode(nextMode);
    if (splitRef.current) {
      splitRef.current.dataset.kpfKevinMode = nextMode;
    }
    if (!animatingRef.current && baseQueue.length > 0) {
      paint(rotateQueue(baseQueue, activeIndexRef.current), 0);
    }
  }, [baseQueue, paint]);

  const goTo = useCallback(
    (nextIndex, { animate = true } = {}) => {
      if (count < 2) return;
      const target = ((nextIndex % count) + count) % count;
      let current = activeIndexRef.current;
      if (target === current) return;

      // Allow retargeting mid-flight (e.g. clicking another dot).
      if (animatingRef.current) {
        tweenRef.current?.kill();
        tweenRef.current = null;
        animatingRef.current = false;
        paint(rotateQueue(baseQueue, current), 0);
      }

      const reduce = prefersReducedMotion();
      const delta = (target - current + count) % count;
      const deltaBack = (current - target + count) % count;
      const forward = delta <= deltaBack;
      const steps = forward ? delta : deltaBack;

      if (!animate || reduce || steps < 1) {
        setActiveIndex(target);
        paint(rotateQueue(baseQueue, target), 0);
        return;
      }

      const stepDuration =
        steps > 1 ? Math.max(0.45, STEP_DURATION * 0.85) : STEP_DURATION;

      const runStep = (fromIndex) => {
        if (fromIndex === target) {
          animatingRef.current = false;
          tweenRef.current = null;
          return;
        }

        const next = forward
          ? (fromIndex + 1) % count
          : (fromIndex - 1 + count) % count;

        animatingRef.current = true;
        tweenRef.current?.kill();

        if (forward) {
          const queue = rotateQueue(baseQueue, fromIndex);
          const proxy = { p: 0 };
          tweenRef.current = gsap.to(proxy, {
            p: 1,
            duration: stepDuration,
            ease: STEP_EASE,
            onUpdate: () => paint(queue, proxy.p),
            onComplete: () => {
              activeIndexRef.current = next;
              setActiveIndex(next);
              paint(rotateQueue(baseQueue, next), 0);
              runStep(next);
            },
          });
          return;
        }

        // Reverse: rewind the forward exit that would go next → fromIndex.
        const prevQueue = rotateQueue(baseQueue, next);
        const proxy = { p: 1 };
        paint(prevQueue, 1);
        tweenRef.current = gsap.to(proxy, {
          p: 0,
          duration: stepDuration,
          ease: STEP_EASE,
          onUpdate: () => paint(prevQueue, proxy.p),
          onComplete: () => {
            activeIndexRef.current = next;
            setActiveIndex(next);
            paint(prevQueue, 0);
            runStep(next);
          },
        });
      };

      runStep(current);
    },
    [baseQueue, count, paint],
  );

  const step = useCallback(
    (direction) => {
      if (count < 2 || animatingRef.current) return;
      const dir = direction >= 0 ? 1 : -1;
      goTo(activeIndexRef.current + dir);
    },
    [count, goTo],
  );

  useEffect(() => {
    if (count < 1) return undefined;
    measure();
    const stack = stackRef.current;
    const ro =
      typeof ResizeObserver !== "undefined" && stack
        ? new ResizeObserver(() => measure())
        : null;
    if (ro && stack) ro.observe(stack);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [count, measure]);

  useLayoutEffect(() => {
    if (count < 1) return undefined;
    // Drop leftover GSAP autoAlpha/transform from sitewide section entrances
    // so CSS `.is-active` can own card visibility again.
    const root = splitRef.current;
    if (root) {
      gsap.utils.toArray(".kpf-history__card", root).forEach((card) => {
        gsap.set(card, {
          clearProps: "opacity,visibility,transform,translate,rotate,scale",
        });
      });
    }
    paint(rotateQueue(baseQueue, activeIndexRef.current), 0);
    return () => {
      tweenRef.current?.kill();
      tweenRef.current = null;
      animatingRef.current = false;
    };
  }, [baseQueue, count, paint]);

  // Stack photos: stagger in on mount. A ScrollTrigger `bottom bottom` wait
  // left the tartan empty while the story card was already on screen, and it
  // never fired reliably with ScrollSmoother.
  useLayoutEffect(() => {
    const split = splitRef.current;
    if (!split || count < 1) return undefined;

    const imgs = gsap.utils.toArray(".kpf-history__layer img", split);
    if (!imgs.length) return undefined;

    if (prefersReducedMotion()) {
      gsap.set(imgs, { autoAlpha: 1, x: 0 });
      return undefined;
    }

    const ctx = gsap.context(() => {
      const layers = gsap.utils.toArray(".kpf-history__layer", split);
      const orderedImgs = [...layers]
        .sort(
          (a, b) =>
            a.getBoundingClientRect().left - b.getBoundingClientRect().left,
        )
        .map((layer) => layer.querySelector("img"))
        .filter(Boolean);

      gsap.from(orderedImgs.length ? orderedImgs : imgs, {
        autoAlpha: 0,
        x: INTRO_X,
        duration: INTRO_DURATION,
        ease: "power3.out",
        stagger: INTRO_STAGGER,
        delay: INTRO_DELAY,
      });
    }, split);

    const failsafe = window.setTimeout(() => {
      gsap.set(imgs, { autoAlpha: 1, x: 0 });
    }, (INTRO_DELAY + INTRO_DURATION + INTRO_STAGGER * imgs.length) * 1000 + 200);

    return () => {
      window.clearTimeout(failsafe);
      ctx.revert();
    };
  }, [count, items.map((item) => item.src).join("\n")]);

  useEffect(() => {
    const split = splitRef.current;
    const stack = stackRef.current;
    if (!split || count < 2) return undefined;

    function resetPointer() {
      pointerRef.current = {
        active: false,
        x: 0,
        y: 0,
        pointerId: null,
        locked: null,
      };
    }

    function onWheel(event) {
      // Trackpad / mouse wheel over the photo stack only.
      if (!stack || !stack.contains(event.target)) return;
      event.preventDefault();
      event.stopPropagation();
      const absX = Math.abs(event.deltaX);
      const absY = Math.abs(event.deltaY);
      if (absY < 1 && absX < 1) return;
      wheelAccRef.current += absX >= absY ? event.deltaX : event.deltaY;
      if (Math.abs(wheelAccRef.current) < WHEEL_THRESHOLD) return;
      const nextDir = wheelAccRef.current > 0 ? 1 : -1;
      wheelAccRef.current = 0;
      step(nextDir);
    }

    function onPointerDown(event) {
      if (event.button != null && event.button !== 0) return;
      if (event.target?.closest?.("button, a, input, textarea, select")) return;
      pointerRef.current = {
        active: true,
        x: event.clientX,
        y: event.clientY,
        pointerId: event.pointerId,
        locked: null,
      };
      try {
        split.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    }

    function onPointerMove(event) {
      const pointer = pointerRef.current;
      if (!pointer.active || pointer.pointerId !== event.pointerId) return;
      if (pointer.locked) return;
      const dx = event.clientX - pointer.x;
      const dy = event.clientY - pointer.y;
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      pointer.locked = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    }

    function onTouchMove(event) {
      const pointer = pointerRef.current;
      if (!pointer.active) return;
      if (pointer.locked === "x" && event.cancelable) {
        event.preventDefault();
      }
    }

    function onPointerUp(event) {
      const pointer = pointerRef.current;
      if (!pointer.active || pointer.pointerId !== event.pointerId) return;
      const { x, y, locked } = pointer;
      try {
        split.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
      resetPointer();
      if (locked === "y") return;
      const dx = event.clientX - x;
      const dy = event.clientY - y;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
      step(dx < 0 ? 1 : -1);
    }

    split.addEventListener("wheel", onWheel, { passive: false });
    split.addEventListener("touchmove", onTouchMove, { passive: false });
    split.addEventListener("pointerdown", onPointerDown);
    split.addEventListener("pointermove", onPointerMove);
    split.addEventListener("pointerup", onPointerUp);
    split.addEventListener("pointercancel", resetPointer);

    return () => {
      split.removeEventListener("wheel", onWheel);
      split.removeEventListener("touchmove", onTouchMove);
      split.removeEventListener("pointerdown", onPointerDown);
      split.removeEventListener("pointermove", onPointerMove);
      split.removeEventListener("pointerup", onPointerUp);
      split.removeEventListener("pointercancel", resetPointer);
    };
  }, [count, step]);

  if (count < 1 || !active) return null;

  return (
    <div
      ref={splitRef}
      className="kpf-history__split"
      data-kpf-kevin-carousel=""
      data-kpf-kevin-mode={mode}
    >
      <div
        ref={stackRef}
        className="kpf-history__stack"
        role="group"
        aria-roledescription="carousel"
        aria-label={ariaLabel}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" || event.key === "ArrowDown") {
            event.preventDefault();
            step(1);
          } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
            event.preventDefault();
            step(-1);
          }
        }}
      >
        <div className="kpf-history__sizer" aria-hidden="true" />
        {items.map((slide, imageIndex) => (
          <figure
            key={slide.id}
            ref={(node) => {
              layerRefs.current[imageIndex] = node;
            }}
            className="kpf-history__layer"
            data-stack-index={imageIndex}
            aria-hidden={imageIndex !== activeIndex}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.src}
              alt={slide.alt || ""}
              width={1120}
              height={1296}
              loading="lazy"
              decoding="async"
              draggable={false}
            />
          </figure>
        ))}
      </div>

      <div className="kpf-history__aside">
        <div className="kpf-history__card-stack">
          {items.map((slide, index) => {
            const paragraphs =
              slide.bodyParagraphs?.length > 0
                ? slide.bodyParagraphs
                : slide.body
                  ? [slide.body]
                  : [];
            const isActive = index === activeIndex;
            return (
              <div
                key={`history-card-${slide.id}`}
                className={`kpf-history__card${isActive ? " is-active" : ""}`}
                aria-hidden={isActive ? undefined : true}
              >
                <div className="kpf-content-block">
                  <div className="kpf-content-block__copy">
                    <div className="kpf-content-block__title-group">
                      {cardEyebrow ? (
                        <span className="kpf-content-block__eyebrow">{cardEyebrow}</span>
                      ) : null}
                      <h3 className="kpf-content-block__title kpf-content-block__title--h3">
                        {slide.header}
                      </h3>
                    </div>
                    {paragraphs.length > 0 ? (
                      <div className="kpf-content-block__body-group">
                        {paragraphs.map((paragraph, i) => (
                          <p
                            key={`${slide.id}-p-${i}`}
                            className="kpf-content-block__body"
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="kpf-history__dots" role="group" aria-label="History slides">
          {items.map((slide, i) => (
            <button
              key={`history-dot-${slide.id}`}
              type="button"
              className={`kpf-history__dot${i === activeIndex ? " is-active" : ""}`}
              aria-label={`Show slide ${i + 1} of ${count}: ${slide.header || slide.alt}`}
              aria-current={i === activeIndex ? "true" : undefined}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
