import type { ReactNode } from "react";

const CHIP_STYLES = {
  neutral: "border border-line bg-soft text-ink",
  good: "bg-good-light text-good",
  warn: "bg-note-light text-ink",
  danger: "bg-danger-light text-danger",
} as const;

export function Chip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof CHIP_STYLES;
}) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${CHIP_STYLES[tone]}`}>
      {children}
    </span>
  );
}

// Earthy tile colours, the same family as the page colours; a cuisine always gets the same one.
const TILE_COLOURS = [
  ["#e3efe5", "#166534"],
  ["#efe4ec", "#6b3a5b"],
  ["#e1ecec", "#2f5d62"],
  ["#f3ecd9", "#8a6a1f"],
  ["#e9e9ec", "#3f3f46"],
  ["#ece6df", "#6b5440"],
];

const TILE_SIZES = { sm: "h-12 w-12 text-xl", md: "h-16 w-16 text-3xl", lg: "h-20 w-20 text-4xl" } as const;

/** The recipe's photo, or a coloured tile with its first letter when there is none. */
export function RecipeTile({
  title,
  cuisine,
  photo = null,
  size = "md",
}: {
  title: string;
  cuisine: string;
  photo?: string | null;
  size?: keyof typeof TILE_SIZES;
}) {
  const dimensions = TILE_SIZES[size];
  if (photo) {
    // eslint-disable-next-line @next/next/no-img-element -- photos are already shrunk and served by the app
    return <img src={photo} alt="" loading="lazy" className={`shrink-0 rounded-xl object-cover ${dimensions}`} />;
  }
  let hash = 0;
  for (const char of cuisine.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const [background, colour] = TILE_COLOURS[hash % TILE_COLOURS.length];
  return (
    <div
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-xl font-display font-extrabold tracking-tight ${dimensions}`}
      style={{ background, color: colour }}
    >
      {title.trim().charAt(0).toUpperCase()}
    </div>
  );
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export const DIET_LABEL = { vegetarian: "Vegetarian", vegan: "Vegan", meat: "Meat" } as const;

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
      {children}
    </p>
  );
}
