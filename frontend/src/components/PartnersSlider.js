import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import { HOME } from "@/lib/pageCopy";

const AUTO_MS = 3000;
const TRANSITION_MS = 650;
const GAP_PX = 16;
/** Mobile portrait: card is 80% of the rail so prev/next peek on both sides. */
const MOBILE_CHIP_RATIO = 0.8;
/** Three copies so the middle set always has a neighbor on both sides. */
const LOOP_COPIES = 3;
const SWIPE_THRESHOLD_PX = 40;

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function visibleCountForViewport() {
  if (typeof window === "undefined" || !window.matchMedia) return 4;
  if (window.matchMedia("(min-width: 64rem)").matches) return 4;
  if (window.matchMedia("(min-width: 48rem)").matches) return 3;
  return 1;
}

function logicalIndex(index, count) {
  if (count < 1) return 0;
  return ((index % count) + count) % count;
}

/** Keep the track in the middle copy after a loop animation finishes. */
function wrapLoopIndex(index, count) {
  if (count < 2) return index;
  let next = index;
  while (next >= count * 2) next -= count;
  while (next < count) next += count;
  return next;
}

function loopedChips(chips) {
  if (chips.length < 2) return chips.map((item) => ({ item, loopKey: `0-${item.id}` }));
  const out = [];
  for (let copy = 0; copy < LOOP_COPIES; copy += 1) {
    for (const item of chips) {
      out.push({ item, loopKey: `${copy}-${item.id}` });
    }
  }
  return out;
}

/**
 * Grantee chip slider — Figma Section / Partners `426:477`.
 * Shows 4 / 3 / 1 cards (desktop / tablet / mobile with 80% card + edge peeks).
 * Loops the track so autoplay and touch swipes never jump back to the start.
 */
