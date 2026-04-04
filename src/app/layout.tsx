import type { Metadata } from "next";
import { Cairo, Outfit } from "next/font/google";
import { Providers } from "@/components/Providers";
import "./globals.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isBuild = process.env.NEXT_PHASE === 'phase-production-build';
  const session = isBuild ? null : await getServerSession(authOptions);

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${cairo.variable} ${outfit.variable}`}>
      <body>
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
