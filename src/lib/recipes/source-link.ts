// Recognises where a recipe link points, so the recipe page can say "Watch on
// YouTube" rather than a bare link. Only the address is looked at; nothing is
// fetched from the site.

export type SourceLink = {
  kind: "youtube" | "instagram" | "website";
  /** Text for the link, e.g. "Watch on YouTube" or "Open on bbcgoodfood.com". */
  label: string;
};

/** The website a link points to ("hellofresh.se"), or null if it isn't a web address. */
export function linkSite(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  } catch {
    return null;
  }
}

export function describeSourceLink(url: string): SourceLink | null {
  const host = linkSite(url);
  if (!host) return null;
  if (host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com")) {
    return { kind: "youtube", label: "Watch on YouTube" };
  }
  if (host === "instagram.com" || host === "instagr.am") {
    return { kind: "instagram", label: "Open on Instagram" };
  }
  return { kind: "website", label: `Open on ${host}` };
}
