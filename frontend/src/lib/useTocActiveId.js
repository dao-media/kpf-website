const { useEffect, useState } = require("react");

/**
 * Last heading whose top has crossed the spy line (document order).
 * @param {Array<{ id: string, top: number }>} headings
 * @param {number} spyTop viewport Y of the activation line
 * @returns {string}
 */
function pickTocActiveId(headings, spyTop) {
  if (!Array.isArray(headings) || !headings.length) return "";
  let active = headings[0].id;
  for (let i = 0; i < headings.length; i += 1) {
    if (headings[i].top <= spyTop) active = headings[i].id;
    else break;
  }
  return active;
}

/**
 * Sticky header bottom + pad, or CSS fallback.
 * @returns {number}
 */
function getSpyTop() {
  const bar = document.querySelector(".kpf-site-chrome__header-bar");
  if (bar) {
    return Math.max(bar.getBoundingClientRect().bottom + 16, 72);
  }
  const fontSize =
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize) ||
    16;
  return fontSize * 5.5 + 16;
}

/**
 * Stable TOC scroll-spy (no IntersectionObserver thrashing).
 * @param {Array<{ id: string }>|null|undefined} toc
 * @returns {string}
 */
function useTocActiveId(toc) {
  const ids = Array.isArray(toc)
    ? toc.map((item) => item?.id).filter(Boolean)
    : [];
  const idsKey = ids.join("|");
  const [activeId, setActiveId] = useState(ids[0] || "");

  useEffect(() => {
    const list = idsKey ? idsKey.split("|") : [];
    if (!list.length || typeof window === "undefined") {
      setActiveId("");
      return undefined;
    }

    let raf = 0;

    const sync = () => {
      raf = 0;
      const spyTop = getSpyTop();
      const headings = [];
      for (const id of list) {
        const el = document.getElementById(id);
        if (!el) continue;
        headings.push({ id, top: el.getBoundingClientRect().top });
      }

      let next = pickTocActiveId(headings, spyTop) || list[0];

      // Pin the last section when the page bottom is in view.
      const scrollBottom = window.scrollY + window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (docHeight - scrollBottom < 64) {
        next = list[list.length - 1];
      }

      setActiveId((prev) => (prev === next ? prev : next));
    };

    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(sync);
    };

    sync();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [idsKey]);

  return activeId || ids[0] || "";
}

module.exports = {
  pickTocActiveId,
  useTocActiveId,
};
