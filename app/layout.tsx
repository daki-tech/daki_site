import type { Metadata } from "next";
import { Cormorant_Garamond, Manrope, Bodoni_Moda } from "next/font/google";
import { Toaster } from "sonner";

import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin", "cyrillic"],
  variable: "--font-cormorant",
  weight: ["400", "500", "600", "700"],
});

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} - Верхній жіночий одяг`,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  icons: {
    icon: "/mini-logo.svg",
    shortcut: "/mini-logo.svg",
    apple: "/mini-logo.svg",
  },
  metadataBase: new URL("https://dakifashion.com"),
  openGraph: {
    type: "website",
    locale: "uk_UA",
    siteName: APP_NAME,
    title: `${APP_NAME} — Верхній жіночий одяг від виробника`,
    description: APP_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="uk" suppressHydrationWarning>
      <body className={`${manrope.variable} ${cormorant.variable} ${bodoni.variable} font-sans`} style={{ ["--font-display" as string]: "var(--font-cormorant)" }}>
        {/* ThemeProvider commented out — light mode only for now */}
        {children}
        <Toaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
