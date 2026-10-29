// Turning what was pasted (a link, text, or both) into text for Claude to read,
// plus where it came from and a photo when the source has one.
import { describeSourceLink } from "../recipes/source-link";
import { fetchPublic, readWebAddress } from "./fetch-page";
import { readRecipePage, recipeAsText } from "./recipe-page";

export type Prepared = {
  text: string;
  source: { name: string; url: string | null };
  photo: string | null;
};

const MAX_PAGE_BYTES = 3_000_000;

/** What a YouTube link's public "oEmbed" information gives: title, channel and thumbnail. */
async function youtubeDetails(url: string): Promise<{ title: string; channel: string; thumbnail: string | null } | null> {
  const fetched = await fetchPublic(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, {
    accept: "application/json",
    maxBytes: 100_000,
  });
  if (!fetched.ok) return null;
  try {
    const data = JSON.parse(new TextDecoder().decode(fetched.body)) as Record<string, unknown>;
    return {
      title: typeof data.title === "string" ? data.title : "",
      channel: typeof data.author_name === "string" ? data.author_name : "",
      thumbnail: typeof data.thumbnail_url === "string" ? data.thumbnail_url : null,
    };
  } catch {
    return null;
  }
}

export async function prepareImport(link: string, text: string, from: string): Promise<Prepared | { error: string }> {
  const pasted = text.trim();
  const named = from.trim().slice(0, 80);
  if (!link.trim()) {
    if (!pasted) return { error: "Paste a link or the recipe text first." };
    return { text: pasted, source: { name: named || "Pasted text", url: null }, photo: null };
  }

  const url = readWebAddress(link);
  if (!url) return { error: "That link isn't a web address. Check it, or paste the recipe text instead." };
  const address = url.toString();
  const kind = describeSourceLink(address)?.kind ?? "website";

  if (kind === "instagram") {
    if (!pasted) return { error: "Instagram doesn't let apps read posts. Copy the post's caption and paste it below." };
    return { text: pasted, source: { name: named || "Instagram", url: address }, photo: null };
  }

  if (kind === "youtube") {
    if (!pasted) {
      return {
        error: "YouTube doesn't let apps read video descriptions. Open the video, copy the description (that's usually where the recipe is) and paste it below.",
      };
    }
    const video = await youtubeDetails(address);
    const heading = video ? `Video title: ${video.title}\nChannel: ${video.channel}\n\n` : "";
    return {
      text: `${heading}Video description:\n${pasted}`,
      source: { name: named || (video?.channel ? `YouTube: ${video.channel}` : "YouTube"), url: address },
      photo: video?.thumbnail ?? null,
    };
  }

  // A website: the pasted text wins if there is any; otherwise read the page.
  const host = url.hostname.replace(/^www\./, "");
  if (pasted) return { text: pasted, source: { name: named || host, url: address }, photo: null };
  const fetched = await fetchPublic(address, { accept: "text/html,application/xhtml+xml", maxBytes: MAX_PAGE_BYTES });
  if (!fetched.ok) return { error: fetched.error };
  const reading = readRecipePage(new TextDecoder().decode(fetched.body), fetched.url);
  const body = reading.recipe ? recipeAsText(reading.recipe) : reading.text;
  if (!reading.recipe && reading.text.length < 200) {
    return { error: "Couldn't find a recipe on that page. Open it, copy the recipe and paste it below." };
  }
  return {
    text: reading.recipe ? body : `Page title: ${reading.title ?? ""}\n\n${body}`,
    source: { name: named || reading.siteName || host, url: address },
    photo: reading.image,
  };
}
