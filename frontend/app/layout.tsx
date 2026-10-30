import type { ReactNode } from "react";
import Script from "next/script";
import { ThemeProvider } from "@/components/ThemeProvider";
import { THEME_BOOT } from "@/lib/theme";
import "./globals.css";
import "@/components/experience.css";

export const metadata = {
  title: "TutorOS",
  description: "One App Router route per catalog screen id",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body>
        <Script id="theme-boot" strategy="beforeInteractive">
          {THEME_BOOT}
        </Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
