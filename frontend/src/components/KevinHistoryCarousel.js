import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";

const {
  DEFAULT_BACK_OPACITY,
  DEFAULT_SCALE_STEP,
  DEFAULT_STAGGER_X,
  DEFAULT_STAGGER_Y,
  advanceQueue,
  rotateQueue,
  stackLayout,
} = require("@/lib/stackedImageSlider");

const SWIPE_THRESHOLD_PX = 48;
const WHEEL_THRESHOLD = 48;
const TRANSITION_MS = 520;

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Desktop 4 / tablet 2 / mobile 4 (restore hidden tablet layers). */
function visibleCountForViewport() {
  if (typeof window === "undefined" || !window.matchMedia) return 4;
  if (window.matchMedia("(min-width: 64rem)").matches) return 4;
  if (window.matchMedia("(min-width: 48rem)").matches) return 2;
  return 4;
}

function staggerXForViewport() {
  if (typeof window === "undefined" || !window.matchMedia) return DEFAULT_STAGGER_X;
  if (window.matchMedia("(min-width: 64rem)").matches) return 72;
  if (window.matchMedia("(min-width: 48rem)").matches) return 48;
  return 40;
}

/**
 * About “Who Kevin was” stack: container cards, bottom-aligned fan,
 * discrete steps via dots / wheel / swipe. Card copy follows the front slide.
 */
