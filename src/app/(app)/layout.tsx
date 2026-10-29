import Link from "next/link";

const NAV = [
  { href: "/", label: "Groceries" },
  { href: "/recipes", label: "Recipes" },
  { href: "/week", label: "Week" },
  { href: "/settings", label: "Settings" },
];

// Layout for every signed-in page. The proxy guarantees a valid session here.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-line bg-paper/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3">
          <Link
            href="/"
            className="flex items-center font-display text-lg font-semibold whitespace-nowrap text-terracotta-dark sm:text-xl"
          >
            {/* On phones the name doesn't fit next to four links, so the app icon stands in for it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={28} height={28} className="rounded-md sm:hidden" />
            <span className="max-sm:sr-only">Meal Planner</span>
          </Link>
          <nav className="flex items-center text-sm sm:gap-1">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-full px-2 py-2 text-muted hover:bg-cream hover:text-ink sm:px-3"
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
