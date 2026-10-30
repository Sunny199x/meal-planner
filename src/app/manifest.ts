import type { MetadataRoute } from "next";

// Lets phones add the app to the home screen with its own name and icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Meal Planner",
    short_name: "Meals",
    description: "Our recipes and weekly dinner plan.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f4f5",
    theme_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
