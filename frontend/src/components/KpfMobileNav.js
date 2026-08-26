import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { isCurrentPath } from "@/lib/navigation";

function MenuIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 5h16" />
      <path d="M4 12h16" />
      <path d="M4 19h16" />
    </svg>
  );
}

function CloseIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function ChevronIcon({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

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
        <MenuIcon className="kpf-mobile-nav__icon kpf-mobile-nav__icon--menu" />
        <CloseIcon className="kpf-mobile-nav__icon kpf-mobile-nav__icon--close" />
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
                  <ChevronIcon className="kpf-mobile-nav__arrow" />
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
