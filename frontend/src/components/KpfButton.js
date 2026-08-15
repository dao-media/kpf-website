import { useRouter } from "next/router";

function isExternalHref(href = "") {
  return /^(https?:|mailto:|tel:)/i.test(href);
}

function isHashOnly(href = "") {
  return href.startsWith("#");
}

/**
 * Native `<button>` for button-styled UI (`.kpf-btn`).
 * Navigation CTAs stay buttons in the accessibility tree; destination lives on `data-kpf-href`.
 * Keep text links (`.kpf-link`) and nav items as `<Link>` / `<a>`.
 */
export default function KpfButton({
  href = "",
  external = false,
  type = "button",
  className = "",
  variant = "primary",
  size,
  children,
  onClick,
  disabled = false,
  ...rest
}) {
  const router = useRouter();

  const classes = (
    className.includes("kpf-btn")
      ? className
      : ["kpf-btn", `kpf-btn--${variant}`, size ? `kpf-btn--${size}` : "", className]
          .filter(Boolean)
          .join(" ")
  )
    .split(/\s+/)
    .filter((token, index, all) => token && all.indexOf(token) === index)
    .join(" ");

  const openExternal = Boolean(external || (href && isExternalHref(href)));

  function handleClick(event) {
    if (typeof onClick === "function") {
      onClick(event);
      if (event.defaultPrevented) return;
    }

    if (!href || disabled) return;

    if (openExternal) {
      if (/^(mailto:|tel:)/i.test(href)) {
        window.location.href = href;
        return;
      }
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }

    if (isHashOnly(href)) {
      const id = href.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        if (history?.replaceState) history.replaceState(null, "", href);
      } else {
        window.location.hash = href;
      }
      return;
    }

    if (href.includes("#")) {
      const [path, hash] = href.split("#");
      const currentPath = router.asPath.split("#")[0] || "/";
      const nextPath = path || currentPath;
      if (nextPath === currentPath) {
        const target = hash ? document.getElementById(hash) : null;
        if (target) {
          target.scrollIntoView({ behavior: "smooth", block: "start" });
          if (history?.replaceState) {
            history.replaceState(null, "", `${nextPath}#${hash}`);
          }
          return;
        }
      }
    }

    router.push(href);
  }

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled}
      data-kpf-href={href || undefined}
      data-kpf-external={openExternal ? "true" : undefined}
      onClick={handleClick}
      {...rest}
    >
      {children}
      {openExternal && href ? (
        <span className="kpf-u-sr-only"> (opens in a new tab)</span>
      ) : null}
    </button>
  );
}
