import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "TutorOS",
  description: "One App Router route per catalog screen id",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
