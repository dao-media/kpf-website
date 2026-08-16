import { useCallback, useState } from "react";
import { ArrowRight, CalendarHeart, Gift } from "lucide-react";

function canHoverFlip() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * Grantee flip card — photo front; hover (desktop) or tap (mobile) reveals `.kpf-card` info.
 * Previous photo-pop variant: `archive/GranteeCardPhotoPop.js`.
 *
 * When `flipped` + `onFlipChange` are provided (grid), flip is exclusive across cards.
 */
export default function GranteeCard({
  name,
  body,
  date,
  amount,
  logoUrl,
  photoUrl,
  photoAlt = "",
  href,
  featured = false,
  className = "",
  flipped: flippedProp,
  onFlipChange,
}) {
  const controlled = typeof flippedProp === "boolean";
  const [internalFlipped, setInternalFlipped] = useState(false);
  const flipped = controlled ? flippedProp : internalFlipped;

  const setFlipped = useCallback(
    (next) => {
      if (controlled) {
        onFlipChange?.(next);
      } else {
        setInternalFlipped(next);
      }
    },
    [controlled, onFlipChange],
  );

  const onPointerActivate = useCallback(
    (event) => {
      // Desktop: CSS hover handles flip; don't fight it with click state.
      if (canHoverFlip()) return;
      // Website chip handles its own navigation.
      if (event.target.closest?.("a[href]")) return;
      event.preventDefault();
      setFlipped(!flipped);
    },
    [flipped, setFlipped],
  );

  if (!name) return null;

  const hasPhoto = Boolean(photoUrl);
  const classes = [
    "kpf-grantee-card",
    "kpf-grantee-card--flip",
    hasPhoto ? "kpf-grantee-card--has-photo" : "kpf-grantee-card--info-only",
    flipped ? "is-flipped" : "",
    featured ? "is-featured" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const front = hasPhoto ? (
    <div className="kpf-grantee-card__face kpf-grantee-card__face--front">
      <img
        className="kpf-grantee-card__photo"
        src={photoUrl}
        alt={photoAlt || name}
        loading="lazy"
        decoding="async"
      />
    </div>
  ) : (
    <div className="kpf-grantee-card__face kpf-grantee-card__face--front kpf-grantee-card__face--fallback">
      {logoUrl ? (
        <img
          className="kpf-grantee-card__logo kpf-grantee-card__logo--hero"
          src={logoUrl}
          alt=""
          loading="lazy"
          decoding="async"
        />
      ) : (
        <h3 className="kpf-h3 kpf-grantee-card__name">{name}</h3>
      )}
    </div>
  );

  const back = (
    <div className="kpf-grantee-card__face kpf-grantee-card__face--back">
      <article className="kpf-card kpf-grantee-card__info">
        <div className="kpf-card__body">
          <div className="kpf-grantee-card__copy">
            {logoUrl ? (
              <img
                className="kpf-grantee-card__logo"
                src={logoUrl}
                alt=""
                width={84}
                height={84}
                loading="lazy"
                decoding="async"
              />
            ) : null}
            <h3 className="kpf-h3 kpf-grantee-card__name">{name}</h3>
            {body ? <p className="kpf-body--l kpf-grantee-card__description">{body}</p> : null}
          </div>

          <div className="kpf-grantee-card__meta">
            {amount ? (
              <span className="kpf-grantee-card__chip">
                <span className="kpf-grantee-card__chip-icon" aria-hidden="true">
                  <Gift size={20} strokeWidth={1.75} absoluteStrokeWidth />
                </span>
                <span className="kpf-grantee-card__chip-label">{amount}</span>
              </span>
            ) : null}
            {date ? (
              <span className="kpf-grantee-card__chip">
                <span className="kpf-grantee-card__chip-icon" aria-hidden="true">
                  <CalendarHeart size={20} strokeWidth={1.75} absoluteStrokeWidth />
                </span>
                <span className="kpf-grantee-card__chip-label">{date}</span>
              </span>
            ) : null}
            {href ? (
              <a
                className="kpf-grantee-card__chip kpf-grantee-card__chip--link"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                <span className="kpf-grantee-card__chip-label">Website</span>
                <span className="kpf-grantee-card__chip-icon" aria-hidden="true">
                  <ArrowRight size={16} strokeWidth={1.75} absoluteStrokeWidth />
                </span>
              </a>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  );

  return (
    <div
      className={classes}
      tabIndex={0}
      role="group"
      aria-expanded={flipped}
      aria-label={name}
      onClick={onPointerActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setFlipped(!flipped);
        } else if (event.key === "Escape" && flipped) {
          event.preventDefault();
          setFlipped(false);
        }
      }}
    >
      <div className="kpf-grantee-card__flipper">
        {front}
        {back}
      </div>
    </div>
  );
}
