import Link from "next/link";
import { signOut } from "@/lib/auth/actions";

// Layout for every signed-in page. The proxy guarantees a valid session here.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-line bg-paper/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="font-display text-xl font-semibold text-terracotta-dark">
            Meal Planner
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-full px-3 py-2 text-sm text-muted hover:bg-cream hover:text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
