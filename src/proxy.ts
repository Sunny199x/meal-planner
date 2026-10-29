// Runs before every page: anyone without a valid household session is sent to
// the passcode screen. Server actions check again (see lib/auth/server.ts).
import { NextResponse, type NextRequest } from "next/server";
import { getAuthConfig, SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const auth = getAuthConfig();
  const signedIn =
    auth.ok && (await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value, auth));

  if (pathname === "/login") {
    return signedIn ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }
  if (!signedIn) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

// Icons and the home-screen manifest stay reachable without signing in, so the
// sign-in page shows the icon and "Add to Home Screen" works.
export const config = {
  matcher: ["/((?!_next/static|_next/image|icon.svg|apple-icon.png|manifest.webmanifest|icons/).*)"],
};
