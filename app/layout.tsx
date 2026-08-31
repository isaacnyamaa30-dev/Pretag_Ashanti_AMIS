/*
 * PRETAG Ashanti Membership Intelligence System (AMIS)
 * Copyright (c) 2026 Isaac Nyamaa Boadi. All rights reserved.
 * Developed by Isaac Nyamaa Boadi for PRETAG Ashanti. See /LICENSE.
 */
import type { Metadata } from "next";
import { Archivo, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-source-serif",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PRETAG Ashanti - Membership Intelligence System",
  description:
    "Upload, validate and analyse the monthly Ashanti Regional R20. Zone and district classification, month-on-month membership analytics, and automated R20 exports.",
  applicationName: "PRETAG AMIS",
  authors: [{ name: "Isaac Nyamaa Boadi", url: "mailto:isaacnyamaa30@gmail.com" }],
  creator: "Isaac Nyamaa Boadi",
  publisher: "Isaac Nyamaa Boadi",
  other: {
    copyright: "Copyright (c) 2026 Isaac Nyamaa Boadi. All rights reserved.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${sourceSerif.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
