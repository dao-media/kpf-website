import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { HOME } from "@/lib/pageCopy";

const AUTO_MS = 3000;
const TRANSITION_MS = 650;
const GAP_PX = 16;
/** Mobile: visible sliver of the next/prev card past the active card. */
const PEEK_PX = 24;

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

/**
 * Build stop offsets: start at 0 (first card left-aligned), step one card,
 * and always finish at maxOffset (last card right-aligned).
 */
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
 * Grantee chip slider — Figma Section / Partners `426:477`.
 * Shows 4 / 3 / 1 cards (desktop / tablet / mobile with edge peeks).
 * Advances one card at a time until the last card is right-aligned, then loops to the start.
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
  const [index, setIndex] = useState(0);
  const [offsets, setOffsets] = useState([0]);
  const [visible, setVisible] = useState(4);

  const chips = Array.isArray(items) ? items.filter((item) => item?.logoUrl && item?.name) : [];
  const slideCount = offsets.length;

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track || chips.length < 1) {
      setOffsets([0]);
      setIndex(0);
      setVisible(4);
      return undefined;
    }

    function measure() {
      const nextVisible = visibleCountForViewport();
      const gap = GAP_PX;
      let chipWidth;

      if (nextVisible === 1) {
        // Full-bleed mobile: first card left-aligned, last card right-aligned,
        // with a small neighbor peek on the free edge.
        chipWidth = Math.max(180, viewport.clientWidth - PEEK_PX - gap);
      } else {
        chipWidth = Math.max(
          120,
          (viewport.clientWidth - (nextVisible - 1) * gap) / nextVisible,
        );
      }

      track.style.paddingInline = "0px";
      track.style.setProperty("--kpf-partners-chip-width", `${chipWidth}px`);

      const step = Math.max(1, Math.round(chipWidth + gap));
      const maxOffset = Math.max(0, Math.round(track.scrollWidth - viewport.clientWidth));
      const nextOffsets = buildOffsets(step, maxOffset);

      setVisible(nextVisible);
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
  }, [chips.length]);

  useEffect(() => {
    if (slideCount <= 1 || prefersReducedMotion()) return undefined;

    // Restart whenever `index` changes (auto or dot click) so the countdown
    // always gets a full AUTO_MS after a manual page change.
    const id = window.setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      // After the last (right-aligned) stop, reload to the first card on the left.
      setIndex((current) => (current + 1) % slideCount);
    }, AUTO_MS);

    return () => window.clearInterval(id);
  }, [slideCount, index]);

  if (chips.length < 1) return null;

  const offset = offsets[Math.min(index, slideCount - 1)] ?? 0;
  const dots = offsets.map((_, i) => i);

  return (
    <section
      className="kpf-partners kpf-section"
      aria-labelledby={labelId}
      data-kpf-partners-visible={visible}
    >
      <div className="kpf-u-container kpf-partners__inner">
        <p id={labelId} className="kpf-partners__label">
          {label}
        </p>

        <div
          ref={viewportRef}
          className="kpf-partners__viewport"
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
          <div
            ref={trackRef}
            className="kpf-partners__track"
            style={{
              transform: `translate3d(-${offset}px, 0, 0)`,
              transitionDuration: `${TRANSITION_MS}ms`,
            }}
          >
            {chips.map((item) => {
              const content = (
                <>
                  <img
                    className="kpf-partners__logo"
                    src={item.logoUrl}
                    alt=""
                    width={40}
                    height={40}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className="kpf-partners__name">{item.name}</span>
                </>
              );

              if (href) {
                return (
                  <Link
                    key={item.id}
                    className="kpf-partners__chip"
                    href={href}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div key={item.id} className="kpf-partners__chip">
                  {content}
                </div>
              );
            })}
          </div>
        </div>

        {slideCount > 1 ? (
          <div className="kpf-partners__dots" role="group" aria-label="Grantee slider pages">
            {dots.map((dotIndex) => (
              <button
                key={dotIndex}
                type="button"
                className={
                  dotIndex === index
                    ? "kpf-partners__dot is-active"
                    : "kpf-partners__dot"
                }
                aria-label={`Show grantee ${dotIndex + 1} of ${slideCount}`}
                aria-current={dotIndex === index ? "true" : undefined}
                onClick={() => setIndex(dotIndex)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
