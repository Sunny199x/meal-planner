"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useState } from "react";

/**
 * After saving, the app opens the recipe with "?saved=1" in the address. This
 * shows a short confirmation and removes the marker again, so reloading the
 * page doesn't show it a second time.
 */
export function SavedNotice() {
  const saved = useSearchParams().get("saved") !== null;
  const [shown, setShown] = useState(saved);

  useEffect(() => {
    if (saved) window.history.replaceState(null, "", window.location.pathname);
  }, [saved]);

  // Clear the message when the page is left, so it doesn't show again on return.
  useLayoutEffect(() => () => setShown(false), []);

  if (!shown) return null;
  return (
    <p role="status" className="rounded-xl bg-sage-light px-4 py-3 text-sm font-medium text-sage">
      ✓ Saved
    </p>
  );
}
