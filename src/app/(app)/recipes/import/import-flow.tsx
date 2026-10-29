"use client";

import { useCallback, useState, useTransition } from "react";
import { RecipeForm } from "@/components/recipe-form";
import { fetchPhotoAction, readRecipeAction } from "@/lib/import/actions";
import type { Normalised } from "@/lib/import/normalise";
import { setRecipePhotoAction } from "@/lib/recipes/actions";
import { createRecipeAction } from "@/lib/recipes/form-actions";
import { shrinkPhoto } from "@/lib/recipes/shrink-photo";
import { describeSourceLink } from "@/lib/recipes/source-link";

const inputClass =
  "mt-1 block w-full rounded-xl border border-line bg-paper px-3 py-2 text-base outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/30";

const LINK_HINTS = {
  website: "The app reads the recipe from the page. If the site blocks it, paste the recipe text below instead.",
  youtube:
    "The app reads the video's description, where most cooking videos write the recipe. If the recipe is only said out loud, paste or type it below.",
  youtubeNoKey:
    "Paste the video's description below. (Reading it automatically needs a YouTube key in Vercel, which isn't set up yet.)",
  instagram: "The app can't read Instagram posts yet: copy the caption and paste it below.",
} as const;

type Reading = { normalised: Normalised; language: string; photo: string | null };

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
  const kind = link.trim() ? (describeSourceLink(link.trim())?.kind ?? null) : null;

  function read(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startReading(async () => {
      const answer = await readRecipeAction(link, text, from);
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
        <section className="space-y-3 rounded-2xl border border-saffron/50 bg-saffron-light p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Check before saving</h2>
            <button type="button" onClick={() => setReading(null)} className="shrink-0 text-terracotta underline">
              Start again
            </button>
          </div>
          {photo && (
            <label className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- a preview of the source's own photo */}
              <img src={photo} alt="" className="h-16 w-24 shrink-0 rounded-lg object-cover" referrerPolicy="no-referrer" />
              <span className="flex items-center gap-2">
                <input type="checkbox" checked={keepPhoto} onChange={(e) => setKeepPhoto(e.target.checked)} className="h-5 w-5 accent-terracotta" />
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
        />
      </div>
    );
  }

  return (
    <form onSubmit={read} className="space-y-4">
      <p className="rounded-xl border border-line bg-paper px-4 py-3 text-sm text-muted">
        Paste a link to a recipe website, YouTube video or Instagram post, or paste the recipe text itself (from a
        website, a caption, a video description, or the text of a photo via iPhone Live Text or Google Lens). Any
        language works: Claude reads it and writes it out in English with metric units, then you check it before
        saving. Each recipe costs about 1–3 öre.
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
            {LINK_HINTS[kind === "youtube" && !youtube ? "youtubeNoKey" : kind]}
          </span>
        )}
      </label>
      <label className="block">
        <span className="font-medium">Recipe text</span>{" "}
        <span className="text-sm text-muted">
          {kind === "website" || (kind === "youtube" && youtube) ? "(optional with this link)" : ""}
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
        disabled={busy || (!text.trim() && !link.trim())}
        className="rounded-xl bg-terracotta px-5 py-3 font-medium text-white hover:bg-terracotta-dark disabled:opacity-50"
      >
        {busy ? "Reading the recipe… (a few seconds)" : "Read recipe"}
      </button>
    </form>
  );
}
