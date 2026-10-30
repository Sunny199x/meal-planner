import Link from "next/link";
import { Suspense } from "react";
import { Menu, NavLinks } from "./nav-links";

// Layout for every signed-in page. The proxy guarantees a valid session here.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-line bg-paper">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight whitespace-nowrap text-ink sm:text-xl"
          >
            {/* On phones the name doesn't fit next to four links, so only the app icon shows. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={32} height={32} className="rounded-lg" />
            <span className="max-sm:sr-only">Meal Planner</span>
          </Link>
          <Suspense fallback={<Menu path={null} />}>
            <NavLinks />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
