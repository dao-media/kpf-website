import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { Menu, X, ChevronRight } from "lucide-react";
import { isCurrentPath } from "@/lib/navigation";

/**
 * Mobile nav panel — Figma Mobile Nav Menu `950:566`.
 * Toggle 44×44; open = X + popover with Sidebar Parent rows (arrow + label).
 * Both icons stay mounted so CSS can crossfade / ease the button swap.
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

    const root = rootRef.current;
    const focusables = () =>
      Array.from(
        root?.querySelectorAll(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) || [],
      ).filter((el) => el.offsetParent !== null || el === toggleRef.current);

    const items = focusables();
    const firstLink = items.find((el) => el !== toggleRef.current);
    (firstLink || toggleRef.current)?.focus();

    function onKeyDown(event) {
      if (event.key === "Escape") {
        onOpenChange?.(false);
        toggleRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const cycle = focusables();
      if (cycle.length < 2) return;
      const first = cycle[0];
      const last = cycle[cycle.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
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
        <Menu
          className="kpf-mobile-nav__icon kpf-mobile-nav__icon--menu"
          size={22}
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <X
          className="kpf-mobile-nav__icon kpf-mobile-nav__icon--close"
          size={22}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </button>

      <div
        id={panelId}
        className="kpf-mobile-nav__panel"
        role="dialog"
        aria-modal={open ? "true" : undefined}
        aria-label="Site menu"
        aria-hidden={!open}
      >
        <nav className="kpf-mobile-nav__links" aria-label="Site">
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
                {current ? (
                  <ChevronRight
                    className="kpf-mobile-nav__arrow"
                    size={16}
                    strokeWidth={2}
                    aria-hidden
                  />
                ) : null}
                <span className="kpf-mobile-nav__label">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
