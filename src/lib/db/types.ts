import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "./schema";

/** Either the Neon database (on Vercel) or the local stand-in; both speak Postgres. */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;
