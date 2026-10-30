// The household's own "how far ahead" limits for make-ahead tasks, by task name.
import { eq, sql } from "drizzle-orm";
import { prepLimits } from "../db/schema";
import type { Db } from "../db/types";
import { prepKey } from "./ingredients";

export async function getPrepLimits(db: Db): Promise<Record<string, number>> {
  const rows = await db.select({ key: prepLimits.key, days: prepLimits.days }).from(prepLimits);
  return Object.fromEntries(rows.map((r) => [r.key, r.days]));
}

/** Sets a task's limit, or clears it (null) so the task is done on the evening again. */
export async function setPrepLimit(db: Db, name: string, days: number | null): Promise<Record<string, number>> {
  const key = prepKey(name);
  if (days === null) await db.delete(prepLimits).where(eq(prepLimits.key, key));
  else {
    await db
      .insert(prepLimits)
      .values({ key, name, days })
      .onConflictDoUpdate({ target: prepLimits.key, set: { name, days, updatedAt: sql`now()` } });
  }
  return getPrepLimits(db);
}
