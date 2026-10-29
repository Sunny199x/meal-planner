"use server";

import { redirect } from "next/navigation";
import { endSession, startSession } from "./server";
import { getAuthConfig, passcodeMatches, safeNextPath } from "./session";

export type SignInState = { error?: string };

const WRONG_PASSCODE_DELAY_MS = 1000;

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const config = getAuthConfig();
  if (!config.ok) {
    return { error: "The app isn't set up yet. " + config.problems.join(" ") };
  }
  const passcode = String(formData.get("passcode") ?? "");
  if (!(await passcodeMatches(passcode, config))) {
    // Slows down anyone trying many guesses.
    await new Promise((resolve) => setTimeout(resolve, WRONG_PASSCODE_DELAY_MS));
    return { error: "That passcode didn't work. Please try again." };
  }
  await startSession(config);
  redirect(safeNextPath(formData.get("next")));
}

export async function signOut() {
  await endSession();
  redirect("/login");
}
