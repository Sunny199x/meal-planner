"use client";

import { useActionState } from "react";
import { signIn, type SignInState } from "@/lib/auth/actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<SignInState, FormData>(signIn, {});

  return (
    <form action={formAction} className="mt-4 space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="text-sm font-medium">Household passcode</span>
        <input
          name="passcode"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="mt-1 block w-full rounded-xl border border-line bg-cream px-3 py-3 text-base outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/30"
        />
      </label>
      {state.error && (
        <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-terracotta px-4 py-3 font-medium text-white hover:bg-terracotta-dark disabled:opacity-60"
      >
        {pending ? "Checking…" : "Open"}
      </button>
      <p className="text-xs text-muted">Capital letters and extra spaces don&apos;t matter.</p>
    </form>
  );
}
