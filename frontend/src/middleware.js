import { NextResponse } from "next/server";

const wordpressUrl = (process.env.NEXT_PUBLIC_WORDPRESS_URL || "").replace(
  /\/$/,
  ""
);

export async function middleware(request) {
  if (!wordpressUrl) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  try {
    const lookup = await fetch(
      `${wordpressUrl}/wp-json/kpf-seo/v1/public/redirect?path=${encodeURIComponent(
        pathname
      )}`,
      {
        headers: { Accept: "application/json" },
        // Edge-friendly short timeout behavior depends on runtime; fail open.
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
