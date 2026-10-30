// Turning what was pasted (a link, text, or both) into text for Claude to read,
// plus where it came from and a photo when the source has one.
import { describeSourceLink } from "../recipes/source-link";
import { fetchPublic, readWebAddress } from "./fetch-page";
import { readRecipePage, recipeAsText } from "./recipe-page";
import { fetchVideo, videoBasics, type Video } from "./youtube";

export type Prepared = {
  text: string;
  source: { name: string; url: string | null };
  photo: string | null;
  /** The text is a video's description, which may not contain the recipe at all. */
  fromVideoDescription?: boolean;
};

export const NO_RECIPE_IN_VIDEO =
  "This video's description doesn't include the recipe (some videos only say it out loud). Paste or type the recipe below; the link and photo stay.";

const videoText = (video: Video, description: string) =>
  `Video title: ${video.title}\nChannel: ${video.channel}\n\nVideo description:\n${description}`;

const MAX_PAGE_BYTES = 3_000_000;

/**
 * `photos` is how many photos of the recipe come with it. With photos, the recipe
 * is read from them (plus any pasted text), and a link is kept only as the source.
 */
export async function prepareImport(link: string, text: string, from: string, photos = 0): Promise<Prepared | { error: string }> {
  const pasted = text.trim();
  const named = from.trim().slice(0, 80);
  if (!link.trim()) {
    if (!pasted && !photos) return { error: "Paste a link or the recipe text, or add photos, first." };
    return { text: pasted, source: { name: named || (photos ? "Photo" : "Pasted text"), url: null }, photo: null };
  }

  const url = readWebAddress(link);
  if (!url) return { error: "That link isn't a web address. Check it, or paste the recipe text instead." };
  const address = url.toString();
  const kind = describeSourceLink(address)?.kind ?? "website";

  if (photos) {
    const name = kind === "instagram" ? "Instagram" : kind === "youtube" ? "YouTube" : url.hostname.replace(/^www\./, "");
    return { text: pasted, source: { name: named || name, url: address }, photo: null };
  }

  if (kind === "instagram") {
    if (!pasted) {
      return { error: "The app can't read Instagram posts yet. Copy the post's caption and paste it below, or add screenshots of the post." };
    }
    return { text: pasted, source: { name: named || "Instagram", url: address }, photo: null };
  }

  if (kind === "youtube") {
    const key = process.env.YOUTUBE_API_KEY;
    const sourceFor = (video: Video | null) => ({ name: named || (video?.channel ? `YouTube: ${video.channel}` : "YouTube"), url: address });
    if (pasted) {
      // The recipe was pasted; the video only adds its title, channel and thumbnail.
      const found = key ? await fetchVideo(address, key) : null;
      const video = found && "video" in found ? found.video : await videoBasics(address);
      return {
        text: video ? videoText(video, pasted) : `Video description:\n${pasted}`,
        source: sourceFor(video),
        photo: video?.thumbnail ?? null,
      };
    }
    if (!key) {
      return {
        error: "Paste the video's description below. Reading it automatically needs a YouTube key in Vercel (YOUTUBE_API_KEY), which isn't set up yet.",
      };
    }
    const found = await fetchVideo(address, key);
    if ("error" in found) return { error: found.error };
    if (found.video.description.trim().length < 40) return { error: NO_RECIPE_IN_VIDEO };
    return {
      text: videoText(found.video, found.video.description),
      source: sourceFor(found.video),
      photo: found.video.thumbnail,
      fromVideoDescription: true,
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
