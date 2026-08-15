import { ArrowUpRightFromSquare, BadgeDollarSign, Calendar } from "lucide-react";

/**
 * ARCHIVED — photo-pop grantee card (info body + hover photo below).
 * Active flip card: ../GranteeCard.js
 * Matching CSS: ../../styles/archive/grantee-card-photo-pop.css (not imported).
 *
 * Figma 849:2104 (default) / hover photo pop-out below body.
 *
 * @param {object} props
 * @param {string} props.name
 * @param {string} [props.body]
 * @param {string} [props.date]
 * @param {string} [props.amount]
 * @param {string} [props.logoUrl]
 * @param {string} [props.photoUrl]
 * @param {string} [props.photoAlt]
 * @param {string} [props.href]
 * @param {boolean} [props.featured]
 * @param {string} [props.className]
 */
export default function GranteeCardPhotoPop({
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
  if (!name) return null;

  const hasPhoto = Boolean(photoUrl);
  const classes = [
    "kpf-grantee-card",
    hasPhoto ? "kpf-grantee-card--has-photo" : "",
    featured ? "is-featured" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {hasPhoto ? (
        <div className="kpf-grantee-card__media" aria-hidden="true">
          <img
            className="kpf-grantee-card__photo"
            src={photoUrl}
            alt={photoAlt}
            loading="lazy"
            decoding="async"
          />
          <div className="kpf-grantee-card__media-fade" />
        </div>
      ) : null}

      <div className="kpf-grantee-card__body">
        <div className="kpf-grantee-card__header">
          <h3 className="kpf-grantee-card__name">{name}</h3>
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

        {body ? <p className="kpf-grantee-card__copy">{body}</p> : null}

        <div className="kpf-grantee-card__meta">
          {date ? (
            <span className="kpf-grantee-card__chip">
              <Calendar size={16} strokeWidth={1.75} absoluteStrokeWidth aria-hidden="true" />
              <span>{date}</span>
            </span>
          ) : null}
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
          {href ? (
            <span className="kpf-grantee-card__chip kpf-grantee-card__chip--link" aria-hidden="true">
              <ArrowUpRightFromSquare size={16} strokeWidth={1.75} absoluteStrokeWidth />
            </span>
          ) : null}
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <a
        className={classes}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${name} website (opens in a new tab)`}
      >
        {content}
      </a>
    );
  }

  return <div className={classes}>{content}</div>;
}
