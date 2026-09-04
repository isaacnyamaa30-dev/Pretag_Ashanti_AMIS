/*
 * PRETAG Ashanti Membership Intelligence System (AMIS)
 * Copyright (c) 2026 Saris IT Solution. All Rights Reserved.
 * Developed by Saris IT Solution for PRETAG Ashanti. See /LICENSE.
 */
import type { Metadata, Viewport } from "next";
import { Archivo, Source_Serif_4, IBM_Plex_Mono } from "next/font/google";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-archivo",
  display: "swap",
});
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-serif",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PRETAG Ashanti - Membership Intelligence System",
  description:
    "Upload, validate and analyse the monthly Ashanti Regional R20. Zone and district classification, month-on-month membership analytics, and automated R20 exports.",
  applicationName: "PRETAG AMIS",
  authors: [{ name: "Saris IT Solution", url: "mailto:sarisitsolution@gmail.com" }],
  creator: "Saris IT Solution",
  publisher: "Saris IT Solution",
  other: {
    copyright: "Copyright (c) 2026 Saris IT Solution. All Rights Reserved.",
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "PRETAG AMIS", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192" }, { url: "/icon-512.png", sizes: "512x512" }],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#c4161c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${sourceSerif.variable} ${plexMono.variable}`}>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}
