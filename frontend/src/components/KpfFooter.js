import Link from "next/link";
import KpfButton from "@/components/KpfButton";
import {
  KPF_DONATE_HREF,
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
  donateHref = KPF_DONATE_HREF,
}) {
  const year = new Date().getFullYear();

  return (
    <footer className="kpf-footer">
      <div className="kpf-footer__rule" aria-hidden="true" />
      <div className="kpf-footer__body kpf-u-container">
        <blockquote className="kpf-footer__tagline">{tagline}</blockquote>
        <div className="kpf-footer__grid">
          <div className="kpf-footer__brand">
            <p className="kpf-footer__brand-name">{brandLabel}</p>
            <p className="kpf-footer__brand-note">
              A 501(c)(3) nonprofit organization serving Tampa Bay &amp; Florida.
            </p>
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
                {connect.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}>{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="kpf-footer__cta-card">
            <p className="kpf-footer__cta-title">Prefer to just give?</p>
            <p className="kpf-footer__cta-body">
              Every gift becomes a grant in Kevin’s name.
            </p>
            <KpfButton
              href={donateHref}
              className="kpf-btn kpf-btn--primary kpf-btn--sm"
              data-kpf-track="donate_footer_clicked"
            >
              Donate
            </KpfButton>
          </div>
        </div>
      </div>

      <div className="kpf-footer__bar kpf-u-container">
        <p>
          © {year} {brandLabel} All rights reserved.
        </p>
        <p>
          <Link href="/privacy/">Privacy Policy</Link>
        </p>
      </div>
    </footer>
  );
}
