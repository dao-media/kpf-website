/**
 * Guarantee every HTML <img> has an alt attribute (WCAG 1.1.1).
 * Unknown CMS images get alt="" (decorative / no invented description).
 */

function ensureImgAltAttributes(html) {
  return String(html || "").replace(
    /<img\b([^>]*?)(\s*\/?)>/gi,
    (full, attrs, slash) => {
      if (/\balt\s*=/i.test(attrs)) return full;
      return `<img${attrs} alt=""${slash}>`;
    },
  );
}

function ensureDomImageAlts(root) {
  if (!root || typeof root.querySelectorAll !== "function") return;
  root.querySelectorAll("img").forEach((img) => {
    if (!img.hasAttribute("alt")) {
      img.setAttribute("alt", "");
    }
  });
}

module.exports = {
  ensureDomImageAlts,
  ensureImgAltAttributes,
};
