import type { Metadata } from "next";
import { useTranslation } from '@/lib/i18n';
import { Cairo, Outfit } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "نظام ERP | إدارة موارد المؤسسات",
  description: "نظام شامل لإدارة موارد المؤسسات - المحاسبة، المخزون، المبيعات، المشتريات",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  }
};

import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${cairo.variable} ${outfit.variable}`}>
      <body>
        <Providers>
          {children}
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
