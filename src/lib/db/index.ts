import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import type { Db } from "./types";

export type { Db } from "./types";

export class DatabaseNotConnectedError extends Error {
  constructor() {
    super("No database is connected yet. In Vercel, add one under the Storage tab.");
  }
}

/** Vercel's Neon integration sets DATABASE_URL; older setups used POSTGRES_URL. */
export function databaseUrl(env: Record<string, string | undefined> = process.env) {
  return env.DATABASE_URL || env.POSTGRES_URL || null;
}

export function databaseKind(): "neon" | "local" | "missing" {
  if (databaseUrl()) return "neon";
  return process.env.VERCEL ? "missing" : "local";
}

// Kept on globalThis so the dev server's hot reload doesn't open a second copy.
const cache = globalThis as unknown as { mealPlannerDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  cache.mealPlannerDb ??= connect().catch((error) => {
    cache.mealPlannerDb = undefined;
    throw error;
  });
  return cache.mealPlannerDb;
}

async function connect(): Promise<Db> {
  const url = databaseUrl();
  if (url) return drizzle(neon(url), { schema }) as unknown as Db;
  if (process.env.VERCEL) throw new DatabaseNotConnectedError();
  const { openLocalDb } = await import("./local");
  return openLocalDb();
}

/** Turns a database failure into a sentence for the screen. */
export function describeDatabaseError(error: unknown): string {
  if (error instanceof DatabaseNotConnectedError) return error.message;
  const message = error instanceof Error ? error.message : String(error);
  if (/relation "recipes" does not exist/i.test(message)) {
    return "The database tables haven't been created yet. They are set up during each Vercel build, so redeploying should fix this.";
  }
  return `Couldn't reach the database (${message.split("\n")[0]}).`;
}