export default function PartnersSlider({
  items = [],
  label = "Kevin Popke Foundation Grantees",
  href = HOME.partners.href,
}) {
  const labelId = `kpf-partners-${useId().replace(/:/g, "")}`;
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const pausedRef = useRef(false);
  const indexRef = useRef(0);
  const stepRef = useRef(0);
  const countRef = useRef(0);
  const suppressClickRef = useRef(false);
  const dragRef = useRef({
    pointerId: null,
    startX: 0,
    startY: 0,
    deltaX: 0,
    axis: null,
  });

  const chips = Array.isArray(items) ? items.filter((item) => item?.logoUrl && item?.name) : [];
  const count = chips.length;
  const looping = count >= 2;
  const slides = loopedChips(chips);

  const [index, setIndex] = useState(() => (count >= 2 ? count : 0));
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(4);
  const [animate, setAnimate] = useState(true);
  const [dragX, setDragX] = useState(0);

  indexRef.current = index;
  stepRef.current = step;
  countRef.current = count;

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || count < 1) {
      setStep(0);
      setIndex(0);
      setVisible(4);
      return undefined;
    }

    function measure() {
      const nextVisible = visibleCountForViewport();
      const gap = GAP_PX;
      let chipWidth;

      if (nextVisible === 1) {
        const viewW = viewport.clientWidth;
        chipWidth = Math.max(180, Math.round(viewW * MOBILE_CHIP_RATIO));
        const sideInset = Math.max(0, (viewW - chipWidth) / 2);
        track.style.paddingInline = `${sideInset}px`;
      } else {
        chipWidth = Math.max(
          120,
          (viewport.clientWidth - (nextVisible - 1) * gap) / nextVisible,
        );
        track.style.paddingInline = "0px";
      }

      track.style.setProperty("--kpf-partners-chip-width", `${chipWidth}px`);

      const nextStep = Math.max(1, Math.round(chipWidth + gap));
      setVisible(nextVisible);
      setStep(nextStep);
      setIndex((current) => (count >= 2 ? count + logicalIndex(current, count) : 0));
    }

    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(viewport);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [count]);

  useEffect(() => {
    if (!looping || prefersReducedMotion()) return undefined;

    const id = window.setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      setAnimate(true);
      setIndex((current) =>
        prefersReducedMotion()
          ? wrapLoopIndex(current + 1, countRef.current)
          : current + 1,
      );
    }, AUTO_MS);

    return () => window.clearInterval(id);
  }, [looping]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !looping) return undefined;

    function onTransitionEnd(event) {
      if (event.target !== track || event.propertyName !== "transform") return;
      const wrapped = wrapLoopIndex(indexRef.current, countRef.current);
      if (wrapped === indexRef.current) return;
      setAnimate(false);
      setIndex(wrapped);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          setAnimate(true);
        });
      });
    }

    track.addEventListener("transitionend", onTransitionEnd);
    return () => track.removeEventListener("transitionend", onTransitionEnd);
  }, [looping]);

  if (count < 1) return null;

  const offset = index * step - dragX;
  const activeLogical = logicalIndex(index, count);
  const motionOff = prefersReducedMotion();
  const durationMs = animate && dragX === 0 && !motionOff ? TRANSITION_MS : 0;

  function isSwipePointer(event) {
    return event.pointerType === "touch" || event.pointerType === "pen";
  }

  function onPointerDown(event) {
    if (!looping || !isSwipePointer(event)) return;
    pausedRef.current = true;
    suppressClickRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      deltaX: 0,
      axis: null,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event) {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.axis) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
      drag.axis = Math.abs(deltaX) >= Math.abs(deltaY) ? "x" : "y";
      if (drag.axis === "y") return;
    }
    if (drag.axis !== "x") return;

    drag.deltaX = deltaX;
    if (Math.abs(deltaX) > 8) suppressClickRef.current = true;
    setAnimate(false);
    setDragX(deltaX);
  }

  function onPointerUp(event) {
    const drag = dragRef.current;
    if (drag.pointerId !== event.pointerId) return;
    drag.pointerId = null;
    pausedRef.current = false;

    const deltaX = drag.axis === "x" ? drag.deltaX : 0;
    const threshold = Math.max(SWIPE_THRESHOLD_PX, stepRef.current * 0.2);
    setDragX(0);
    setAnimate(true);
    const instant = prefersReducedMotion();
    if (deltaX > threshold) {
      setIndex((current) =>
        instant ? wrapLoopIndex(current - 1, countRef.current) : current - 1,
      );
    } else if (deltaX < -threshold) {
      setIndex((current) =>
        instant ? wrapLoopIndex(current + 1, countRef.current) : current + 1,
      );
    }
    drag.axis = null;
    drag.deltaX = 0;
  }

  function onClickCapture(event) {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
  }

  function goToLogical(target) {
    if (!looping) {
      setIndex(target);
      return;
    }
    const current = indexRef.current;
    const currentLogical = logicalIndex(current, count);
    let delta = target - currentLogical;
    if (delta > count / 2) delta -= count;
    if (delta < -count / 2) delta += count;
    setAnimate(true);
    setIndex(current + delta);
  }

  function renderChip(item, loopKey) {
    const content = (
      <>
        <img
          className="kpf-partners__logo"
          src={item.logoUrl}
          alt={item.logoAlt || item.name}
          width={40}
          height={40}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
        <span className="kpf-partners__name" aria-hidden="true">
          {item.name}
        </span>
      </>
    );

    if (href) {
      return (
        <Link key={loopKey} className="kpf-partners__chip" href={href} draggable={false}>
          {content}
        </Link>
      );
    }

    return (
      <div key={loopKey} className="kpf-partners__chip">
        {content}
      </div>
    );
  }

  return (
    <section
      className="kpf-partners kpf-section"
      aria-labelledby={labelId}
      data-kpf-partners-visible={visible}
      data-kpf-partners-loop={looping ? "true" : "false"}
    >
      <div className="kpf-u-container kpf-partners__inner">
        <p id={labelId} className="kpf-partners__label">
          {label}
        </p>

        <div
          ref={viewportRef}
          className="kpf-partners__viewport"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={onClickCapture}
          onMouseEnter={() => {
            if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
              pausedRef.current = true;
            }
          }}
          onMouseLeave={() => {
            if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
              pausedRef.current = false;
            }
          }}
          onFocusCapture={() => {
            pausedRef.current = true;
          }}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              pausedRef.current = false;
            }
          }}
        >
          <div
            ref={trackRef}
            className="kpf-partners__track"
            style={{
              transform: `translate3d(${-offset}px, 0, 0)`,
              transitionDuration: `${durationMs}ms`,
            }}
          >
            {slides.map(({ item, loopKey }) => renderChip(item, loopKey))}
          </div>
        </div>

        {looping ? (
          <div className="kpf-partners__dots" role="group" aria-label="Grantee slider pages">
            {chips.map((item, dotIndex) => (
              <button
                key={item.id}
                type="button"
                className={
                  dotIndex === activeLogical
                    ? "kpf-partners__dot is-active"
                    : "kpf-partners__dot"
                }
                aria-label={`Show ${item.name}`}
                aria-current={dotIndex === activeLogical ? "true" : undefined}
                onClick={() => goToLogical(dotIndex)}
              />
            ))}
          </div>
        ) : (
          <div className="kpf-partners__dots" aria-hidden="true" />
        )}
      </div>
    </section>
  );
}
