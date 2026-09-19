import { ImageResponse } from "next/og";

/** App icons for the web app manifest and iOS home screen, rendered once at build time. */
const ICONS: Record<string, { size: number; maskable: boolean }> = {
  "icon-192.png": { size: 192, maskable: false },
  "icon-512.png": { size: 512, maskable: false },
  "maskable-512.png": { size: 512, maskable: true },
  "apple-180.png": { size: 180, maskable: true },
};

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(ICONS).map((file) => ({ file }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const icon = ICONS[file];
  if (!icon) return new Response("Not found", { status: 404 });

  // Maskable/iOS icons are cropped by the OS, so the glyph stays inside the central safe zone.
  const glyph = Math.round(icon.size * (icon.maskable ? 0.5 : 0.62));
  const radius = icon.maskable ? 0 : Math.round(icon.size * 0.22);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#8f2445",
          borderRadius: radius,
          color: "#ffffff",
          fontSize: glyph,
          fontWeight: 700,
        }}
      >
        S
      </div>
    ),
    { width: icon.size, height: icon.size },
  );
}
