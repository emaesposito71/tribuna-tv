import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tribuna TV — Eventi & Canali 24/7",
  description:
    "Il sito personale per guardare gli eventi in diretta e i canali 24/7: playlist M3U, player integrato, ricerca e filtri. Ottimizzato per iPhone e iPad, usabile da PC.",
  applicationName: "Tribuna TV",
  keywords: ["Tribuna TV", "IPTV", "M3U", "streaming", "eventi live", "canali 24/7"],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/tribuna-logo.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Tribuna TV",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "Tribuna TV — Eventi & Canali 24/7",
    description: "Eventi in diretta e canali 24/7, sempre con te.",
    siteName: "Tribuna TV",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#15161A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
