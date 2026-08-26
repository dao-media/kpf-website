import { GeistSans } from "geist/font/sans";
import { Roboto } from "next/font/google";

/**
 * Figma type: Geist (display) + Roboto (body / UI).
 * next/font self-hosts files so _document does not need a Google CSS link.
 */
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: true,
  adjustFontFallback: true,
  variable: "--kpf-font-body-face",
});

const kpfFontClassName = `${GeistSans.variable} ${roboto.variable} kpf-font-root`;

export { GeistSans, kpfFontClassName, roboto };
