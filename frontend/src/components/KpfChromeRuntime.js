import { useEffect } from "react";

/**
 * Hydrates CMS-injected `.kpf-mobile-nav` (WordPress global header HTML).
 * Mirrors KpfMobileNav open/close: Escape, outside click, aria attributes.
 */
export default function KpfChromeRuntime({ enabled }) {
  useEffect(() => {
    if (!enabled || typeof document === "undefined") return undefined;

    const path = window.location.pathname || "/";
    const normalize = (href) => {
      try {
        const url = new URL(href, window.location.origin);
        let bare = url.pathname || "/";
        if (bare !== "/" && !bare.endsWith("/")) bare += "/";
        return bare;
      } catch {
        return "/";
      }
    };
    const current = normalize(path);

    document.querySelectorAll(".kpf-header a.kpf-nav-link, .kpf-mobile-nav a.kpf-mobile-nav__item").forEach((link) => {
      const target = normalize(link.getAttribute("href") || "/");
      const isCurrent =
        target === "/"
          ? current === "/"
          : current === target || current.startsWith(target);
      if (isCurrent) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });

    const brandCleanups = Array.from(
      document.querySelectorAll(".kpf-header__brand-text[data-full]"),
    ).map((slot) => {
      const label = slot.querySelector(".kpf-header__brand-text-label");
      const measure = slot.querySelector(".kpf-header__brand-text-measure");
      const full = slot.getAttribute("data-full") || "Kevin Popke Foundation";
      const short = slot.getAttribute("data-short") || "KPF";
      const brand = slot.closest(".kpf-header__brand");
      const header = brand?.closest(".kpf-header") || brand?.parentElement;
      if (
        !label ||
        !measure ||
        !brand ||
        !header ||
        typeof ResizeObserver === "undefined"
      ) {
        return () => {};
      }

      let compact = false;
      const sync = () => {
        const needed = measure.offsetWidth;
        if (needed <= 0) return;

        const badge = brand.querySelector(".kpf-header__badge");
        const brandCs = getComputedStyle(brand);
        const gap = parseFloat(brandCs.gap) || 0;
        const brandPad =
          (parseFloat(brandCs.paddingLeft) || 0) +
          (parseFloat(brandCs.paddingRight) || 0);
        const fullBrandW =
          (badge?.offsetWidth || 0) + gap + needed + brandPad;

        const headerCs = getComputedStyle(header);
        const headerPad =
          (parseFloat(headerCs.paddingLeft) || 0) +
          (parseFloat(headerCs.paddingRight) || 0);
        const headerGap = parseFloat(headerCs.gap) || 0;
        const spacer = header.querySelector(".kpf-header__spacer");
        const spacerMin = spacer
          ? parseFloat(getComputedStyle(spacer).minWidth) || 0
          : 0;
        let fixed = 0;
        for (const child of header.children) {
          if (child === brand || child === spacer) continue;
          fixed += child.offsetWidth;
        }
        const availableForBrand =
          header.clientWidth -
          headerPad -
          fixed -
          spacerMin -
          headerGap * Math.max(0, header.children.length - 1);

        const next = compact
          ? availableForBrand < fullBrandW + 4
          : availableForBrand < fullBrandW;
        if (next === compact) return;
        compact = next;
        slot.toggleAttribute("data-compact", compact);
        label.textContent = compact ? short : full;
      };

      const ro = new ResizeObserver(sync);
      ro.observe(header);
      ro.observe(brand);
      sync();
      return () => ro.disconnect();
    });

    const roots = Array.from(document.querySelectorAll(".kpf-mobile-nav"));
    if (!roots.length && !brandCleanups.length) return undefined;

    const cleanups = roots.map((root) => {
      const toggle = root.querySelector(".kpf-mobile-nav__toggle");
      const panel = root.querySelector(".kpf-mobile-nav__panel");
      if (!toggle || !panel) return () => {};

      const setOpen = (open) => {
        root.classList.toggle("is-open", open);
        root.setAttribute("data-state", open ? "open" : "closed");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
        panel.setAttribute("aria-hidden", open ? "false" : "true");
        panel.querySelectorAll("a").forEach((link) => {
          if (open) link.removeAttribute("tabindex");
          else link.setAttribute("tabindex", "-1");
        });
      };

      setOpen(false);

      const onToggle = () => {
        const open = toggle.getAttribute("aria-expanded") !== "true";
        setOpen(open);
      };

      const onKeyDown = (event) => {
        if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
          setOpen(false);
          toggle.focus();
        }
      };

      const onPointerDown = (event) => {
        if (
          toggle.getAttribute("aria-expanded") === "true" &&
          !root.contains(event.target)
        ) {
          setOpen(false);
        }
      };

      const onNavClick = (event) => {
        const link = event.target.closest("a.kpf-mobile-nav__item");
        if (link) setOpen(false);
      };

      toggle.addEventListener("click", onToggle);
      document.addEventListener("keydown", onKeyDown);
      document.addEventListener("pointerdown", onPointerDown);
      panel.addEventListener("click", onNavClick);

      return () => {
        toggle.removeEventListener("click", onToggle);
        document.removeEventListener("keydown", onKeyDown);
        document.removeEventListener("pointerdown", onPointerDown);
        panel.removeEventListener("click", onNavClick);
      };
    });

    return () => {
      brandCleanups.forEach((fn) => fn());
      cleanups.forEach((fn) => fn());
    };
  }, [enabled]);

  return null;
}
