import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/inter-tight";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meal Planner",
  description: "Turn our recipe collection into a weekly dinner plan.",
  // A private household app: keep the sign-in page out of search engines.
  robots: { index: false, follow: false },
  appleWebApp: { title: "Meals", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
