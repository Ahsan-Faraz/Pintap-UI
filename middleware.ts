import { NextResponse, type NextRequest } from "next/server";
import {
  defaultPathForRoles,
  isProtectedPath,
  requiredRoleForPath,
  userHasRole,
} from "@/lib/auth/routes";
import { isServiceLive } from "@/lib/config";
import { updateSession } from "@/lib/supabase/middleware";

const AUTH_PATHS = new Set(["/login", "/signup"]);

export async function middleware(request: NextRequest) {
  // While auth is still served by the mock layer there is no Supabase session,
  // so don't gate routes or touch Supabase — keep the Phase 1 flow working.
  if (!isServiceLive("auth")) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (!isProtectedPath(pathname) && !AUTH_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const { response, user } = await updateSession(request);

  if (!user && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user) {
    const required = requiredRoleForPath(pathname);
    if (required && !userHasRole(user.roles, required)) {
      const denied = request.nextUrl.clone();
      denied.pathname = "/access-denied";
      denied.searchParams.set("from", pathname);
      denied.searchParams.set(
        "home",
        defaultPathForRoles(user.roles),
      );
      return NextResponse.redirect(denied);
    }

    if (AUTH_PATHS.has(pathname)) {
      const next = request.nextUrl.searchParams.get("next");
      const requiredForNext = next ? requiredRoleForPath(next) : null;
      const target =
        next &&
        isProtectedPath(next) &&
        requiredForNext &&
        userHasRole(user.roles, requiredForNext)
          ? next
          : defaultPathForRoles(user.roles);
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = target;
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals, public resolver traffic, health, and static assets.
    "/((?!_next/static|_next/image|favicon.ico|l/|api/resolver/|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
