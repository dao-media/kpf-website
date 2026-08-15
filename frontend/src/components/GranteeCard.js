import { useCallback, useState } from "react";
import { BadgeDollarSign, Calendar } from "lucide-react";

/**
 * Grantee flip card — photo front; hover/focus rotates on Y to reveal `.kpf-card` info.
 * Previous photo-pop variant: `archive/GranteeCardPhotoPop.js`.
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
}) {
  const [flipped, setFlipped] = useState(false);

  const onPointerActivate = useCallback(
    (event) => {
      if (typeof window === "undefined") return;
      // Touch / no-hover: first tap flips; second tap can follow the CTA.
      if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        if (!flipped) {
          event.preventDefault();
          setFlipped(true);
        }
      }
    },
    [flipped],
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
        <h3 className="kpf-grantee-card__name">{name}</h3>
      )}
    </div>
  );

  const back = (
    <div className="kpf-grantee-card__face kpf-grantee-card__face--back">
      <article className="kpf-card kpf-grantee-card__info">
        <div className="kpf-card__body">
          <div className="kpf-grantee-card__header">
            <div className="kpf-grantee-card__title-group">
              <h3 className="kpf-card__title kpf-grantee-card__name">{name}</h3>
            </div>
            {logoUrl ? (
              <img
                className="kpf-grantee-card__logo"
                src={logoUrl}
                alt=""
                width={42}
                height={42}
                loading="lazy"
                decoding="async"
              />
            ) : null}
          </div>

          {body ? <p className="kpf-card__description kpf-body--l">{body}</p> : null}

          <div className="kpf-card__actions kpf-grantee-card__meta">
            {amount ? (
              <span className="kpf-grantee-card__chip">
                <BadgeDollarSign
                  size={16}
                  strokeWidth={1.75}
                  absoluteStrokeWidth
                  aria-hidden="true"
                />
                <span>{amount}</span>
              </span>
            ) : null}
            {date ? (
              <span className="kpf-grantee-card__chip">
                <Calendar size={16} strokeWidth={1.75} absoluteStrokeWidth aria-hidden="true" />
                <span>{date}</span>
              </span>
            ) : null}
            {href ? (
              <a
                className="kpf-link kpf-grantee-card__link"
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => event.stopPropagation()}
              >
                Visit site
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
      aria-label={name}
      onClick={onPointerActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          setFlipped((value) => !value);
        } else if (event.key === "Escape") {
          setFlipped(false);
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
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
