import type { ReactNode } from "react";

const CHIP_STYLES = {
  neutral: "border border-line bg-cream text-ink",
  good: "bg-sage-light text-sage",
  warn: "bg-saffron-light text-ink",
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

// Warm tile colours; a cuisine always gets the same one.
const TILE_COLOURS = [
  ["#f1dcc8", "#8a4a22"],
  ["#dfe8da", "#3f5a3b"],
  ["#f6e4bf", "#7a5410"],
  ["#ecd0c4", "#8c3b26"],
  ["#e4dcec", "#5a4370"],
  ["#d9e4e6", "#35585e"],
];

export function RecipeTile({ title, cuisine, size = "md" }: { title: string; cuisine: string; size?: "md" | "lg" }) {
  let hash = 0;
  for (const char of cuisine.toLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const [background, colour] = TILE_COLOURS[hash % TILE_COLOURS.length];
  const dimensions = size === "lg" ? "h-20 w-20 text-4xl" : "h-16 w-16 text-3xl";
  return (
    <div
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-xl font-display font-semibold ${dimensions}`}
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
