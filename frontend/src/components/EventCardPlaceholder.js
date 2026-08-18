/**
 * Empty-slot stand-in for the Events library grid.
 * Same outer shape as EventCard; dashed inset border, no fill.
 */
export default function EventCardPlaceholder({
  quiet = false,
  title = "COMING SOON",
  body = "Check back for new events!",
}) {
  return (
    <article
      className={[
        "kpf-event-card",
        "kpf-event-card--placeholder",
        quiet ? "kpf-event-card--placeholder-quiet" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={quiet ? true : undefined}
    >
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
  if (cols <= 1 || count <= 0) return 0;
  const rem = count % cols;
  return rem === 0 ? 0 : cols - rem;
}
