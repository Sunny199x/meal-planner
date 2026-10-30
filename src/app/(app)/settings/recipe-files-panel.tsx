"use client";

import { useActionState } from "react";
import type { FileReport, LoadReport } from "@/lib/recipes/load-files";
import { loadFromFiles, resetEverything, type LoadState } from "./actions";

export function RecipeFilesPanel() {
  const [loadState, loadAction, loading] = useActionState<LoadState, FormData>(loadFromFiles, {});
  const [resetState, resetAction, resetting] = useActionState<LoadState, FormData>(
    resetEverything,
    {},
  );
  const busy = loading || resetting;

  return (
    <div className="space-y-6">
      <form action={loadAction} className="space-y-3">
        <p className="text-sm text-muted">
          Reads every recipe file in the <code>seed-recipes</code> folder on GitHub. New files are
          added and changed files are updated. Favourites are kept, and recipes added in the app are
          never touched. Run this after adding or changing a recipe file.
        </p>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-accent px-4 py-3 font-medium text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {loading ? "Loading…" : "Load recipes from files"}
        </button>
        <Outcome state={loadState} />
      </form>

      <form action={resetAction} className="space-y-3 border-t border-line pt-6">
        <h3 className="font-medium">Reset everything</h3>
        <p className="text-sm text-muted">
          Deletes <strong>all</strong> recipes, including ones added in the app and all favourites,
          then loads the files again. This can&apos;t be undone.
        </p>
        <label className="block text-sm">
          Type <strong>RESET</strong> to confirm
          <input
            name="confirm"
            autoComplete="off"
            autoCapitalize="characters"
            className="mt-1 block w-full max-w-xs rounded-xl border border-line bg-soft px-3 py-2 text-base"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl border border-danger px-4 py-3 font-medium text-danger hover:bg-danger-light disabled:opacity-60"
        >
          {resetting ? "Resetting…" : "Reset everything"}
        </button>
        <Outcome state={resetState} />
      </form>
    </div>
  );
}

function Outcome({ state }: { state: LoadState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
        {state.error}
      </p>
    );
  }
  return state.report ? <Report report={state.report} /> : null;
}

const STATUS_LABEL: Record<FileReport["status"], string> = {
  added: "New",
  updated: "Updated",
  "skipped-edited": "Skipped: edited in the app",
  "not-loaded": "Not loaded",
};

const STATUS_STYLE: Record<FileReport["status"], string> = {
  added: "bg-good-light text-good",
  updated: "bg-good-light text-good",
  "skipped-edited": "bg-note-light text-ink",
  "not-loaded": "bg-danger-light text-danger",
};

function Report({ report }: { report: LoadReport }) {
  const counts = (status: FileReport["status"]) =>
    report.files.filter((f) => f.status === status).length;
  const loaded = counts("added") + counts("updated");

  return (
    <div className="space-y-3 rounded-xl border border-line bg-soft p-4 text-sm" aria-live="polite">
      <p className="font-medium">
        Loaded {loaded} of {report.files.length} {report.files.length === 1 ? "file" : "files"}:{" "}
        {counts("added")} new, {counts("updated")} updated.
        {counts("skipped-edited") > 0 && ` ${counts("skipped-edited")} skipped.`}
        {counts("not-loaded") > 0 && ` ${counts("not-loaded")} couldn't be loaded.`}
      </p>
      <p className="text-muted">The database now holds {report.totalRecipes} recipes.</p>
      {report.removed.length > 0 && (
        <p>Removed because their file was deleted: {report.removed.join(", ")}.</p>
      )}
      {report.keptAsAppRecipes.length > 0 && (
        <p>
          Kept as app recipes because they were edited in the app, although their file was
          deleted: {report.keptAsAppRecipes.join(", ")}.
        </p>
      )}
      <ul className="space-y-2">
        {report.files.map((file) => (
          <li key={file.fileName} className="rounded-lg bg-paper p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{file.title ?? file.fileName}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[file.status]}`}>
                {STATUS_LABEL[file.status]}
              </span>
            </div>
            <p className="mt-1 break-all font-mono text-xs text-muted">{file.fileName}</p>
            {file.problems.length > 0 && (
              <ul className="mt-2 space-y-1">
                {file.problems.map((problem, i) => (
                  <li
                    key={i}
                    className={problem.level === "error" ? "text-danger" : "text-ink"}
                  >
                    {problem.level === "error" ? "Error: " : "Warning: "}
                    {problem.message}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
