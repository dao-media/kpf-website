import Link from "next/link";
import CigarSmoke from "@/components/CigarSmoke";
import DonateButton from "@/components/DonateButton";
import {
  KPF_FOOTER_CONNECT,
  KPF_FOOTER_EXPLORE,
} from "@/lib/navigation";

/**
 * Site footer matching Figma Pages Footer (416:100).
 */
export default function KpfFooter({
  brandLabel = "The Kevin Popke Foundation, Inc.",
  tagline = "Together, we can.",
  explore = KPF_FOOTER_EXPLORE,
  connect = KPF_FOOTER_CONNECT,
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="kpf-footer" id="kpf-footer">
      <div className="kpf-footer__body kpf-u-container">
        <blockquote className="kpf-footer__tagline">{tagline}</blockquote>
        <div className="kpf-footer__grid">
          <div className="kpf-footer__brand">
            <p className="kpf-footer__brand-name">{brandLabel}</p>
            <p className="kpf-footer__brand-note">
              A 501(c)(3) nonprofit organization serving Tampa Bay &amp; Florida.
            </p>
            <CigarSmoke className="kpf-footer__cigar" cigarAlt="" />
          </div>

          <div className="kpf-footer__columns">
            <div>
              <p className="kpf-footer__heading">Explore</p>
              <ul className="kpf-footer__list">
                {explore.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="kpf-footer__heading">Connect</p>
              <ul className="kpf-footer__list">
                {connect.map((item) => {
                  const external = /^(https?:|mailto:|tel:)/i.test(item.href);
                  return (
                    <li key={item.href}>
                      {external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {item.label}
                          <span className="kpf-u-sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        <Link href={item.href}>{item.label}</Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <div className="kpf-footer__cta-card">
            <h5 className="kpf-footer__cta-title">
              Your donations support our nation’s protectors.
            </h5>
            <p className="kpf-footer__cta-body">
              Every gift provided to the Kevin Popke Foundation is invested back
              into organizations doing incredible work for vets and their
              families.
            </p>
            <DonateButton
              className="kpf-btn kpf-btn--primary kpf-btn--sm"
              data-kpf-track="donate_clicked"
              data-kpf-track-component="footer_donate"
            />
          </div>
        </div>
      </div>

      <div className="kpf-footer__bar kpf-u-container">
        <p className="kpf-footer__copy">
          © <time dateTime={String(year)}>{year}</time> {brandLabel} All rights
          reserved.
        </p>
        <p className="kpf-footer__legal">
          <Link href="/privacy/">Privacy Policy</Link>
        </p>
      </div>
    </footer>
  );
}
