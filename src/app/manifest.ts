import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} · ${SITE.tagline}`,
    short_name: SITE.name,
    description: SITE.description,
    id: "/",
    start_url: "/discover",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbfaf8",
    theme_color: "#8f2445",
    categories: ["lifestyle", "social"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
