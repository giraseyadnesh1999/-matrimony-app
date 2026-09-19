import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return ["", "/privacy", "/terms", "/grievance"].map((p) => ({ url: `${base}${p}` }));
}
