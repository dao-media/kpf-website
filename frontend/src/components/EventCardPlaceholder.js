import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

const DASH = 14;
const GAP = 10;
const CYCLE = DASH + GAP;
const DESKTOP_HOVER_MQ =
  "(hover: hover) and (pointer: fine) and (min-width: 64rem)";

/**
 * Empty-slot stand-in for the Events library grid.
 * Same outer shape as EventCard; dashed inset border, no fill.
 * Desktop (fine pointer): hover marches the dashes around the perimeter.
 */
export default function EventCardPlaceholder({
  quiet = false,
  title = "COMING SOON",
  body = "Check back for new events!",
}) {
  const cardRef = useRef(null);
  const pathRef = useRef(null);

  useLayoutEffect(() => {
    const card = cardRef.current;
    const path = pathRef.current;
    if (!card || !path) return undefined;

    const mm = gsap.matchMedia();
    mm.add(
      {
        desktopHover: DESKTOP_HOVER_MQ,
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { desktopHover, reduceMotion } = context.conditions;
        if (!desktopHover || reduceMotion) return undefined;

        gsap.set(path, {
          strokeDasharray: `${DASH} ${GAP}`,
          strokeDashoffset: 0,
        });

        const tween = gsap.to(path, {
          strokeDashoffset: -CYCLE,
          duration: 0.8,
          ease: "none",
          repeat: -1,
          paused: true,
        });

        const play = () => tween.play();
        const pause = () => tween.pause();
        card.addEventListener("mouseenter", play);
        card.addEventListener("mouseleave", pause);

        return () => {
          card.removeEventListener("mouseenter", play);
          card.removeEventListener("mouseleave", pause);
        };
      },
      card,
    );

    return () => mm.revert();
  }, []);

  return (
    <article
      ref={cardRef}
      className={[
        "kpf-event-card",
        "kpf-event-card--placeholder",
        quiet ? "kpf-event-card--placeholder-quiet" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={quiet ? true : undefined}
    >
      <svg className="kpf-event-card__ants" aria-hidden="true" focusable="false">
        <rect
          ref={pathRef}
          className="kpf-event-card__ants-path"
          x="1.5"
          y="1.5"
          rx="14.5"
          ry="14.5"
        />
      </svg>
      {quiet ? null : (
        <div className="kpf-event-card__placeholder-inner">
          <h3 className="kpf-event-card__placeholder-title">{title}</h3>
          <p className="kpf-event-card__placeholder-body">{body}</p>
        </div>
      )}
    </article>
  );
}

/**
 * How many placeholders to append so the last row is full.
 * Desktop 3 · tablet / mobile-landscape 2 · mobile portrait 0.
 * @param {number} eventCount
 * @param {number} columns
 */
export function eventLibraryPlaceholderCount(eventCount, columns) {
  const count = Math.max(0, Number(eventCount) || 0);
  const cols = Math.max(0, Math.floor(Number(columns) || 0));
  if (cols <= 1) return 0;
  if (count <= 0) return cols;
  const rem = count % cols;
  return rem === 0 ? 0 : cols - rem;
}
