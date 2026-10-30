"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Each part of the app is underlined in its own colour (see globals.css).
const NAV = [
  { href: "/", label: "Groceries", colour: "decoration-groceries" },
  { href: "/recipes", label: "Recipes", colour: "decoration-recipes" },
  { href: "/week", label: "Week", colour: "decoration-week" },
  { href: "/settings", label: "Settings", colour: "decoration-settings" },
] as const;

/** The menu, with the current part of the app in bold and underlined in its colour. */
export function NavLinks() {
  return <Menu path={usePathname()} />;
}

/** The same menu with nothing marked, shown while the page's address is read. */
export function Menu({ path }: { path: string | null }) {
  return (
    <nav className="flex items-center text-sm sm:gap-1">
      {NAV.map(({ href, label, colour }) => {
        const current = path !== null && (href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? "page" : undefined}
            className={`rounded-full px-2 py-2 sm:px-3 ${
              current
                ? `font-bold text-ink underline decoration-[3px] underline-offset-8 ${colour}`
                : "text-muted hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
