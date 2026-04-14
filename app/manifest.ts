import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Studelio",
    short_name: "Studelio",
    description: "Français collège & lycée avec André, professeur IA",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3063c8",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/apple-touch-icon.png", type: "image/png", sizes: "180x180", purpose: "any" },
    ],
  };
}
