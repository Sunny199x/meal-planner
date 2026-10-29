import { count } from "drizzle-orm";
import { connection } from "next/server";
import { Suspense } from "react";
import { signOut } from "@/lib/auth/actions";
import { databaseKind, describeDatabaseError, getDb } from "@/lib/db";
import { recipes } from "@/lib/db/schema";
import { RecipeFilesPanel } from "./recipe-files-panel";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-semibold">Settings</h1>

      <Section title="Database">
        <Suspense fallback={<p className="text-muted">Checking the database…</p>}>
          <DatabaseStatus />
        </Suspense>
      </Section>

      <Section title="Recipes from files">
        <RecipeFilesPanel />
      </Section>

      <Section title="This device">
        <p className="mb-3 text-sm text-muted">
          Signing out only affects this browser. You&apos;ll need the household passcode to get
          back in.
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-xl border border-line px-4 py-3 font-medium hover:bg-cream"
          >
            Sign out
          </button>
        </form>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-5 shadow-sm sm:p-6">
      <h2 className="mb-3 font-display text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

async function DatabaseStatus() {
  await connection();
  const kind = databaseKind();
  let total: number;
  try {
    const db = await getDb();
    [{ total }] = await db.select({ total: count() }).from(recipes);
  } catch (error) {
    return (
      <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
        {describeDatabaseError(error)}
      </p>
    );
  }
  return (
    <p>
      <span className="text-sage">✓</span> Connected to{" "}
      {kind === "neon"
        ? "the Neon database"
        : "the local stand-in database (this only happens during development)"}
      . It holds {total} {total === 1 ? "recipe" : "recipes"}.
    </p>
  );
}
