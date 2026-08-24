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

    const roots = Array.from(document.querySelectorAll(".kpf-mobile-nav"));
    if (!roots.length) return undefined;

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
      cleanups.forEach((fn) => fn());
    };
  }, [enabled]);

  return null;
}
