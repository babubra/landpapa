import type { Metadata } from "next";
import { Montserrat, Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SiteNavigationSchema } from "@/components/seo/SiteNavigationSchema";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

import { getSiteSettings } from "@/lib/server-config";
import { SITE_URL } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();

  // SEO Title: из настроек или дефолт
  const title = settings.site_title || "РКК земля - Земельные участки в Калининграде";

  // SEO Description: из настроек или "мягкий" дефолт из подзаголовка
  const description = settings.site_description || settings.site_subtitle || "Продажа земельных участков в Калининградской области";

  // Keywords
  const keywords = settings.site_keywords ? settings.site_keywords.split(",").map(k => k.trim()) : ["земельные участки", "калининград", "ижс", "купить землю"];

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      template: `%s | ${settings.site_name || "РКК земля"}`,
    },
    description: description,
    keywords: keywords,
    openGraph: {
      type: "website",
      siteName: settings.site_name || "РКК земля",
      locale: "ru_RU",
      url: SITE_URL,
      title: title,
      description: description,
      images: settings.og_image ? [{ url: settings.og_image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: title,
      description: description,
      images: settings.og_image ? [settings.og_image] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    alternates: {
      canonical: "/",
    },
    icons: {
      icon: [
        { url: `${SITE_URL}/favicon.svg`, type: "image/svg+xml" },
        { url: `${SITE_URL}/favicon.ico`, sizes: "any", type: "image/x-icon" },
      ],
    },
    manifest: "/manifest.json",
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${montserrat.variable} ${manrope.variable} antialiased font-sans`}
      >
        <SiteNavigationSchema />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SiteSettingsProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </SiteSettingsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
