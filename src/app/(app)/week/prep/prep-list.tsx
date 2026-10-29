"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Chip } from "@/components/ui";
import { tickPrepAction, type SavedWeek } from "@/lib/plan/actions";
import { planPortions } from "@/lib/plan/portions";
import type { PrepLimit } from "@/lib/plan/food-safety";
import { buildPrepList, eveningPlans, prepDayOffset, type EveningPlan, type PrepTask } from "@/lib/plan/prep";
import { shortTitle, type PlanRecipe } from "@/lib/plan/suggest";
import { DAY_NAMES, DAY_SHORT, prepDaysOf, type PrepState } from "@/lib/plan/types";
import { formatQuantity } from "@/lib/recipes/format";
import { useLiveWeek } from "../use-live-week";

const dayShort = (day: number | null) => (day === null ? "No evening" : DAY_SHORT[day]);
const sentence = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** "Sunday, before the week" for the weekend before; the day's name otherwise. */
export function prepDayName(offset: number): string {
  return offset < 0 ? `${DAY_NAMES[offset + 7]}, before the week` : DAY_NAMES[offset];
}

function limitText(limit: PrepLimit | null): string {
  if (!limit) return "no limit set yet";
  const days = limit.days === 0 ? "on the day only" : `at most ${limit.days} ${limit.days === 1 ? "day" : "days"} ahead`;
  return limit.by === "household" ? `${days}, your limit` : `${days}, ${limit.note}`;
}

export function PrepList({
  weekStart,
  initial,
  recipes,
  limits,
}: {
  weekStart: string;
  initial: SavedWeek;
  recipes: PlanRecipe[];
  /** The household's own limits, by task key. */
  limits: Record<string, number>;
}) {
  const { week, error, send } = useLiveWeek(weekStart, initial);
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const known = useMemo(() => week.dishes.filter((d) => byId.has(d.recipeId)), [week.dishes, byId]);
  const household = useMemo(() => new Map(Object.entries(limits)), [limits]);
  const portions = useMemo(() => planPortions(week.setup, known, byId), [week.setup, known, byId]);
  const tasks = useMemo(() => buildPrepList(week.setup, known, byId, portions, household), [week.setup, known, byId, portions, household]);
  const evenings = useMemo(
    () => eveningPlans(week.setup, known, byId, portions, household),
    [week.setup, known, byId, portions, household],
  );

  const isDone = (key: string) => week.prep[key] === true;
  function toggle(key: string, done: boolean) {
    send(
      (w) => {
        const prep: PrepState = { ...w.prep };
        if (done) prep[key] = true;
        else delete prep[key];
        return { ...w, prep };
      },
      () =>
        tickPrepAction(weekStart, key, done).then((r) => ({
          error: r.error,
          apply: r.prep ? (w: SavedWeek) => ({ ...w, prep: r.prep! }) : undefined,
        })),
    );
  }

  const allTasks = evenings.flatMap((e) => e.cook?.tasks ?? []);
  const onTheEvening = allTasks.filter((t) => t.prepDay === null).length;
  const noLimit = [...new Set(allTasks.filter((t) => !t.limit).map((t) => t.name))];
  const prepDays = [...new Set(prepDaysOf(week.setup).map(prepDayOffset))].sort((a, b) => a - b);
  const doneCount = tasks.filter((t) => isDone(t.key)).length;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {tasks.length} {tasks.length === 1 ? "task" : "tasks"} on prep days ({prepDays.map((d) => prepDayName(d).split(",")[0]).join(" and ") || "none set"}),{" "}
        {onTheEvening} done on the day of the dinner. {doneCount} ticked off.
      </p>
      {noLimit.length > 0 && (
        <p className="rounded-xl bg-saffron-light px-4 py-3 text-sm">
          {noLimit.length} make-ahead {noLimit.length === 1 ? "task has" : "tasks have"} no &ldquo;how far
          ahead&rdquo; limit yet ({noLimit.join(", ")}), so {noLimit.length === 1 ? "it's" : "they're"} done on the
          day of the dinner.{" "}
          <Link href="/settings#prep-limits" className="text-terracotta underline">
            Set limits in Settings
          </Link>
          .
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
          Not saved: {error}
        </p>
      )}

      {prepDays.map((day) => {
        const today = tasks.filter((t) => t.prepDay === day);
        return (
          <section key={day} className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
            <h2 className="font-display text-lg font-semibold">{prepDayName(day)}</h2>
            {today.length === 0 ? (
              <p className="mt-1 text-sm text-muted">Nothing to prep ahead on this day.</p>
            ) : (
              <ul className="mt-1 divide-y divide-line">
                {today.map((task) => (
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
        );
      })}

      <section className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
        <h2 className="font-display text-lg font-semibold">Each evening</h2>
        <ul className="mt-1 divide-y divide-line">
          {evenings.map((evening) => (
            <EveningRow key={evening.day} weekStart={weekStart} evening={evening} isDone={isDone} />
          ))}
        </ul>
      </section>

      <p className="text-xs text-muted">
        Each task goes on the latest prep day that is within how far ahead it may be done; otherwise it&apos;s done on
        the evening. The same task on the same day is one batch. Limits are yours, or from published food-safety
        guidance with its source named: the app never makes up how long food keeps. Prep days are set in the
        week&apos;s setup.
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
        {task.limit && <p className="text-xs text-muted">Done ahead: {limitText(task.limit)}.</p>}
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
  isDone: (key: string) => boolean;
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
            Cook {formatQuantity(cook.portions)} portions. The recipe says {cook.timeTotalMin} min, including any
            parts done ahead.
          </p>
          {[...new Set(cook.tasks.flatMap((t) => (t.prepDay === null ? [] : [t.prepDay])))].map((day) => (
            <p key={day} className="text-sm">
              <span className="text-muted">Done on {prepDayName(day).split(",")[0]}: </span>
              {cook.tasks
                .filter((t) => t.prepDay === day)
                .map((t) => `${t.key && isDone(t.key) ? "✓ " : ""}${t.name}`)
                .join(", ")}
            </p>
          ))}
          {cook.tasks.some((t) => t.prepDay === null) && (
            <p className="text-sm">
              <span className="text-muted">Do this evening: </span>
              {cook.tasks
                .filter((t) => t.prepDay === null)
                .map((t) => `${t.name} (${limitText(t.limit)})`)
                .join(", ")}
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
