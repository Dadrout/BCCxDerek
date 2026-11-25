import type { Metadata } from "next";
import "@fontsource-variable/onest";
import "@fontsource/martian-mono/400.css";
import "@fontsource/martian-mono/500.css";
import "./globals.css";
import { PRODUCT_NAME, PRODUCT_TAGLINE } from "@/lib/brand";

export const metadata: Metadata = { title: `${PRODUCT_NAME}: ${PRODUCT_TAGLINE}`, description: "Демо-прототип ITU Hackathon-2026" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
