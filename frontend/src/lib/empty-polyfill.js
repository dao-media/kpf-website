/**
 * Empty stand-in for Next.js `polyfill-module`.
 *
 * Next injects that module for every browser (Array.prototype.at / flat /
 * flatMap, Object.fromEntries / hasOwn, String trimStart / trimEnd). Our
 * browserslist (Chrome/Edge/Firefox 111+, Safari 16.4+) already has those
 * natively, so PageSpeed Insights flags ~16 KiB of unused JS. Alias both
 * webpack and turbopack to this file instead.
 *
 * https://github.com/vercel/next.js/issues/86785
 */
