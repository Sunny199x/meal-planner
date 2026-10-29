// Fetching a web page or image for an import. The address comes from a person,
// so it is only fetched if it points at the public internet: never at this
// server, a home network or a cloud provider's internal addresses. Redirects
// are checked the same way, and time and size are capped.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 10_000;

/** False for loopback, private, link-local, carrier-grade NAT and other non-public addresses. */
export function isPublicAddress(address: string): boolean {
  const ip = address.toLowerCase().replace(/^\[|\]$/g, "");
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicAddress(mapped[1]);
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 192 && b === 0) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    return true;
  }
  if (isIP(ip) === 6) {
    if (ip === "::" || ip === "::1") return false;
    if (/^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || /^ff/.test(ip)) return false;
    return true;
  }
  return false;
}

/** The address if it's an ordinary http(s) web address, otherwise null. */
export function readWebAddress(text: string): URL | null {
  let url: URL;
  try {
    url = new URL(text.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  return url;
}

/** Whether a host is on the public internet; "unknown" when its name can't be looked up (often a typo). */
async function checkHost(hostname: string): Promise<"public" | "private" | "unknown"> {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return isPublicAddress(host) ? "public" : "private";
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return "private";
  try {
    const addresses = await lookup(host, { all: true });
    if (addresses.length === 0) return "unknown";
    return addresses.every((a) => isPublicAddress(a.address)) ? "public" : "private";
  } catch {
    return "unknown";
  }
}

export type Fetched = { ok: true; body: Uint8Array; contentType: string; url: string } | { ok: false; error: string };

export async function fetchPublic(address: string, { accept, maxBytes }: { accept: string; maxBytes: number }): Promise<Fetched> {
  const start = readWebAddress(address);
  if (!start) return { ok: false, error: "That isn't a web address the app can open." };
  let url: URL = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const host = await checkHost(url.hostname);
    if (host === "unknown") return { ok: false, error: "Couldn't find that website. Check the link, or paste the recipe text instead." };
    if (host === "private") return { ok: false, error: "That address isn't on the public internet." };
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: accept, "User-Agent": "Mozilla/5.0 (compatible; MealPlanner/1.0; household recipe import)" },
      });
    } catch {
      return { ok: false, error: "The site didn't answer in time. Try again, or paste the recipe text instead." };
    }
    if (response.status >= 300 && response.status < 400) {
      const next = response.headers.get("location");
      const target: URL | null = next ? readWebAddress(new URL(next, url).toString()) : null;
      if (!target) return { ok: false, error: "The site sent the app somewhere it can't follow." };
      url = target;
      continue;
    }
    if (!response.ok || !response.body) {
      return { ok: false, error: `The site said no (error ${response.status}). Some sites block apps; paste the recipe text instead.` };
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        return { ok: false, error: "That page or picture is too large." };
      }
      chunks.push(value);
    }
    const body = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.length;
    }
    return { ok: true, body, contentType: response.headers.get("content-type") ?? "", url: url.toString() };
  }
  return { ok: false, error: "The site redirected too many times." };
}
