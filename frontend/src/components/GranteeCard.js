import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ArrowRight, CalendarHeart, Gift } from "lucide-react";

function canHoverFlip() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * Dominant pointer edge relative to the card (enter or leave).
 * Uses axis dominance (not nearest-edge) so corners stay L/R or U/D — never a blend.
 * When the pointer is outside (leave), prefers the side that was crossed.
 * @param {PointerEvent | MouseEvent} event
 * @param {Element} [el]
 * @returns {"top" | "right" | "bottom" | "left"}
 */
function getPointerEdge(event, el = event.currentTarget) {
  if (!el?.getBoundingClientRect) return "left";
  const rect = el.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return "left";

  const { clientX: x, clientY: y } = event;
  const outsideX = x < rect.left || x > rect.right;
  const outsideY = y < rect.top || y > rect.bottom;
  if (outsideX || outsideY) {
    const ox = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
    const oy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0;
    if (ox >= oy && ox > 0) return x < rect.left ? "left" : "right";
    if (oy > 0) return y < rect.top ? "top" : "bottom";
  }

  // Inside (or flush on edge): normalize to card center — -0.5…0.5 on each axis.
  const nx = (x - rect.left) / rect.width - 0.5;
  const ny = (y - rect.top) / rect.height - 0.5;
  if (Math.abs(nx) > Math.abs(ny)) {
    return nx < 0 ? "left" : "right";
  }
  return ny < 0 ? "top" : "bottom";
}

