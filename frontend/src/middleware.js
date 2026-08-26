import { NextResponse } from "next/server";
import {
  ADMIN_CMS_HOST,
  PRODUCTION_ORIGIN,
  adminCmsDestination,
  isAdminCmsHost,
  isVercelProductionAlias,
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
    pathname.includes(".")
  );
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

  try {
    const maintenanceLookup = await fetch(
      `${wordpressUrl}/wp-json/kpf-designs/v1/public/maintenance`,
      {
        headers: { Accept: "application/json" },
      }
    );

    if (maintenanceLookup.ok) {
      const maintenance = await maintenanceLookup.json();
      if (maintenance?.enabled) {
        const targetPath = maintenance.path || "/coming-soon/";
        if (!pathAllowed(pathname, maintenance.allowlist, targetPath)) {
          return NextResponse.redirect(new URL(targetPath, request.url), 302);
        }
      }
    }
  } catch (error) {
    // Fail open for maintenance checks.
  }

  if (shouldSkipSeoLookup(pathname)) {
    return NextResponse.next();
  }

  try {
    const lookup = await fetch(
      `${wordpressUrl}/wp-json/kpf-seo/v1/public/redirect?path=${encodeURIComponent(
        pathname
      )}`,
      {
        headers: { Accept: "application/json" },
      }
    );

    if (!lookup.ok) {
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
