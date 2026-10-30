"use client";

import { useEffect, useId, useRef, useState } from "react";

type Extra = { label: string; onSelect: () => void };

/**
 * One photo button that opens a small menu: "Take photo" (phones only, because
 * Android offers just the gallery unless the camera is asked for directly) and
 * "Choose from gallery", plus any `extra` items such as "Remove photo".
 * The file inputs stay on the page while the phone's camera or picker is open,
 * so the chosen photo still arrives after the menu has closed.
 */
export function PhotoMenu({
  children,
  className,
  multiple = false,
  onFiles,
  extra = [],
}: {
  /** The button's content. */
  children: React.ReactNode;
  className: string;
  /** The gallery may pick several photos at once. */
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  extra?: Extra[];
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  function picked(event: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    setOpen(false);
    if (files.length) onFiles(files);
  }

  // Closing waits until the click has opened the camera or picker.
  const closeSoon = () => setTimeout(() => setOpen(false), 0);
  const item = "block w-full cursor-pointer px-4 py-3 text-left text-sm hover:bg-cream";
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} className={className}>
        {children}
      </button>
      <input id={`${id}-camera`} type="file" accept="image/*" capture="environment" onChange={picked} className="sr-only" tabIndex={-1} />
      <input id={`${id}-gallery`} type="file" accept="image/*" multiple={multiple} onChange={picked} className="sr-only" tabIndex={-1} />
      {open && (
        <div role="menu" className="absolute left-0 z-20 mt-1 w-56 overflow-hidden rounded-xl border border-line bg-paper shadow-lg">
          <label htmlFor={`${id}-camera`} role="menuitem" onClick={closeSoon} className={`${item} pointer-fine:hidden`}>
            Take photo
          </label>
          <label htmlFor={`${id}-gallery`} role="menuitem" onClick={closeSoon} className={item}>
            <span className="pointer-fine:hidden">Choose from gallery</span>
            <span className="pointer-coarse:hidden">{multiple ? "Choose photos" : "Choose a photo"}</span>
          </label>
          {extra.map((e) => (
            <button
              key={e.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                e.onSelect();
              }}
              className={`${item} border-t border-line`}
            >
              {e.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
