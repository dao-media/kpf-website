import { NextResponse } from "next/server";
import {
  ADMIN_CMS_HOST,
  PRODUCTION_ORIGIN,
  adminCmsDestination,
  isAdminCmsHost,
  isVercelProductionAlias,
  shouldStripPublicTrailingSlash,
} from "@/lib/publicSiteUrl";

const wordpressUrl = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(
  /\/$/,
  ""
);

function normalizePath(path) {
  if (!path) return "/";
  let next = path.startsWith("/") ? path : `/${path}`;
  if (next.length > 1 && next.endsWith("/")) {
    next = next.slice(0, -1);
  }
  return next || "/";
}

function pathAllowed(pathname, allowlist = [], maintenancePath = "/coming-soon") {
  const current = normalizePath(pathname);
  const maintenance = normalizePath(maintenancePath);
  if (current === maintenance) {
    return true;
  }

  return (allowlist || []).some((entry) => {
    const allowed = normalizePath(entry);
    return current === allowed || current.startsWith(`${allowed}/`);
  });
}

function shouldSkipSeoLookup(pathname) {
  return (
    pathname === "/search" ||
    pathname === "/coming-soon" ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".") ||
    isCanonicalPublicPath(pathname)
  );
}

/** Known ISR destinations — no SEO redirect lookup on the hot path. */
function isCanonicalPublicPath(pathname) {
  const current = normalizePath(pathname);
  return (
    current === "/" ||
    current === "/about" ||
    current === "/events" ||
    current === "/blog" ||
    current === "/contact" ||
    current === "/privacy"
  );
}

const WP_LOOKUP_MS = 600;

function wpLookupSignal() {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(WP_LOOKUP_MS);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), WP_LOOKUP_MS);
  return controller.signal;
}

export async function middleware(request) {
  const incomingHost = (
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    request.nextUrl.hostname ||
    ""
  )
    .split(":")[0]
    .toLowerCase();

  if (shouldStripPublicTrailingSlash(incomingHost, request.nextUrl.pathname)) {
    const stripped = request.nextUrl.pathname.replace(/\/+$/, "") || "/";
    const dest = `${request.nextUrl.origin}${stripped}${request.nextUrl.search}`;
    return NextResponse.redirect(dest, 308);
  }

  // Proxy WordPress so the browser stays on admin.kevinpopkefoundation.org.
  if (isAdminCmsHost(incomingHost)) {
    const headers = new Headers(request.headers);
    headers.set("x-forwarded-host", ADMIN_CMS_HOST);
    headers.set("x-forwarded-proto", "https");
    headers.set("x-kpf-admin-host", "1");
    return NextResponse.rewrite(
      new URL(
        adminCmsDestination(request.nextUrl.pathname, request.nextUrl.search)
      ),
      { request: { headers } }
    );
  }

  if (isVercelProductionAlias(incomingHost)) {
    const dest = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      PRODUCTION_ORIGIN
    );
    return NextResponse.redirect(dest, 301);
  }

  const legacyPath = {
    "/about-us": "/about",
    "/contact-us": "/contact",
  }[normalizePath(request.nextUrl.pathname)];
  if (legacyPath) {
    const dest = new URL(legacyPath, PRODUCTION_ORIGIN);
    dest.search = request.nextUrl.search;
    return NextResponse.redirect(dest, 301);
  }

  if (!wordpressUrl) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Static/Next internals never need maintenance or SEO redirect checks.
  if (pathname.startsWith("/_next/") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const skipSeo = shouldSkipSeoLookup(pathname);

  try {
    const lookups = [
      fetch(`${wordpressUrl}/wp-json/kpf-designs/v1/public/maintenance`, {
        headers: { Accept: "application/json" },
        signal: wpLookupSignal(),
      }),
    ];
    if (!skipSeo) {
      lookups.push(
        fetch(
          `${wordpressUrl}/wp-json/kpf-seo/v1/public/redirect?path=${encodeURIComponent(
            pathname
          )}`,
          {
            headers: { Accept: "application/json" },
            signal: wpLookupSignal(),
          }
        )
      );
    }

    const settled = await Promise.allSettled(lookups);
    const maintenanceLookup =
      settled[0]?.status === "fulfilled" ? settled[0].value : null;

    if (maintenanceLookup?.ok) {
      const maintenance = await maintenanceLookup.json();
      if (maintenance?.enabled) {
        const targetPath = maintenance.path || "/coming-soon/";
        if (!pathAllowed(pathname, maintenance.allowlist, targetPath)) {
          return NextResponse.redirect(new URL(targetPath, request.url), 302);
        }
      }
    }

    if (skipSeo) {
      return NextResponse.next();
    }

    const lookup = settled[1]?.status === "fulfilled" ? settled[1].value : null;
    if (!lookup?.ok) {
      return NextResponse.next();
    }

    const data = await lookup.json();
    const match = data?.match;
    if (!match?.target_url) {
      return NextResponse.next();
    }

    const target = new URL(match.target_url, request.url);
    if (target.pathname === pathname) {
      return NextResponse.next();
    }

    return NextResponse.redirect(target, match.status_code || 301);
  } catch (error) {
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
