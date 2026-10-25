import { NextResponse, type NextRequest } from "next/server";

/**
 * Admin-only deployments (NEXT_PUBLIC_ADMIN_ONLY=true): everything except the
 * admin panel and the sign-in pages redirects to /admin, so this site never
 * shows the public social app. The main deployment leaves the variable unset
 * and is unaffected.
 */
export function middleware(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_ADMIN_ONLY !== "true") return NextResponse.next();

  const { pathname } = req.nextUrl;
  const allowed = ["/admin", "/login", "/forgot-password", "/onboarding"];
  if (allowed.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin";
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next internals, the service worker, manifest and static assets.
  matcher: ["/((?!_next|api|sw\\.js|manifest\\.json|icons|avatars|logo\\.png|favicon\\.ico).*)"],
};
