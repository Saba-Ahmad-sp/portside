import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

import { Providers } from "@/components/providers";

import "./globals.css";

/**
 * Fraunces for display — optical sizing and a little wonk, so headings read as
 * printed signage rather than a UI font scaled up.
 * IBM Plex Sans for reading, IBM Plex Mono for anything a person compares down
 * a column: values, quantities, ids, timestamps.
 */
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["SOFT", "WONK", "opsz"],
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-sans",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  /**
   * Resolves relative metadata URLs against the deployed origin. Open Graph
   * requires absolute URLs — a share card cannot resolve "/og.png" against
   * nothing — and without this Next warns on every build.
   *
   * Falls back to the dev port rather than throwing: a missing site URL should
   * degrade a link preview, not stop the app from starting.
   */
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3100",
  ),
  title: {
    default: "Portside — the lead desk for import sourcing teams",
    template: "%s · Portside",
  },
  description:
    "Portside turns website enquiries into a worked pipeline: one shared desk for capture, assignment, notes and a complete activity trail.",
  openGraph: {
    title: "Portside — the lead desk for import sourcing teams",
    description:
      "Capture, assign and work enquiries for imported riding gear and vehicle parts in one place, with a complete audit trail on every lead.",
    type: "website",
    url: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