export default function KevinHistoryCarousel({
  slides = [],
  cardEyebrow = "",
  ariaLabel = "Who Kevin was",
}) {
  const stackRef = useRef(null);
  const cardRefs = useRef([]);
  const queueRef = useRef([]);
  const animatingRef = useRef(false);
  const wheelAccRef = useRef(0);
  const pointerRef = useRef({ active: false, x: 0, y: 0, id: null });

  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);

  const items = useMemo(
    () =>
      (Array.isArray(slides) ? slides : [])
        .map((item, index) => ({
          id: item?.id ?? `kevin-slide-${index}`,
          src: item?.src || item?.imageUrl || "",
          alt: item?.alt || item?.imageAlt || item?.header || `Photo ${index + 1}`,
          header: item?.header || "",
          body: item?.body || "",
          bodyParagraphs: Array.isArray(item?.bodyParagraphs)
            ? item.bodyParagraphs
            : String(item?.body || "")
                .split(/\n+/)
                .map((p) => p.trim())
                .filter(Boolean),
        }))
        .filter((item) => item.src),
    [slides],
  );

  const count = items.length;
  const active = items[activeIndex] || items[0] || null;

  const paint = useCallback(
    (queue, stepProgress = 0, animate = false) => {
      const cards = cardRefs.current;
      const layout = stackLayout({
        queueLength: queue.length,
        stepProgress,
        visibleCount,
        scaleStep: DEFAULT_SCALE_STEP,
        staggerX: staggerXForViewport(),
        staggerY: DEFAULT_STAGGER_Y,
        backOpacity: DEFAULT_BACK_OPACITY,
        exitX: 28,
        exitY: 36,
        exitScale: 1.04,
      });

      layout.forEach((slot) => {
        const imageIndex = queue[slot.queueIndex];
        const card = cards[imageIndex];
        if (!card) return;

        const props = {
          x: slot.x,
          y: slot.y,
          scale: slot.scale,
          opacity: slot.opacity,
          zIndex: slot.zIndex,
          visibility: slot.opacity > 0.001 ? "visible" : "hidden",
          force3D: true,
          transformOrigin: "bottom center",
        };

        if (animate && !prefersReducedMotion()) {
          gsap.to(card, {
            ...props,
            duration: TRANSITION_MS / 1000,
            ease: "power2.out",
            overwrite: "auto",
          });
        } else {
          gsap.set(card, props);
        }
      });
    },
    [visibleCount],
  );

  const syncFromIndex = useCallback(
    (index, { animate = false } = {}) => {
      if (count < 1) return;
      const next = ((index % count) + count) % count;
      const queue = rotateQueue(
        items.map((_, i) => i),
        next,
      );
      queueRef.current = queue;
      setActiveIndex(next);
      paint(queue, 0, animate);
    },
    [count, items, paint],
  );

  const step = useCallback(
    (direction) => {
      if (count < 2 || animatingRef.current) return;
      const dir = direction >= 0 ? 1 : -1;

      if (prefersReducedMotion()) {
        syncFromIndex(activeIndex + dir, { animate: false });
        return;
      }

      animatingRef.current = true;
      const fromQueue = queueRef.current.length
        ? [...queueRef.current]
        : rotateQueue(
            items.map((_, i) => i),
            activeIndex,
          );

      // Animate through exit progress, then snap to advanced queue.
      const proxy = { p: 0 };
      const exitQueue =
        dir > 0
          ? fromQueue
          : // Reverse: treat previous front as exiting by rotating back first,
            // then animate as if advancing from that state… simpler: jump paint.
            rotateQueue(fromQueue, count - 1);

      if (dir < 0) {
        // Instant settle on previous front (no reverse exit choreography).
        const nextIndex = (activeIndex - 1 + count) % count;
        syncFromIndex(nextIndex, { animate: true });
        window.setTimeout(() => {
          animatingRef.current = false;
        }, TRANSITION_MS);
        return;
      }

      paint(fromQueue, 0, false);
      gsap.to(proxy, {
        p: 1,
        duration: TRANSITION_MS / 1000,
        ease: "power2.inOut",
        onUpdate() {
          paint(fromQueue, proxy.p, false);
        },
        onComplete() {
          const advanced = advanceQueue(fromQueue);
          queueRef.current = advanced;
          const front = advanced[0];
          setActiveIndex(front);
          paint(advanced, 0, false);
          animatingRef.current = false;
        },
      });

      void exitQueue;
    },
    [activeIndex, count, items, paint, syncFromIndex],
  );

  useEffect(() => {
    if (count < 1) return undefined;

    function measure() {
      setVisibleCount(visibleCountForViewport());
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [count]);

  useEffect(() => {
    if (count < 1) return;
    syncFromIndex(0, { animate: false });
  }, [count, visibleCount]); // eslint-disable-line react-hooks/exhaustive-deps -- remount layout on breakpoint

  useEffect(() => {
    const stack = stackRef.current;
    if (!stack || count < 2) return undefined;

    function onWheel(event) {
      // Prefer horizontal or dominant axis; keep page scroll when mostly vertical
      // and the gesture is soft.
      const absX = Math.abs(event.deltaX);
      const absY = Math.abs(event.deltaY);
      if (absY > absX && absY < 28) return;

      event.preventDefault();
      wheelAccRef.current += absX >= absY ? event.deltaX : event.deltaY;
      if (Math.abs(wheelAccRef.current) < WHEEL_THRESHOLD) return;
      const dir = wheelAccRef.current > 0 ? 1 : -1;
      wheelAccRef.current = 0;
      step(dir);
    }

    function onPointerDown(event) {
      if (event.button != null && event.button !== 0) return;
      pointerRef.current = {
        active: true,
        x: event.clientX,
        y: event.clientY,
        id: event.pointerId,
      };
      try {
        stack.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    }

    function onPointerUp(event) {
      const state = pointerRef.current;
      if (!state.active) return;
      pointerRef.current = { active: false, x: 0, y: 0, id: null };
      try {
        stack.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
      const dx = event.clientX - state.x;
      const dy = event.clientY - state.y;
      if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) < Math.abs(dy)) return;
      step(dx < 0 ? 1 : -1);
    }

    function onPointerCancel() {
      pointerRef.current = { active: false, x: 0, y: 0, id: null };
    }

    stack.addEventListener("wheel", onWheel, { passive: false });
    stack.addEventListener("pointerdown", onPointerDown);
    stack.addEventListener("pointerup", onPointerUp);
    stack.addEventListener("pointercancel", onPointerCancel);

    return () => {
      stack.removeEventListener("wheel", onWheel);
      stack.removeEventListener("pointerdown", onPointerDown);
      stack.removeEventListener("pointerup", onPointerUp);
      stack.removeEventListener("pointercancel", onPointerCancel);
    };
  }, [count, step]);

  if (count < 1 || !active) return null;

  const bodyParagraphs =
    active.bodyParagraphs?.length > 0
      ? active.bodyParagraphs
      : active.body
        ? [active.body]
        : [];

  return (
    <div className="kpf-history__split" data-kpf-kevin-carousel="">
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
        <div className="kpf-history__stage">
          {items.map((slide, index) => (
            <figure
              key={slide.id}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              className="kpf-history__layer"
              data-stack-index={index}
              aria-hidden={index !== activeIndex}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={slide.src}
                alt={slide.alt}
                width={1120}
                height={1296}
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </figure>
          ))}
        </div>

        <div className="kpf-history__dots" role="group" aria-label="History slides">
          {items.map((slide, i) => (
            <button
              key={`history-dot-${slide.id}`}
              type="button"
              className={`kpf-history__dot${i === activeIndex ? " is-active" : ""}`}
              aria-label={`Show slide ${i + 1} of ${count}: ${slide.header || slide.alt}`}
              aria-current={i === activeIndex ? "true" : undefined}
              onClick={() => {
                if (i === activeIndex || animatingRef.current) return;
                syncFromIndex(i, { animate: true });
              }}
            />
          ))}
        </div>
      </div>

      <div className="kpf-history__aside">
        <div className="kpf-history__card">
          <div className="kpf-content-block">
            <div className="kpf-content-block__copy">
              <div className="kpf-content-block__title-group">
                {cardEyebrow ? (
                  <p className="kpf-content-block__eyebrow">{cardEyebrow}</p>
                ) : null}
                <h3 className="kpf-content-block__title kpf-content-block__title--h3">
                  {active.header}
                </h3>
              </div>
              {bodyParagraphs.length > 0 ? (
                <div className="kpf-content-block__body-group">
                  {bodyParagraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 48)} className="kpf-content-block__body">
                      {paragraph}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
