import type { Metadata } from "next";
import { Barlow } from "next/font/google";

import { getActiveLanguage, getDictionary, t } from "@/lib/i18n";

import "./globals.css";

const barlow = Barlow({
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-barlow",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getActiveLanguage();
  const dict = getDictionary(locale);
  return {
    title: t(dict, "meta.app_title"),
    description: t(dict, "meta.app_description"),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getActiveLanguage();
  return (
    <html lang={locale} className={`${barlow.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
