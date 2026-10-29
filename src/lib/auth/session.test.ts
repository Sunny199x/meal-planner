import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  getAuthConfig,
  normalisePasscode,
  passcodeMatches,
  safeNextPath,
  SESSION_DAYS,
  verifySessionToken,
} from "./session";

const secret = "a".repeat(40);
const config = { passcode: "Purple Tiger Lamp", secret };

describe("getAuthConfig", () => {
  it("accepts a passcode and a long enough secret", () => {
    expect(getAuthConfig({ HOUSEHOLD_PASSCODE: "x", SESSION_SECRET: secret })).toEqual({
      ok: true,
      passcode: "x",
      secret,
    });
  });

  it("reports both settings when missing", () => {
    const result = getAuthConfig({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problems).toEqual([
        "HOUSEHOLD_PASSCODE is not set.",
        "SESSION_SECRET is not set.",
      ]);
    }
  });

  it("rejects a blank passcode and a short secret", () => {
    const result = getAuthConfig({ HOUSEHOLD_PASSCODE: "   ", SESSION_SECRET: "short" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.problems[0]).toMatch(/HOUSEHOLD_PASSCODE/);
      expect(result.problems[1]).toMatch(/too short/);
    }
  });
});

describe("passcodeMatches", () => {
  it("ignores case and extra spaces", async () => {
    expect(normalisePasscode("  Purple   tiger LAMP ")).toBe("purple tiger lamp");
    expect(await passcodeMatches("purple tiger lamp", config)).toBe(true);
    expect(await passcodeMatches(" Purple  Tiger Lamp\n", config)).toBe(true);
  });

  it("rejects wrong, partial and empty guesses", async () => {
    expect(await passcodeMatches("purple tiger", config)).toBe(false);
    expect(await passcodeMatches("purple tiger lamps", config)).toBe(false);
    expect(await passcodeMatches("", config)).toBe(false);
  });
});

describe("session tokens", () => {
  const issued = new Date("2026-10-29T12:00:00Z");

  it("accepts a fresh token", async () => {
    const token = await createSessionToken(config, issued);
    expect(await verifySessionToken(token, config, issued)).toBe(true);
  });

  it("expires after the session length", async () => {
    const token = await createSessionToken(config, issued);
    const justBefore = new Date(issued.getTime() + (SESSION_DAYS * 24 - 1) * 3600 * 1000);
    const after = new Date(issued.getTime() + (SESSION_DAYS * 24 + 1) * 3600 * 1000);
    expect(await verifySessionToken(token, config, justBefore)).toBe(true);
    expect(await verifySessionToken(token, config, after)).toBe(false);
  });

  it("is invalid after the secret changes", async () => {
    const token = await createSessionToken(config, issued);
    expect(await verifySessionToken(token, { ...config, secret: "b".repeat(40) }, issued)).toBe(
      false,
    );
  });

  it("is invalid after the passcode changes", async () => {
    const token = await createSessionToken(config, issued);
    expect(await verifySessionToken(token, { ...config, passcode: "new words" }, issued)).toBe(
      false,
    );
  });

  it("rejects missing and tampered tokens", async () => {
    const token = await createSessionToken(config, issued);
    expect(await verifySessionToken(undefined, config, issued)).toBe(false);
    expect(await verifySessionToken("not-a-token", config, issued)).toBe(false);
    const [header, , signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ pc: "x", exp: 9999999999 })).toString(
      "base64url",
    );
    expect(await verifySessionToken(`${header}.${forged}.${signature}`, config, issued)).toBe(
      false,
    );
  });

  it("does not contain the passcode", async () => {
    const token = await createSessionToken(config, issued);
    const payload = Buffer.from(token.split(".")[1], "base64url").toString();
    expect(payload.toLowerCase()).not.toContain("purple");
  });
});

describe("safeNextPath", () => {
  it("keeps paths on this site", () => {
    expect(safeNextPath("/recipes/abc?x=1")).toBe("/recipes/abc?x=1");
  });

  it("refuses other sites and odd values", () => {
    expect(safeNextPath("//evil.example")).toBe("/");
    expect(safeNextPath("https://evil.example")).toBe("/");
    expect(safeNextPath("/\\evil.example")).toBe("/");
    expect(safeNextPath("/login")).toBe("/");
    expect(safeNextPath(null)).toBe("/");
  });
});
