// Runs at the start of every Vercel build (see "build" in package.json):
// creates or updates the database tables from the migrations in drizzle/.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!url) {
  console.log(
    process.env.VERCEL
      ? "⚠ No database connected (DATABASE_URL is missing), so database setup was skipped. Add one in Vercel under Storage."
      : "No DATABASE_URL set, so database setup was skipped. The local stand-in database sets itself up when the app starts.",
  );
} else {
  await migrate(drizzle(neon(url)), { migrationsFolder: "drizzle" });
  console.log("✓ Database tables are up to date.");
}
