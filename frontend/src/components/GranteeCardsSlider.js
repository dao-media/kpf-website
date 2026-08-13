import { useEffect, useId, useRef, useState } from "react";
import GranteeCard from "@/components/GranteeCard";

const AUTO_MS = 4500;
const TRANSITION_MS = 650;
const GAP_PX = 20;
const PEEK_PX = 28;
/** Figma desktop card width (849:2195). */
const DESKTOP_CARD_PX = 364;
/** Figma tablet card width (846:776). */
const TABLET_CARD_PX = 284;

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function visibleCountForViewport() {
  if (typeof window === "undefined" || !window.matchMedia) return 3;
  if (window.matchMedia("(min-width: 64rem)").matches) return 3;
  if (window.matchMedia("(min-width: 48rem)").matches) return 2;
  return 1;
}

function cardWidthForViewport(viewportWidth, visible) {
  if (visible === 1) {
    return Math.max(260, viewportWidth - PEEK_PX - GAP_PX);
  }
  const target = visible >= 3 ? DESKTOP_CARD_PX : TABLET_CARD_PX;
  const maxFit = (viewportWidth - (visible - 1) * GAP_PX) / visible;
  return Math.max(240, Math.min(target, maxFit));
}

function buildOffsets(stepPx, maxOffset) {
  if (maxOffset <= 0) return [0];

  const stops = [];
  for (let offset = 0; offset < maxOffset; offset += stepPx) {
    stops.push(offset);
  }

  const last = stops[stops.length - 1];
  if (last == null || Math.abs(maxOffset - last) > 1) {
    stops.push(maxOffset);
  } else {
    stops[stops.length - 1] = maxOffset;
  }

  return stops;
}

/**
 * About-page grantee cards carousel — Figma 849:2195 / 846:776.
 */
export default function GranteeCardsSlider({ items = [], label = "Grantee cards" }) {
  const labelId = `kpf-grantees-slider-${useId().replace(/:/g, "")}`;
  const viewportRef = useRef(null);
  const trackRef = useRef(null);
  const pausedRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [offsets, setOffsets] = useState([0]);

  const cards = Array.isArray(items) ? items.filter((item) => item?.name) : [];
  const slideCount = offsets.length;

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || cards.length < 1) {
      setOffsets([0]);
      setIndex(0);
      return undefined;
    }

    function measure() {
      const nextVisible = visibleCountForViewport();
      const cardWidth = cardWidthForViewport(viewport.clientWidth, nextVisible);

      track.style.setProperty("--kpf-grantee-card-width", `${cardWidth}px`);

      const step = Math.max(1, Math.round(cardWidth + GAP_PX));
      const maxOffset = Math.max(0, Math.round(track.scrollWidth - viewport.clientWidth));
      const nextOffsets = buildOffsets(step, maxOffset);

      setOffsets(nextOffsets);
      setIndex((current) => Math.min(current, nextOffsets.length - 1));
    }

    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(viewport);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [cards.length]);

  useEffect(() => {
    if (slideCount <= 1 || prefersReducedMotion()) return undefined;

    const id = window.setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      setIndex((current) => (current + 1) % slideCount);
    }, AUTO_MS);

    return () => window.clearInterval(id);
  }, [slideCount, index]);

  if (cards.length < 1) return null;

  const offset = offsets[Math.min(index, slideCount - 1)] ?? 0;

  return (
    <div
      className="kpf-grantees__slider"
      aria-labelledby={labelId}
      onMouseEnter={() => {
        pausedRef.current = true;
      }}
      onMouseLeave={() => {
        pausedRef.current = false;
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
      <p id={labelId} className="kpf-u-sr-only">
        {label}
      </p>
      <div ref={viewportRef} className="kpf-grantees__viewport">
        <div
          ref={trackRef}
          className="kpf-grantees__track"
          style={{
            transform: `translate3d(-${offset}px, 0, 0)`,
            transitionDuration: `${TRANSITION_MS}ms`,
          }}
        >
          {cards.map((item) => (
            <GranteeCard key={item.id || item.name} {...item} />
          ))}
        </div>
      </div>

      {slideCount > 1 ? (
        <div className="kpf-grantees__dots" role="tablist" aria-label="Grantee slides">
          {offsets.map((_, dotIndex) => (
            <button
              key={dotIndex}
              type="button"
              role="tab"
              className={dotIndex === index ? "is-active" : undefined}
              aria-label={`Show grantee slide ${dotIndex + 1} of ${slideCount}`}
              aria-selected={dotIndex === index}
              onClick={() => setIndex(dotIndex)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
