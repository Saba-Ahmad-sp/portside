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
  title: {
    default: "Portside — the lead desk for export teams",
    template: "%s · Portside",
  },
  description:
    "Portside turns website enquiries into a worked pipeline: one shared desk for capture, assignment, notes and a complete activity trail.",
  openGraph: {
    title: "Portside — the lead desk for export teams",
    description:
      "Capture, assign and work export enquiries in one place, with a complete audit trail on every lead.",
    type: "website",
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
