/**
 * Known homepage leftovers that already have a public WebP sibling.
 * Rewrites WP upload / PNG-JPG fallback URLs onto /media/*.webp.
 *
 * @param {string} src
 * @returns {string}
 */
function preferLocalWebp(src) {
  const raw = String(src || "").trim();
  if (!raw) return raw;

  const path = raw.split(/[?#]/)[0];
  if (/(?:^|\/)388-SFHF\.png$/i.test(path)) {
    return "/media/content/388-SFHF.webp";
  }
  if (/(?:^|\/)541-hero\.jpe?g$/i.test(path)) {
    return "/media/content/541-hero.webp";
  }
  if (/(?:^|\/)home\/hero\.jpe?g$/i.test(path)) {
    return "/media/home/hero.webp";
  }

  return raw;
}

module.exports = { preferLocalWebp };
