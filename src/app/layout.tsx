import type { Metadata } from "next";
import { Cairo } from 'next/font/google';
import { Providers } from '@/components/Providers';
import "./globals.css";

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-cairo",
  display: "swap",
});


export const metadata: Metadata = {
  title: "قيد - QAID | نظام إدارة موارد المؤسسات",
  description: "نظام قيد السحابي المتكامل لإدارة المبيعات، الحسابات، والمخزون بذكاء وسهولة.",
  openGraph: {
    title: "قيد - QAID | نظام إدارة موارد المؤسسات",
    description: "نظام قيد السحابي المتكامل لإدارة المبيعات، الحسابات، والمخزون بذكاء وسهولة.",
    url: "https://qaid-erp.vercel.app/",
    siteName: "QAID ERP",
    images: [
      {
        url: "/icon.png",
        width: 512,
        height: 512,
      },
    ],
    locale: "ar_EG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "قيد - QAID",
    description: "نظام قيد السحابي المتكامل لإدارة المبيعات والحسابات.",
    images: ["/icon.png"],
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  }
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={cairo.variable}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var lang = localStorage.getItem('erp_lang') || 'ar';
                var theme = localStorage.getItem('erp-theme') || 'dark';
                document.documentElement.lang = lang === 'en' ? 'en-GB' : lang;
                document.documentElement.dir = (lang === 'en' ? 'ltr' : 'rtl');
                if (theme === 'light') {
                  document.documentElement.setAttribute('data-theme', 'light');
                } else {
                  document.documentElement.removeAttribute('data-theme');
                }
              } catch (e) {}
            })()`,
          }}
        />
      </head>
      <body>
        <Providers>
          {children}
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
