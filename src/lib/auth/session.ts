// Household passcode sign-in: pure functions with no Next.js imports, so they
// can be unit-tested and used both in the proxy and in server actions.
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "mp_session";
export const SESSION_DAYS = 90;
export const MIN_SECRET_LENGTH = 32;

export type AuthConfig =
  | { ok: true; passcode: string; secret: string }
  | { ok: false; problems: string[] };

type Env = Record<string, string | undefined>;

export function getAuthConfig(env: Env = process.env): AuthConfig {
  const passcode = env.HOUSEHOLD_PASSCODE ?? "";
  const secret = env.SESSION_SECRET ?? "";
  const problems: string[] = [];
  if (normalisePasscode(passcode) === "") {
    problems.push("HOUSEHOLD_PASSCODE is not set.");
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    problems.push(
      secret === ""
        ? "SESSION_SECRET is not set."
        : `SESSION_SECRET is too short (it needs at least ${MIN_SECRET_LENGTH} characters).`,
    );
  }
  return problems.length ? { ok: false, problems } : { ok: true, passcode, secret };
}

/** Phones capitalise and add stray spaces, so case and spacing are ignored. */
export function normalisePasscode(input: string): string {
  return input.trim().replace(/\s+/g, " ").toLowerCase();
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

/** Compares in constant time, so response timing doesn't reveal how close a guess was. */
export async function passcodeMatches(
  input: string,
  config: { passcode: string; secret: string },
): Promise<boolean> {
  const [a, b] = await Promise.all([
    hmac(config.secret, "passcode:" + normalisePasscode(input)),
    hmac(config.secret, "passcode:" + normalisePasscode(config.passcode)),
  ]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * A short fingerprint of the current passcode, stored in the cookie so that
 * changing the passcode signs everyone out. Keyed with the secret, so the
 * cookie doesn't leak anything that helps guess the passcode.
 */
async function passcodeFingerprint(config: { passcode: string; secret: string }) {
  const bytes = await hmac(config.secret, "fingerprint:" + normalisePasscode(config.passcode));
  return Buffer.from(bytes.slice(0, 12)).toString("base64url");
}

export async function createSessionToken(
  config: { passcode: string; secret: string },
  now: Date = new Date(),
): Promise<string> {
  const iat = Math.floor(now.getTime() / 1000);
  return new SignJWT({ pc: await passcodeFingerprint(config) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(iat)
    .setExpirationTime(iat + SESSION_DAYS * 24 * 60 * 60)
    .sign(new TextEncoder().encode(config.secret));
}

export async function verifySessionToken(
  token: string | undefined,
  config: { passcode: string; secret: string },
  now: Date = new Date(),
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(config.secret), {
      algorithms: ["HS256"],
      currentDate: now,
    });
    return payload.pc === (await passcodeFingerprint(config));
  } catch {
    return false;
  }
}

/** Only allow redirects back to a page on this site after signing in. */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  if (next.startsWith("/login") || next.includes("\\")) return "/";
  return next;
}
