import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/lib/env";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password", "/auth/confirm", "/auth/signout"];
const AUTH_ONLY_PATHS = ["/login", "/forgot-password"];

function isSameOriginRelativePath(next: string | null): next is string {
  if (!next) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (/^\/[a-zA-Z][a-zA-Z\d+\-.]*:/.test(next)) return false;
  return true;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  if (pathname.startsWith("/api/")) {
    if (request.method !== "GET") {
      const origin = request.headers.get("origin");
      // Compare against the request's own resolved origin (respects Vercel's
      // forwarded host/proto) rather than a separately-configured env var, so
      // this doesn't drift out of sync across preview URLs or custom domains.
      if (origin && origin !== request.nextUrl.origin) {
        return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
      }
    }
    return response;
  }

  const isStaticAsset =
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map)$/.test(pathname);

  if (isStaticAsset) {
    return response;
  }

  const env = getSupabaseEnv();
  const supabase = createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    const next = `${pathname}${request.nextUrl.search}`;
    if (isSameOriginRelativePath(next)) {
      loginUrl.searchParams.set("next", next);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && AUTH_ONLY_PATHS.some((p) => pathname === p)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
