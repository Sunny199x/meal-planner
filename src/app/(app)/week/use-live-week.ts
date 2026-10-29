"use client";

import { useEffect, useRef, useState } from "react";
import { loadWeekAction, type SavedWeek } from "@/lib/plan/actions";

type Saved = { update?: Partial<SavedWeek>; error?: string };

/**
 * The week's plan and ticks, kept in step with the other phone: reloaded when
 * the page opens or the app comes back to the front. A change shows straight
 * away, is saved, and then the page shows what the database holds (including
 * the other phone's ticks).
 */
export function useLiveWeek(weekStart: string, initial: SavedWeek) {
  const [week, setWeek] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(0);

  useEffect(() => {
    async function refresh() {
      if (document.visibilityState !== "visible" || pending.current > 0) return;
      const result = await loadWeekAction(weekStart);
      if (pending.current === 0 && result.week) setWeek(result.week);
    }
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [weekStart]);

  function send(local: (week: SavedWeek) => SavedWeek, save: () => Promise<Saved>) {
    setWeek(local);
    setError(null);
    pending.current++;
    save().then(
      (result) => {
        pending.current--;
        if (result.error) setError(result.error);
        else if (result.update && pending.current === 0) setWeek((w) => ({ ...w, ...result.update }));
      },
      () => {
        pending.current--;
        setError("Couldn't reach the app. Check the connection; the last change may not be saved.");
      },
    );
  }

  return { week, error, send };
}
