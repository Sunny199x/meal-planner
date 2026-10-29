"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Chip } from "@/components/ui";
import { tickPrepAction, type SavedWeek } from "@/lib/plan/actions";
import { prepKey } from "@/lib/plan/ingredients";
import { planPortions } from "@/lib/plan/portions";
import { buildPrepList, eveningPlans, type EveningPlan, type PrepTask } from "@/lib/plan/prep";
import { shortTitle, type PlanRecipe } from "@/lib/plan/suggest";
import { DAY_NAMES, DAY_SHORT, type PrepState } from "@/lib/plan/types";
import { formatQuantity } from "@/lib/recipes/format";
import { useLiveWeek } from "../use-live-week";

const dayShort = (day: number | null) => (day === null ? "No evening" : DAY_SHORT[day]);
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

export function PrepList({ weekStart, initial, recipes }: { weekStart: string; initial: SavedWeek; recipes: PlanRecipe[] }) {
  const { week, error, send } = useLiveWeek(weekStart, initial);
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const known = useMemo(() => week.dishes.filter((d) => byId.has(d.recipeId)), [week.dishes, byId]);
  const portions = useMemo(() => planPortions(week.setup, known, byId), [week.setup, known, byId]);
  const tasks = useMemo(() => buildPrepList(known, byId, portions), [known, byId, portions]);
  const evenings = useMemo(() => eveningPlans(week.setup, known, byId, portions), [week.setup, known, byId, portions]);

  const isDone = (key: string) => week.prep[key] === true;
  function toggle(key: string, done: boolean) {
    send(
      (w) => {
        const prep: PrepState = { ...w.prep };
        if (done) prep[key] = true;
        else delete prep[key];
        return { ...w, prep };
      },
      () => tickPrepAction(weekStart, key, done).then((r) => ({ error: r.error, update: r.prep && { prep: r.prep } })),
    );
  }
  const doneCount = tasks.filter((t) => isDone(t.key)).length;
  const shared = tasks.filter((t) => t.dishes.length > 1).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {tasks.length} {tasks.length === 1 ? "task" : "tasks"} for Sunday
        {shared > 0 && <>, {shared} shared between dishes</>}. {doneCount} done.
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
          Not saved: {error}
        </p>
      )}

      <section className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
        <h2 className="font-display text-lg font-semibold">On Sunday</h2>
        {tasks.length === 0 ? (
          <p className="mt-1 text-muted">
            None of this week&apos;s dishes has make-ahead tasks. They come from each recipe&apos;s &ldquo;Make
            ahead&rdquo; section.
          </p>
        ) : (
          <ul className="mt-1 divide-y divide-line">
            {tasks.map((task) => (
              <TaskRow
                key={task.key}
                weekStart={weekStart}
                task={task}
                done={isDone(task.key)}
                onToggle={(done) => toggle(task.key, done)}
              />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Each evening</h2>
        <ul className="mt-1 divide-y divide-line">
          {evenings.map((evening) => (
            <EveningRow key={evening.day} weekStart={weekStart} evening={evening} isDone={(name) => isDone(prepKey(name))} />
          ))}
        </ul>
      </section>

      <p className="text-xs text-muted">
        Tasks with the same name in different recipes are done as one batch. The app doesn&apos;t say how long
        prepared food keeps: go by the recipe&apos;s advice and your own judgement.
      </p>
    </div>
  );
}

function TaskRow({
  weekStart,
  task,
  done,
  onToggle,
}: {
  weekStart: string;
  task: PrepTask;
  done: boolean;
  onToggle: (done: boolean) => void;
}) {
  const descriptions = [...new Set(task.dishes.map((d) => d.description.trim()).filter(Boolean))];
  return (
    <li className="flex items-start gap-3 py-3">
      <input
        type="checkbox"
        checked={done}
        onChange={(e) => onToggle(e.target.checked)}
        aria-label={`Done: ${task.name}`}
        className="mt-1 h-5 w-5 shrink-0 accent-terracotta"
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p>
          <span className={done ? "text-muted line-through" : "font-medium"}>{task.name}</span>
          {task.dishes.length > 1 && (
            <span className="ml-2 align-middle">
              <Chip>one batch for {task.dishes.length} dishes</Chip>
            </span>
          )}
        </p>
        <p className="text-sm text-muted">
          For{" "}
          {task.dishes.map((d, i) => (
            <span key={d.recipeId}>
              {i > 0 && ", "}
              {dayShort(d.day)}{" "}
              <Link href={`/recipes/${d.recipeId}?portions=${d.portions}&week=${weekStart}`} className="underline hover:text-ink">
                {shortTitle(d.title)}
              </Link>{" "}
              ({formatQuantity(d.portions)} portions)
            </span>
          ))}
        </p>
        {!done &&
          (descriptions.length === 1 ? (
            <p className="text-sm">{sentence(descriptions[0])}</p>
          ) : (
            <ul className="space-y-0.5 text-sm">
              {task.dishes
                .filter((d) => d.description.trim())
                .map((d) => (
                  <li key={d.recipeId}>
                    <span className="text-muted">{shortTitle(d.title)}:</span> {d.description}
                  </li>
                ))}
            </ul>
          ))}
        {!done && task.amounts.length > 0 && (
          <p className="text-sm">
            <span className="text-muted">Amounts: </span>
            {task.amounts.map((a) => `${a.line} (${dayShort(a.day)})`).join(" + ")}
          </p>
        )}
      </div>
    </li>
  );
}

function EveningRow({
  weekStart,
  evening,
  isDone,
}: {
  weekStart: string;
  evening: EveningPlan;
  isDone: (taskName: string) => boolean;
}) {
  const { cook, leftovers, lunchBoxes, freezer } = evening;
  const after = [
    ...lunchBoxes.map((l) => `pack ${l.count} lunch ${l.count === 1 ? "box" : "boxes"} for ${l.name}`),
    ...(freezer > 0 ? [`freeze ${formatQuantity(freezer)} ${freezer === 1 ? "portion" : "portions"}`] : []),
  ];
  return (
    <li className="space-y-1 py-3">
      <p className="text-xs tracking-wide text-muted uppercase">{DAY_NAMES[evening.day]}</p>
      {cook ? (
        <>
          <Link
            href={`/recipes/${cook.recipeId}?portions=${cook.portions}&week=${weekStart}`}
            className="font-medium hover:text-terracotta"
          >
            {cook.title}
          </Link>
          <p className="text-sm text-muted">
            Cook {formatQuantity(cook.portions)} portions. The recipe says {cook.timeTotalMin} min, including the
            parts done on Sunday.
          </p>
          {cook.prepped.length > 0 && (
            <p className="text-sm">
              <span className="text-muted">Done on Sunday: </span>
              {cook.prepped.map((name, i) => (
                <span key={name}>
                  {i > 0 && ", "}
                  {isDone(name) ? "✓ " : ""}
                  {i === 0 ? name : name.charAt(0).toLowerCase() + name.slice(1)}
                </span>
              ))}
              . The rest is done on the evening.
            </p>
          )}
          {after.length > 0 && <p className="text-sm">After dinner: {after.join("; ")}.</p>}
        </>
      ) : leftovers ? (
        <>
          <p className="font-medium">Leftovers: {leftovers.title}</p>
          <p className="text-sm text-muted">Cooked on {DAY_NAMES[leftovers.cookedOn]}; no cooking tonight.</p>
        </>
      ) : (
        <p className="text-muted">Nothing chosen yet</p>
      )}
    </li>
  );
}
