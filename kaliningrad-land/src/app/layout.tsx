import type { Metadata } from "next";
import { Montserrat, Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SiteSettingsProvider } from "@/contexts/SiteSettingsContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
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

import { getSiteSettings, SITE_URL } from "@/lib/config";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const title = settings.site_title || "РКК земля";
  const subtitle = settings.site_subtitle || "Купить земельные участки в Калининграде и Калининградской области";

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${title} - ${subtitle}`,
      template: `%s | ${title}`,
    },
    description: subtitle,
    openGraph: {
      type: "website",
      siteName: title,
      locale: "ru_RU",
      url: SITE_URL,
      title: `${title} - ${subtitle}`,
      description: subtitle,
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} - ${subtitle}`,
      description: subtitle,
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
      canonical: SITE_URL,
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
