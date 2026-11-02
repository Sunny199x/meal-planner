"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { PhotoMenu } from "@/components/photo-menu";
import { RecipeForm } from "@/components/recipe-form";
import { fetchPhotoAction, readRecipeAction } from "@/lib/import/actions";
import type { Normalised } from "@/lib/import/normalise";
import { MAX_READ_PHOTOS } from "@/lib/import/photo-limits";
import { setRecipePhotoAction } from "@/lib/recipes/actions";
import { createRecipeAction } from "@/lib/recipes/form-actions";
import { READING_LONG_SIDE, shrinkPhoto } from "@/lib/recipes/shrink-photo";
import { describeSourceLink } from "@/lib/recipes/source-link";

const inputClass =
  "mt-1 block w-full rounded-xl border border-line bg-paper px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

const LINK_HINTS = {
  website: "The app reads the recipe from the page. If the site blocks it, paste the recipe text below instead.",
  youtube:
    "The app reads the video's description, where most cooking videos write the recipe. If the recipe is only said out loud, paste or type it below.",
  youtubeNoKey:
    "Paste the video's description below. (Reading it automatically needs a YouTube key in Vercel, which isn't set up yet.)",
  instagram: "The app can't read Instagram posts yet: copy the caption and paste it below, or add screenshots of the post.",
  withPhotos: "With photos, the recipe is read from the photos (and any text below); the link is kept as the source.",
} as const;

type Reading = { normalised: Normalised; language: string; photo: string | null };
/** A photo of the recipe, shrunk on the phone, with a preview address. */
type RecipePhoto = { id: number; blob: Blob; url: string };

