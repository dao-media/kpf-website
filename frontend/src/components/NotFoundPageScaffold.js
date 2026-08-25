import CtaClosingBand from "@/components/CtaClosingBand";
import KpfButton from "@/components/KpfButton";
import { NOTFOUND } from "@/lib/pageCopy";

const { resolveMedia } = require("@/lib/scaffoldMedia");

export default function NotFoundPageScaffold({ media = {} }) {
  const copy = NOTFOUND;
  const planes = resolveMedia(media, copy.hero.media.key, copy.hero.media);

  return (
    <div className="kpf-page-404" data-kpf-scaffold="notfound">
      <section
        className="kpf-hero kpf-hero--404"
        aria-labelledby="kpf-404-hero-title"
      >
        {planes.src ? (
          <div className="kpf-hero--404__planes" aria-hidden="true">
            <img
              src={planes.src}
              alt=""
              width={1600}
              height={1070}
              decoding="async"
            />
          </div>
        ) : null}
        <div className="kpf-u-container kpf-hero__layout">
          <div className="kpf-hero__content">
            <div className="kpf-content-block kpf-u-invert">
              <div className="kpf-content-block__copy">
                <div className="kpf-content-block__title-group">
                  <h1
                    id="kpf-404-hero-title"
                    className="kpf-content-block__title kpf-content-block__title--h0"
                  >
                    {copy.hero.title}
                  </h1>
                </div>
                <div className="kpf-content-block__body-group">
                  <p className="kpf-content-block__body">{copy.hero.body}</p>
                </div>
              </div>
              <div className="kpf-content-block__actions kpf-hero__actions">
                {copy.hero.actions.map((action) => (
                  <KpfButton
                    key={`${action.href}-${action.label}`}
                    href={action.href}
                    className={`kpf-btn kpf-btn--${action.variant || "primary"}`}
                  >
                    {action.label}
                  </KpfButton>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <CtaClosingBand titleId="kpf-404-cta-title" />
    </div>
  );
}
