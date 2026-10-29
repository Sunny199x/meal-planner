import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  createSessionToken,
  getAuthConfig,
  SESSION_COOKIE,
  SESSION_DAYS,
  verifySessionToken,
} from "./session";

export async function startSession(config: { passcode: string; secret: string }) {
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(config), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * Call at the top of every server action. The proxy already guards pages, but
 * actions can be called directly, so they check again.
 */
export async function requireSignedIn() {
  const config = getAuthConfig();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!config.ok || !(await verifySessionToken(token, config))) {
    redirect("/login");
  }
}
