import type { Metadata, Viewport } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import { SITE } from "@/config/site";
import { Providers } from "@/components/providers";
import { RegisterServiceWorker } from "@/components/register-sw";
import "./globals.css";

// next/font self-hosts these files at build time: visitors' browsers never contact Google,
// so no IP address or usage data leaks to a third party.
const sans = Geist({ variable: "--font-geist-sans", subsets: ["latin"], display: "swap" });
const display = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: { default: `${SITE.name} · ${SITE.tagline}`, template: `%s · ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  robots: { index: true, follow: true },
  // Profiles are private to members; only marketing pages should be indexed.
  appleWebApp: { capable: true, title: SITE.name, statusBarStyle: "default" },
  icons: { apple: "/pwa/apple-180.png" },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#0f0e0d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-4 focus:py-2 focus:shadow-lg"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
