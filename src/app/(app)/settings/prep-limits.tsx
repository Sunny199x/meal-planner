"use client";

import { useState, useTransition } from "react";
import { setPrepLimitAction } from "@/lib/plan/actions";
import { MAX_PREP_DAYS, type PrepLimit } from "@/lib/plan/food-safety";

export type PrepLimitRow = {
  key: string;
  name: string;
  recipes: number;
  /** The household's own limit, if set. */
  own: number | null;
  /** What published guidance says, if it covers this task. */
  guidance: PrepLimit | null;
};

const label = (days: number) => (days === 0 ? "On the day" : `${days} ${days === 1 ? "day" : "days"} ahead`);

/** One choice per make-ahead task: how far ahead it may be done. */
export function PrepLimits({ rows }: { rows: PrepLimitRow[] }) {
  const [own, setOwn] = useState<Record<string, number>>(
    Object.fromEntries(rows.flatMap((r) => (r.own === null ? [] : [[r.key, r.own]]))),
  );
  const [error, setError] = useState<string | null>(null);
  const [, startSaving] = useTransition();

  function choose(row: PrepLimitRow, value: string) {
    const days = value === "" ? null : Number(value);
    const before = own;
    setOwn((current) => {
      const next = { ...current };
      if (days === null) delete next[row.key];
      else next[row.key] = days;
      return next;
    });
    setError(null);
    startSaving(async () => {
      const result = await setPrepLimitAction(row.name, days);
      if (result.limits) setOwn(result.limits);
      else {
        setOwn(before);
        setError(result.error ?? "Couldn't save.");
      }
    });
  }

  if (rows.length === 0) return <p className="text-muted">No recipe has make-ahead tasks yet.</p>;
  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <ul className="divide-y divide-line">
        {rows.map((row) => {
          const max = row.guidance?.days ?? MAX_PREP_DAYS;
          return (
            <li key={row.key} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{row.name}</p>
                <p className="text-xs text-muted">
                  In {row.recipes} {row.recipes === 1 ? "recipe" : "recipes"}
                  {row.guidance ? <> · Guidance: {label(row.guidance.days).toLowerCase()} ({row.guidance.note})</> : " · No published guidance in the app yet"}
                </p>
              </div>
              <select
                aria-label={`How far ahead: ${row.name}`}
                value={own[row.key] ?? ""}
                onChange={(e) => choose(row, e.target.value)}
                className="rounded-xl border border-line bg-cream px-2 py-1 text-sm"
              >
                <option value="">{row.guidance ? `Guidance (${label(row.guidance.days).toLowerCase()})` : "On the day"}</option>
                {Array.from({ length: max }, (_, i) => i + 1).map((days) => (
                  <option key={days} value={days}>
                    {label(days)}
                  </option>
                ))}
              </select>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
