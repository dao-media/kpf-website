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
 * Keep the clicked TOC id until the spy reaches it. ScrollSmoother animates
 * asynchronously, so the arrow must move on click — not wait for `window` scroll.
 * @param {string} clickedId
 * @param {string} spyId
 * @returns {string}
 */
function honorClickedTocId(clickedId, spyId) {
  if (!clickedId) return spyId || "";
  return clickedId;
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
 * Hash / TOC href → heading id.
 * @param {string|null|undefined} href
 * @returns {string}
 */
function tocIdFromHref(href) {
  const raw = String(href || "").trim();
  if (!raw) return "";
  const hash = raw.startsWith("#")
    ? raw
    : raw.includes("#")
      ? `#${raw.split("#").pop()}`
      : "";
  if (hash.length < 2) return "";
  try {
    return decodeURIComponent(hash.slice(1));
  } catch {
    return hash.slice(1);
  }
}

/**
 * Stable TOC scroll-spy. Tracks GSAP ScrollSmoother (transform scroller) as
 * well as native window scroll, and pins the arrow to a clicked heading until
 * that section actually reaches the spy line.
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
    let clickedId = tocIdFromHref(window.location.hash);

    const sync = () => {
      raf = 0;
      const spyTop = getSpyTop();
      const headings = [];
      for (const id of list) {
        const el = document.getElementById(id);
        if (!el) continue;
        headings.push({ id, top: el.getBoundingClientRect().top });
      }

      let spyId = pickTocActiveId(headings, spyTop) || list[0];

      const last = headings[headings.length - 1];
      const lastEl = last ? document.getElementById(last.id) : null;
      const article =
        lastEl?.closest(".kpf-post-main, .kpf-article") || lastEl;
      if (article && article.getBoundingClientRect().bottom <= spyTop + 24) {
        spyId = list[list.length - 1];
      }

      if (clickedId) {
        const target = headings.find((row) => row.id === clickedId);
        if (
          (target && Math.abs(target.top - spyTop) <= 64) ||
          spyId === clickedId
        ) {
          clickedId = "";
        }
      }

      const next = honorClickedTocId(clickedId, spyId) || list[0];
      setActiveId((prev) => (prev === next ? prev : next));
    };

    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(sync);
    };

    const onClick = (event) => {
      const link = event.target?.closest?.(".kpf-post-toc a[href]");
      if (!link) return;
      const id = tocIdFromHref(link.getAttribute("href"));
      if (!id || !list.includes(id)) return;
      clickedId = id;
      setActiveId(id);
    };

    const onHashChange = () => {
      const id = tocIdFromHref(window.location.hash);
      if (!id || !list.includes(id)) return;
      clickedId = id;
      setActiveId(id);
    };

    sync();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("click", onClick, true);
    document
      .querySelector("#smooth-wrapper")
      ?.addEventListener("scroll", schedule, { passive: true });

    const smoothed = document.documentElement.classList.contains(
      "kpf-scroll-smoothed",
    );
    let gsapTicker = null;
    if (smoothed) {
      const gsapMod = require("gsap");
      const gsap = gsapMod.gsap || gsapMod;
      gsapTicker = gsap.ticker;
      gsapTicker.add(schedule);
    }

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", onHashChange);
      document.removeEventListener("click", onClick, true);
      document
        .querySelector("#smooth-wrapper")
        ?.removeEventListener("scroll", schedule);
      if (gsapTicker) {
        gsapTicker.remove(schedule);
      }
    };
  }, [idsKey]);

  return activeId || ids[0] || "";
}

module.exports = {
  honorClickedTocId,
  pickTocActiveId,
  tocIdFromHref,
  useTocActiveId,
};