/** The imported photo is fetched by the server, shrunk on the phone and saved with the new recipe. */
async function attachPhoto(savedPath: string, photo: string, link: string) {
  const id = savedPath.match(/\/recipes\/([0-9a-f-]{36})/i)?.[1];
  if (!id) return;
  try {
    const fetched = await fetchPhotoAction(photo);
    if (!fetched.base64 || !fetched.type) return;
    const bytes = Uint8Array.from(atob(fetched.base64), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.set("id", id);
    form.set("photo", await shrinkPhoto(new File([bytes], "photo", { type: fetched.type })), "photo.jpg");
    form.set("from", describeSourceLink(link)?.kind === "youtube" ? "video" : "website");
    form.set("fromUrl", photo);
    await setRecipePhotoAction(form);
  } catch {
    // The recipe is saved either way; a photo can still be added on its page.
  }
}

/** Paste a link or a recipe, have it read, then check and save it in the normal recipe form. */
export function ImportFlow({
  cuisines,
  prepNames,
  ready,
  youtube,
}: {
  cuisines: string[];
  prepNames: string[];
  ready: boolean;
  /** YouTube descriptions can be read without pasting (the YouTube key is set). */
  youtube: boolean;
}) {
  const [link, setLink] = useState("");
  const [text, setText] = useState("");
  const [from, setFrom] = useState("");
  const [reading, setReading] = useState<Reading | null>(null);
  const [keepPhoto, setKeepPhoto] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, startReading] = useTransition();
  const [photos, setPhotos] = useState<RecipePhoto[]>([]);
  const [preparing, setPreparing] = useState(0);
  const nextPhotoId = useRef(0);
  const kind = link.trim() ? (describeSourceLink(link.trim())?.kind ?? null) : null;

  // Previews are freed when the page is left.
  const previews = useRef(new Set<string>());
  useEffect(() => {
    const urls = previews.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  async function addPhotos(chosen: File[]) {
    const files = chosen.slice(0, MAX_READ_PHOTOS - photos.length - preparing);
    if (files.length === 0) return;
    setError(null);
    setPreparing((n) => n + files.length);
    for (const file of files) {
      try {
        const blob = await shrinkPhoto(file, READING_LONG_SIDE);
        const photo = { id: nextPhotoId.current++, blob, url: URL.createObjectURL(blob) };
        previews.current.add(photo.url);
        setPhotos((current) => [...current, photo]);
      } catch (problem) {
        setError(problem instanceof Error ? problem.message : "That photo couldn't be used.");
      } finally {
        setPreparing((n) => n - 1);
      }
    }
  }

  function removePhoto(photo: RecipePhoto) {
    URL.revokeObjectURL(photo.url);
    previews.current.delete(photo.url);
    setPhotos((current) => current.filter((p) => p.id !== photo.id));
  }

  function read(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const form = new FormData();
    form.set("link", link);
    form.set("text", text);
    form.set("from", from);
    photos.forEach((p, i) => form.append("photos", p.blob, `photo-${i + 1}.jpg`));
    startReading(async () => {
      const answer = await readRecipeAction(form);
      if (answer.normalised && answer.language) {
        setReading({ normalised: answer.normalised, language: answer.language, photo: answer.photo ?? null });
        setKeepPhoto(true);
      } else setError(answer.error ?? "Something went wrong. Please try again.");
    });
  }

  const photo = reading?.photo ?? null;
  const afterSave = useCallback(
    async (savedPath: string) => {
      if (photo && keepPhoto) await attachPhoto(savedPath, photo, link);
    },
    [photo, keepPhoto, link],
  );

  if (reading) {
    const { normalised } = reading;
    return (
      <div className="space-y-4">
        <section className="space-y-3 rounded-2xl border border-note/50 bg-note-light p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-lg font-extrabold tracking-tight">Check before saving</h2>
            <button type="button" onClick={() => setReading(null)} className="shrink-0 text-accent underline">
              Start again
            </button>
          </div>
          {photos.length > 0 && (
            <div>
              <p className="font-medium">Your photos, to compare (tap to enlarge):</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {photos.map((p, i) => (
                  <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the phone's own photo */}
                    <img src={p.url} alt={`Photo ${i + 1}`} className="h-20 w-16 rounded-lg border border-line object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}
          {photo && (
            <label className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- a preview of the source's own photo */}
              <img src={photo} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" referrerPolicy="no-referrer" />
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={keepPhoto} onChange={(e) => setKeepPhoto(e.target.checked)} className="h-5 w-5 accent-ink" />
                Use this photo
              </span>
            </label>
          )}
          {normalised.missing.length > 0 && (
            <div>
              <p className="font-medium">Please fill in below:</p>
              <ul className="ml-5 list-disc">
                {normalised.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          {normalised.check.length > 0 && (
            <div>
              <p className="font-medium">Please check:</p>
              <ul className="ml-5 list-disc">
                {normalised.check.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {normalised.seafood.length > 0 && (
            <p className="rounded-xl bg-danger-light px-3 py-2 text-danger">
              <strong>Seafood:</strong> {normalised.seafood.map((f) => f.text).join(", ")}. The household rule is no
              seafood, so this recipe would never be suggested.
            </p>
          )}
          {normalised.changes.length > 0 && (
            <details>
              <summary className="cursor-pointer font-medium">What the app changed ({normalised.changes.length})</summary>
              <ul className="mt-1 ml-5 list-disc">
                {normalised.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
        <RecipeForm
          initial={normalised.values}
          action={createRecipeAction}
          submitLabel="Save recipe"
          cancelHref="/recipes"
          cuisines={cuisines}
          prepNames={prepNames}
          suggestedMakeAhead={normalised.suggestedMakeAhead}
          afterSave={afterSave}
          status="trial"
        />
      </div>
    );
  }

  return (
    <form onSubmit={read} className="space-y-4">
      <p className="rounded-xl border border-line bg-paper px-4 py-3 text-sm text-muted">
        Paste a link to a recipe website, YouTube video or Instagram post, paste the recipe text itself, or add
        photos of a cookbook page, a handwritten recipe or screenshots. Any language works: Claude reads it and writes
        it out in English with metric units, then you check it before saving. Each recipe costs about 1–3 öre.
      </p>
      {!ready && (
        <p role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm text-danger">
          Reading recipes needs an Anthropic API key, which isn&apos;t set up yet. Add{" "}
          <code>ANTHROPIC_API_KEY</code> in Vercel&apos;s environment variables.
        </p>
      )}
      <label className="block">
        <span className="font-medium">Link</span> <span className="text-sm text-muted">(optional)</span>
        <input
          type="url"
          inputMode="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://"
          className={inputClass}
        />
        {kind && (
          <span className="mt-1 block text-sm text-muted">
            {LINK_HINTS[photos.length ? "withPhotos" : kind === "youtube" && !youtube ? "youtubeNoKey" : kind]}
          </span>
        )}
      </label>
      <div>
        <p>
          <span className="font-medium">Photos</span>{" "}
          <span className="text-sm text-muted">(optional, up to {MAX_READ_PHOTOS})</span>
        </p>
        <p className="text-sm text-muted">
          A cookbook page, a handwritten recipe or screenshots, in order: one photo per page. Keep the whole recipe in
          view and the text sharp.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          {photos.map((p, i) => (
            <div key={p.id} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of the phone's own photo */}
              <img src={p.url} alt={`Photo ${i + 1}`} className="h-24 w-20 rounded-lg border border-line object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(p)}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-sm text-paper"
              >
                ×
              </button>
            </div>
          ))}
          {preparing > 0 && (
            <div className="flex h-24 w-20 items-center justify-center rounded-lg border border-line text-center text-xs text-muted">
              Preparing…
            </div>
          )}
          {photos.length + preparing < MAX_READ_PHOTOS && (
            <PhotoMenu multiple onFiles={addPhotos} className="flex h-24 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-line text-center text-xs text-muted hover:border-accent hover:text-ink">
              <span className="text-2xl leading-none">+</span>
              {photos.length ? "Add another" : "Add photos"}
            </PhotoMenu>
          )}
        </div>
      </div>
      <label className="block">
        <span className="font-medium">Recipe text</span>{" "}
        <span className="text-sm text-muted">
          {photos.length ? "(optional with photos)" : kind === "website" || (kind === "youtube" && youtube) ? "(optional with this link)" : ""}
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          placeholder={
            kind === "youtube"
              ? youtube
                ? "Only if the recipe isn't in the video's description"
                : "Paste the video's description here"
              : kind === "instagram"
                ? "Paste the post's caption here"
                : "Paste the ingredients and steps here"
          }
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="font-medium">Where is it from?</span> <span className="text-sm text-muted">(optional)</span>
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          maxLength={80}
          placeholder="For example: Grandma's notebook"
          className={inputClass}
        />
      </label>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || preparing > 0 || (!text.trim() && !link.trim() && photos.length === 0)}
        className="rounded-full bg-accent px-5 py-3 font-medium text-white hover:bg-accent-dark disabled:opacity-50"
      >
        {busy ? "Reading the recipe… (a few seconds)" : "Read recipe"}
      </button>
    </form>
  );
}
