import { Suspense } from "react";
import { getAuthConfig, safeNextPath } from "@/lib/auth/session";
import { LoginForm } from "./login-form";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-line bg-paper p-6">
        <h1 className="flex items-center gap-3 font-display text-3xl font-extrabold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icon.svg" alt="" width={40} height={40} className="rounded-xl" />
          Meal Planner
        </h1>
        <Suspense fallback={<p className="mt-4 text-muted">Loading…</p>}>
          <LoginPanel searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function LoginPanel({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { next } = await searchParams;
  const auth = getAuthConfig();
  if (!auth.ok) return <SetupNeeded problems={auth.problems} />;
  return <LoginForm next={safeNextPath(Array.isArray(next) ? next[0] : next)} />;
}

function SetupNeeded({ problems }: { problems: string[] }) {
  return (
    <div className="mt-4 space-y-3" role="alert">
      <p className="font-medium">Setup needed</p>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        Add these in Vercel under Settings → Environment Variables, then redeploy. The app stays
        locked until then.
      </p>
    </div>
  );
}
