/**
 * Full-bleed looping flag video for `.kpf-cta-closing` sections.
 * Decorative only — paired with a scrim for text contrast.
 */
export default function CtaClosingFlag({ src = "" }) {
  const videoSrc = src || "/media/brand/kpf-flag.mp4";

  return (
    <>
      <div className="kpf-cta-closing__media" aria-hidden="true">
        <video autoPlay muted loop playsInline preload="metadata">
          <source src={videoSrc} type="video/mp4" />
        </video>
      </div>
      <div className="kpf-cta-closing__scrim" aria-hidden="true" />
    </>
  );
}
