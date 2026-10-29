const steps = [
  { label: "App skeleton on Vercel", done: true },
  { label: "Household passcode", done: false },
  { label: "Database and loading recipes from files", done: false },
  { label: "Browse, search and filter recipes", done: false },
  { label: "Add and edit recipes by hand", done: false },
  { label: "Polish and phone checks", done: false },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-sage">
          Milestone 1 · Foundation
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">
          Work in progress
        </h1>
        <p className="mt-3 max-w-prose text-muted">
          This is the first version of our meal planner. If you can read this on
          your phone, the Vercel preview works. The recipe collection arrives in
          the next few steps.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
        <h2 className="font-display text-xl font-semibold">Steps</h2>
        <ol className="mt-3 space-y-2">
          {steps.map((step, i) => (
            <li key={step.label} className="flex items-center gap-3">
              <span
                className={
                  step.done
                    ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage text-sm font-semibold text-white"
                    : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-sm text-muted"
                }
                aria-hidden
              >
                {step.done ? "✓" : i + 1}
              </span>
              <span className={step.done ? "" : "text-muted"}>
                {step.label}
                {step.done && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
