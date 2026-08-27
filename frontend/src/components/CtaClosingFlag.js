import { useEffect, useRef } from "react";

const { playVideoWhenVisible } = require("@/lib/playVideoWhenVisible");

/**
 * Full-bleed looping flag video for `.kpf-cta-closing` sections.
 * Decorative only — paired with a scrim for text contrast.
 * Starts only when the band is near the viewport so the mp4 stays off LCP.
 */
export default function CtaClosingFlag({ src = "" }) {
  const videoRef = useRef(null);
  const videoSrc = src || "/media/brand/kpf-flag.mp4";

  useEffect(() => {
    return playVideoWhenVisible(videoRef.current);
  }, [videoSrc]);

  return (
    <>
      <div className="kpf-cta-closing__media" aria-hidden="true">
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload="none"
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      </div>
      <div className="kpf-cta-closing__scrim" aria-hidden="true" />
    </>
  );
}
