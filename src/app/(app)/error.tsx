"use client";

import { useEffect } from "react";

// Shown if a page fails in a way the page itself doesn't handle.
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md space-y-3 rounded-2xl border border-line bg-paper p-6 text-center shadow-sm">
      <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted">
        This page couldn&apos;t be shown. Your recipes are safe. Try again, and if it keeps happening,
        tell Claude what you were doing.
      </p>
      <button
        type="button"
        onClick={() => retry()}
        className="rounded-xl bg-terracotta px-4 py-3 font-medium text-white hover:bg-terracotta-dark"
      >
        Try again
      </button>
    </div>
  );
}
