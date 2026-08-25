/**
 * Primary site navigation + donate CTA used by KpfHeader / KpfMobileNav / KpfFooter.
 * Paths match Faust/WP pretty permalinks. Donate opens the Foundation PayPal giving flow
 * (same business account as kevinpopkefoundation.org).
 */

const KPF_PRIMARY_NAV = [
  { href: "/", label: "Home" },
  { href: "/about/", label: "About" },
  { href: "/events/", label: "Events" },
  { href: "/blog/", label: "Blog" },
  { href: "/contact/", label: "Contact" },
];

/** PayPal donations — business email from the live site payment form. */
const KPF_DONATE_HREF =
  "https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=kevinpopke.foundation%40gmail.com&item_name=The%20Kevin%20Popke%20Foundation&currency_code=USD";

const KPF_FOOTER_EXPLORE = [
  { href: "/about/", label: "About" },
  { href: "/events/", label: "Events" },
  { href: "/blog/", label: "Blog" },
];

const KPF_FOOTER_CONNECT = [
  { href: "/contact/", label: "Contact" },
  { href: "https://www.facebook.com/kevinpopkefoundation", label: "Facebook" },
  { href: "https://www.instagram.com/kevinpopkefoundation", label: "Instagram" },
  { href: KPF_DONATE_HREF, label: "Donate" },
];

function normalizePath(path) {
  if (!path || path === "/") return "/";
  const bare = String(path).split(/[?#]/)[0] || "/";
  if (bare === "/") return "/";
  return bare.endsWith("/") ? bare : `${bare}/`;
}

function isCurrentPath(pathname, href) {
  const current = normalizePath(pathname);
  const target = normalizePath(href);
  if (target === "/") return current === "/";
  return current === target || current.startsWith(target);
}

function htmlIncludesChromeClass(html, className) {
  if (!html || typeof html !== "string") return false;
  const token = String(className || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!token) return false;
  return new RegExp(`class=["'][^"']*\\b${token}\\b`).test(html);
}

module.exports = {
  KPF_DONATE_HREF,
  KPF_FOOTER_CONNECT,
  KPF_FOOTER_EXPLORE,
  KPF_PRIMARY_NAV,
  htmlIncludesChromeClass,
  isCurrentPath,
  normalizePath,
};
