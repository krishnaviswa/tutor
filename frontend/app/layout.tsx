import type { ReactNode } from "react";
import Script from "next/script";
import { Hanken_Grotesk, IBM_Plex_Mono, Spectral } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import { THEME_BOOT } from "@/lib/theme";
import "./globals.css";

export const metadata = {
  title: "TutorOS",
  description: "One App Router route per catalog screen id",
};

const spectral = Spectral({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
});

const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const plex = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${spectral.variable} ${hanken.variable} ${plex.variable}`}
    >
      <body>
        <Script id="theme-boot" strategy="beforeInteractive">
          {THEME_BOOT}
        </Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
