// A Postgres database that runs inside the app process (PGlite), used for
// development and tests in places that can't reach Neon. Never used on Vercel.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "./schema";
import type { Db } from "./types";

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");
export const LOCAL_DATA_DIR = path.join(process.cwd(), ".data", "pglite");

/** Pass "memory://" for a throwaway database (tests). */
export async function openLocalDb(dataDir: string = LOCAL_DATA_DIR): Promise<Db> {
  if (!dataDir.includes("://")) await mkdir(path.dirname(dataDir), { recursive: true });
  const db = drizzle({ client: new PGlite(dataDir), schema });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as Db;
}
