"use client";

import { useEffect, useRef, useState } from "react";

export type Saved<T> = { error?: string; apply?: (data: T) => T };

/**
 * Data shared by both phones, kept in step: reloaded when the page opens or
 * the app comes back to the front. A change shows straight away, is saved, and
 * then the page shows what the database holds (including the other phone's
 * changes) once nothing else is still being saved.
 */
export function useLiveData<T>(key: string, load: () => Promise<T | null>, initial: T) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(0);
  const loader = useRef(load);
  useEffect(() => {
    loader.current = load;
  });

  useEffect(() => {
    async function refresh() {
      if (document.visibilityState !== "visible" || pending.current > 0) return;
      const fresh = await loader.current();
      if (pending.current === 0 && fresh) setData(fresh);
    }
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [key]);

  function send(local: (data: T) => T, save: () => Promise<Saved<T>>) {
    setData(local);
    setError(null);
    pending.current++;
    save().then(
      (result) => {
        pending.current--;
        if (result.error) setError(result.error);
        else if (result.apply && pending.current === 0) setData(result.apply);
      },
      () => {
        pending.current--;
        setError("Couldn't reach the app. Check the connection; the last change may not be saved.");
      },
    );
  }

  return { data, error, send };
}
