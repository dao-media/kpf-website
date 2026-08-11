import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { isCurrentPath } from "@/lib/navigation";

function ArrowIcon() {
  return (
    <svg
      className="kpf-mobile-nav__arrow"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M6.2 3.2 10.8 8l-4.6 4.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Mobile nav panel — Figma Mobile Nav Menu `950:566`.
 * Toggle 44×44; open = X + popover with Sidebar Parent rows (arrow + label).
 */
export default function KpfMobileNav({
  items = [],
  pathname = "/",
  open,
  onOpenChange,
}) {
  // Strip React useId colons — `aria-controls`/DOM ids with `:` are invalid HTML.
  const panelId = `kpf-mobile-nav-${useId().replace(/:/g, "")}`;
  const rootRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onOpenChange?.(false);
        toggleRef.current?.focus();
      }
    }

    function onPointerDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        onOpenChange?.(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open, onOpenChange]);

  return (
    <div
      ref={rootRef}
      className={`kpf-mobile-nav${open ? " is-open" : ""}`}
      data-state={open ? "open" : "closed"}
    >
      <button
        ref={toggleRef}
        type="button"
        className="kpf-mobile-nav__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => onOpenChange?.(!open)}
      >
        {open ? (
          <X size={22} strokeWidth={1.8} aria-hidden="true" />
        ) : (
          <Menu size={22} strokeWidth={1.8} aria-hidden="true" />
        )}
      </button>

      <div
        id={panelId}
        className="kpf-mobile-nav__panel"
        aria-hidden={!open}
      >
        <nav className="kpf-mobile-nav__links" aria-label="Mobile">
          {items.map((item) => {
            const current = isCurrentPath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="kpf-mobile-nav__item"
                aria-current={current ? "page" : undefined}
                tabIndex={open ? undefined : -1}
                onClick={() => onOpenChange?.(false)}
              >
                <ArrowIcon />
                <span className="kpf-mobile-nav__label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