/**
 * Grantee flip card — photo front; hover (desktop) or tap (mobile) reveals `.kpf-card` info.
 * Desktop: GSAP flip axis follows cursor entry on open and exit on close (one axis only).
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
  const rootRef = useRef(null);
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
      // Desktop: GSAP hover handles flip; don't fight it with click state.
      if (canHoverFlip()) return;
      if (event.target.closest?.("a[href]")) return;
      event.preventDefault();
      setFlipped(!flipped);
    },
    [flipped, setFlipped],
  );

  // Desktop directional flip — GSAP owns enter + leave (CSS :hover raced the arming frame).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const front = root.querySelector(".kpf-grantee-card__face--front");
    const back = root.querySelector(".kpf-grantee-card__face--back");
    if (!front || !back) return undefined;

    const mm = gsap.matchMedia();

    mm.add(
      {
        isDesktop: "(hover: hover) and (pointer: fine)",
        reduceMotion: "(prefers-reduced-motion: reduce)",
      },
      (context) => {
        const { isDesktop, reduceMotion } = context.conditions;
        if (!isDesktop) return undefined;

        root.classList.add("kpf-grantee-card--js-flip");

        let isOpen = false;
        const duration = reduceMotion ? 0 : 0.56;
        const openEase = "power3.out";
        const closeEase = "back.out(1.4)";
        const closeDuration = reduceMotion ? 0 : 0.7;

        const normalizeEdge = (nextEdge) =>
          nextEdge === "right" ||
          nextEdge === "top" ||
          nextEdge === "bottom" ||
          nextEdge === "left"
            ? nextEdge
            : "left";

        const zeroAxes = (el, extras = {}) => {
          // Clear every rotation channel so a prior axis never blends into the next flip.
          gsap.set(el, {
            rotation: 0,
            rotationX: 0,
            rotationY: 0,
            ...extras,
          });
        };

        /** Resting “open” pose for an edge so close can leave on a different axis/direction. */
        const snapOpenPose = (edge) => {
          const horizontal = edge === "left" || edge === "right";
          if (horizontal) {
            const frontY = edge === "left" ? -180 : 180;
            zeroAxes(front, { rotationY: frontY, zIndex: 1 });
            zeroAxes(back, { rotationY: 0, zIndex: 2 });
          } else {
            const frontX = edge === "top" ? 180 : -180;
            zeroAxes(front, { rotationX: frontX, zIndex: 1 });
            zeroAxes(back, { rotationX: 0, zIndex: 2 });
          }
        };

        const openFlip = (nextEdge) => {
          const edge = normalizeEdge(nextEdge);
          const horizontal = edge === "left" || edge === "right";
          gsap.killTweensOf([front, back]);

          zeroAxes(front, { zIndex: 2 });

          if (horizontal) {
            const frontY = edge === "left" ? -180 : 180;
            const backY = edge === "left" ? 180 : -180;
            gsap.set(back, {
              rotation: 0,
              rotationX: 0,
              rotationY: backY,
              zIndex: 1,
            });
            if (reduceMotion) {
              gsap.set(front, { rotationY: frontY, zIndex: 1 });
              gsap.set(back, { rotationY: 0, zIndex: 2 });
            } else {
              // Tween ONLY rotationY — never touch rotationX in the same tween.
              gsap.to(front, {
                rotationY: frontY,
                duration,
                ease: openEase,
                overwrite: true,
                zIndex: 1,
              });
              gsap.to(back, {
                rotationY: 0,
                duration,
                ease: openEase,
                overwrite: true,
                zIndex: 2,
              });
            }
          } else {
            const frontX = edge === "top" ? 180 : -180;
            const backX = edge === "top" ? -180 : 180;
            gsap.set(back, {
              rotation: 0,
              rotationY: 0,
              rotationX: backX,
              zIndex: 1,
            });
            if (reduceMotion) {
              gsap.set(front, { rotationX: frontX, zIndex: 1 });
              gsap.set(back, { rotationX: 0, zIndex: 2 });
            } else {
              // Tween ONLY rotationX — never touch rotationY in the same tween.
              gsap.to(front, {
                rotationX: frontX,
                duration,
                ease: openEase,
                overwrite: true,
                zIndex: 1,
              });
              gsap.to(back, {
                rotationX: 0,
                duration,
                ease: openEase,
                overwrite: true,
                zIndex: 2,
              });
            }
          }
          isOpen = true;
        };

        const closeFlip = (exitEdge) => {
          if (!isOpen) return;
          const edge = normalizeEdge(exitEdge);
          const horizontal = edge === "left" || edge === "right";
          gsap.killTweensOf([front, back]);

          // Re-seat on the exit axis so leave direction is independent of how we opened.
          snapOpenPose(edge);

          if (horizontal) {
            const backY = edge === "left" ? 180 : -180;
            if (reduceMotion) {
              gsap.set(front, { rotationY: 0, zIndex: 2 });
              gsap.set(back, { rotationY: backY, zIndex: 1 });
            } else {
              gsap.to(front, {
                rotationY: 0,
                duration: closeDuration,
                ease: closeEase,
                overwrite: true,
                zIndex: 2,
              });
              gsap.to(back, {
                rotationY: backY,
                duration: closeDuration,
                ease: closeEase,
                overwrite: true,
                zIndex: 1,
              });
            }
          } else {
            const backX = edge === "top" ? -180 : 180;
            if (reduceMotion) {
              gsap.set(front, { rotationX: 0, zIndex: 2 });
              gsap.set(back, { rotationX: backX, zIndex: 1 });
            } else {
              gsap.to(front, {
                rotationX: 0,
                duration: closeDuration,
                ease: closeEase,
                overwrite: true,
                zIndex: 2,
              });
              gsap.to(back, {
                rotationX: backX,
                duration: closeDuration,
                ease: closeEase,
                overwrite: true,
                zIndex: 1,
              });
            }
          }
          isOpen = false;
        };

        const onPointerEnter = (event) => {
          openFlip(getPointerEdge(event, root));
        };

        const onPointerLeave = (event) => {
          if (event.relatedTarget && root.contains(event.relatedTarget)) return;
          closeFlip(getPointerEdge(event, root));
        };

        const onFocusIn = () => {
          if (!root.matches(":hover")) openFlip("left");
        };

        const onFocusOut = (event) => {
          if (event.relatedTarget && root.contains(event.relatedTarget)) return;
          if (root.matches(":hover")) return;
          closeFlip("left");
        };

        zeroAxes(front, { zIndex: 2 });
        gsap.set(back, {
          rotation: 0,
          rotationX: 0,
          rotationY: 180,
          zIndex: 1,
        });

        root.addEventListener("pointerenter", onPointerEnter);
        root.addEventListener("pointerleave", onPointerLeave);
        root.addEventListener("focusin", onFocusIn);
        root.addEventListener("focusout", onFocusOut);

        return () => {
          root.removeEventListener("pointerenter", onPointerEnter);
          root.removeEventListener("pointerleave", onPointerLeave);
          root.removeEventListener("focusin", onFocusIn);
          root.removeEventListener("focusout", onFocusOut);
          root.classList.remove("kpf-grantee-card--js-flip");
          gsap.killTweensOf([front, back]);
          gsap.set([front, back], {
            clearProps: "transform,zIndex",
          });
        };
      },
    );

    return () => mm.revert();
  }, [name, photoUrl]);

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
      ref={rootRef}
      className={classes}
      tabIndex={0}
      role="group"
      aria-expanded={flipped}
      aria-label={name}
      onClick={onPointerActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          if (canHoverFlip()) return;
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
