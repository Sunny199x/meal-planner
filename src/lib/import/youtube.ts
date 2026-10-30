// Reading a YouTube video for an import. With YOUTUBE_API_KEY set, YouTube's
// official Data API gives the title, channel, description (where most cooking
// videos write the recipe) and thumbnail. Without a key, the public oEmbed
// information still gives the title, channel and thumbnail, but no description.
import { fetchPublic } from "./fetch-page";

export type Video = { title: string; channel: string; description: string; thumbnail: string | null };

/** The 11-character video ID from a watch, youtu.be, Shorts, embed or live link; null otherwise. */
export function youtubeVideoId(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www\.|m\.|music\.)/, "");
  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;
  if (host === "youtu.be") id = parts[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parts[0] === "watch") id = url.searchParams.get("v");
    else if (["shorts", "embed", "live", "v"].includes(parts[0])) id = parts[1] ?? null;
  }
  return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
}

/** The video from a Data API "videos" answer, or null if it lists none. */
export function readVideoResponse(json: unknown): Video | null {
  const item = (json as { items?: { snippet?: Record<string, unknown> }[] })?.items?.[0]?.snippet;
  if (!item) return null;
  const thumbnails = (item.thumbnails ?? {}) as Record<string, { url?: string } | undefined>;
  const best = ["maxres", "standard", "high", "medium", "default"].map((size) => thumbnails[size]?.url).find(Boolean);
  return {
    title: typeof item.title === "string" ? item.title : "",
    channel: typeof item.channelTitle === "string" ? item.channelTitle : "",
    description: typeof item.description === "string" ? item.description : "",
    thumbnail: best ?? null,
  };
}

const readJson = (body: Uint8Array): unknown => {
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    return null;
  }
};

/** The video's details from the Data API. */
export async function fetchVideo(link: string, key: string): Promise<{ video: Video } | { error: string }> {
  const id = youtubeVideoId(link);
  if (!id) return { error: "That doesn't look like a link to a YouTube video." };
  const fetched = await fetchPublic(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${id}&key=${encodeURIComponent(key)}`,
    { accept: "application/json", maxBytes: 1_000_000 },
  );
  if (!fetched.ok) {
    if (fetched.status === 400 || fetched.status === 403) {
      return { error: "YouTube didn't accept the app's key. Check YOUTUBE_API_KEY in Vercel's environment variables." };
    }
    return { error: fetched.error };
  }
  const video = readVideoResponse(readJson(fetched.body));
  return video ? { video } : { error: "That video wasn't found. It may be private or deleted." };
}

/** Title, channel and thumbnail without a key (YouTube's public oEmbed); no description. */
export async function videoBasics(link: string): Promise<Video | null> {
  const fetched = await fetchPublic(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(link)}`, {
    accept: "application/json",
    maxBytes: 100_000,
  });
  if (!fetched.ok) return null;
  const data = readJson(fetched.body) as Record<string, unknown> | null;
  if (!data) return null;
  return {
    title: typeof data.title === "string" ? data.title : "",
    channel: typeof data.author_name === "string" ? data.author_name : "",
    description: "",
    thumbnail: typeof data.thumbnail_url === "string" ? data.thumbnail_url : null,
  };
}
