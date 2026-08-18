import { useEffect, useRef } from "react";

/**
 * Lit cigar with a looping smoke overlay. Width follows the parent;
 * smoke position is percentage-based so the ember alignment holds at any size.
 */
export default function CigarSmoke({
  cigarSrc = "",
  smokeSrc = "",
  cigarAlt = "",
  className = "",
  id,
}) {
  const videoRef = useRef(null);
  const src = cigarSrc || "/media/cigar/Cigar.png";
  const smoke = smokeSrc || "/media/cigar/smoke.mp4";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");

    function syncPlayback() {
      if (media.matches) {
        video.pause();
        return;
      }
      const play = video.play();
      if (play && typeof play.catch === "function") {
        play.catch(() => {});
      }
    }

    syncPlayback();
    media.addEventListener("change", syncPlayback);
    return () => media.removeEventListener("change", syncPlayback);
  }, [smoke]);

  if (!src) {
    return null;
  }

  const classes = ["kpf-cigar", className].filter(Boolean).join(" ");

  return (
    <div id={id || undefined} className={classes}>
      {/* Gutenberg and scaffold layouts set the box; native img scales with it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="kpf-cigar__image" src={src} alt={cigarAlt} />
      {smoke ? (
        <video
          ref={videoRef}
          className="kpf-cigar__smoke"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          aria-hidden="true"
          disablePictureInPicture
        >
          <source src={smoke} type="video/mp4" />
        </video>
      ) : null}
    </div>
  );
}
