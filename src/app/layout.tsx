import type { Metadata } from "next";
import { Rajdhani, Inter, Josefin_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/providers/AuthProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { FirebaseConfigGate } from "@/components/shared/FirebaseConfigGate";
import { ServiceWorkerRegister } from "@/components/shared/ServiceWorkerRegister";
import { AccentThemeApplier } from "@/components/shared/AccentThemeApplier";

const displayFont = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const wordmarkFont = Josefin_Sans({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-wordmark",
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

const ADMIN_ONLY = process.env.NEXT_PUBLIC_ADMIN_ONLY === "true";

// Lets WhatsApp, Telegram, Facebook, X etc. show a nice preview card when the link is shared.
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "PlayConnect — Connect. Compete. Conquer.",
    description: "Weekly tournaments, real prizes and a leaderboard for gamers. Join the next one.",
    siteName: "PlayConnect",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "PlayConnect" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "PlayConnect — Connect. Compete. Conquer.",
    description: "Weekly tournaments, real prizes and a leaderboard for gamers.",
    images: ["/og.png"],
  },
  title: ADMIN_ONLY ? "PlayConnect Admin" : "PlayConnect — Connect. Compete. Conquer.",
  description:
    "The social network built for gamers. Build your player profile, join communities, compete in tournaments, and connect with players worldwide.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: ADMIN_ONLY ? "PlayConnect Admin" : "PlayConnect",
  },
};

export const viewport = {
  themeColor: "#0E0A18",
  viewportFit: "cover" as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} ${wordmarkFont.variable}`} suppressHydrationWarning>
      <body>
        <ServiceWorkerRegister />
        <AccentThemeApplier />
        <ThemeProvider>
          <FirebaseConfigGate>
            <QueryProvider>
              <AuthProvider>{children}</AuthProvider>
            </QueryProvider>
          </FirebaseConfigGate>
        </ThemeProvider>
      </body>
    </html>
  );
}
