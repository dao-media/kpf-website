import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CtaClosingFlag from "@/components/CtaClosingFlag";
import DonateButton, { isDonateAction } from "@/components/DonateButton";
import KpfButton from "@/components/KpfButton";

gsap.registerPlugin(CustomEase, ScrollTrigger);

const COPY_EASE = "0.22,1,0.36,1";
const TITLE_DURATION = 0.6;

export const CTA_CLOSING_DEFAULTS = {
  title: "There's more than one way to make a difference.",
  body: "Volunteer a Saturday. Point us toward an org that deserves a look. Or give — every gift becomes a grant in Kevin's name.",
  actions: [
    { donate: true, label: "Donate", variant: "primary" },
    { href: "/contact/", label: "Get in touch", variant: "outline" },
  ],
  media: {
    key: "cta.flag",
    src: "/media/brand/kpf-flag.mp4",
    alt: "",
  },
};

/**
 * Closing flag-band CTA (pre-footer) — Donate / Get in touch.
 */
export default function CtaClosingBand({
  title = CTA_CLOSING_DEFAULTS.title,
  body = CTA_CLOSING_DEFAULTS.body,
  actions = CTA_CLOSING_DEFAULTS.actions,
  flagSrc = "",
  titleId = "kpf-cta-closing-title",
}) {
  const sectionRef = useRef(null);
  const list = Array.isArray(actions) && actions.length > 0
    ? actions
    : CTA_CLOSING_DEFAULTS.actions;

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof window === "undefined") return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return undefined;

    const title = section.querySelector(".kpf-content-block__title");
    const follow = gsap.utils.toArray(
      section.querySelectorAll(
        ".kpf-content-block__body, .kpf-content-block__actions",
      ),
    );
    if (!title && !follow.length) return undefined;

    const copyEase = CustomEase.create("kpf-cta-closing-copy", COPY_EASE);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { overwrite: "auto" },
        scrollTrigger: {
          trigger: section,
          start: "top 80%",
          once: true,
        },
      });

      const isMobile = window.matchMedia("(max-width: 47.99rem)").matches;
      const titleOrigin = isMobile ? "0% 0%" : "50% 0%";

      if (title) {
        // Drop in from a parallel plane in front of the viewport (z + y), 600ms.
        gsap.set(title, {
          transformPerspective: 960,
          transformOrigin: titleOrigin,
          force3D: true,
        });
        tl.from(
          title,
          {
            y: -56,
            z: 140,
            autoAlpha: 0,
            duration: TITLE_DURATION,
            ease: "power3.out",
            force3D: true,
          },
          0,
        );
      }

      if (follow.length) {
        // Hold the from-state until the title lands; timeline `from` at t>0
        // would leave these visible during the heading drop.
        gsap.set(follow, { y: 42, autoAlpha: 0 });
        tl.to(
          follow,
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.9,
            stagger: 0.08,
            ease: copyEase,
          },
          title ? TITLE_DURATION : 0,
        );
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="kpf-cta-closing kpf-section"
      data-kpf-gsap-own=""
      aria-labelledby={titleId}
    >
      <CtaClosingFlag src={flagSrc} />
      <div className="kpf-u-container">
        <div className="kpf-content-block kpf-u-invert kpf-cta-closing__block">
          <div className="kpf-content-block__copy">
            <div className="kpf-content-block__title-group">
              <h2
                id={titleId}
                className="kpf-content-block__title kpf-content-block__title--h2"
              >
                {title}
              </h2>
            </div>
            {body ? (
              <div className="kpf-content-block__body-group">
                <p className="kpf-content-block__body">{body}</p>
              </div>
            ) : null}
          </div>
          <div className="kpf-content-block__actions">
            {list.map((action) => {
              const className = `kpf-btn kpf-btn--${action.variant || "primary"}`;
              const key = `${action.donate ? "donate" : action.href}-${action.label}`;
              if (isDonateAction(action)) {
                return (
                  <DonateButton
                    key={key}
                    label={action.label}
                    className={className}
                  />
                );
              }
              return (
                <KpfButton
                  key={key}
                  href={action.href}
                  external={Boolean(action.external)}
                  className={className}
                >
                  {action.label}
                </KpfButton>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
