import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import AppProvider from "@/context/AppProvider";
import I18nProvider from "@/context/I18nProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { APP_NAME, APP_SLOGAN } from "@/lib/config";
import { getLocale, getServerT } from "@/lib/i18n/server";
import "./globals.css";

// Brand style guide font (was Plus Jakarta Sans).
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Explicit viewport so every browser (Brave included) lays the app out at
// device width instead of a scaled-down desktop viewport.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} — ${APP_SLOGAN}`,
    template: `%s · ${APP_NAME}`,
  },
  description: "Pintap turns personal recommendations into tracked commerce links.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const t = await getServerT();
  return (
    // The font variable class must sit on <html>, not <body>: the @theme
    // --font-sans token references var(--font-inter) at :root, and an
    // undefined var there makes --font-sans compute to invalid everywhere
    // (custom properties inherit their *computed* value).
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <a href="#main-content" className="skip-link">
          {t("common.skipToContent")}
        </a>
        <I18nProvider initialLocale={locale}>
          <AppProvider>
            <ToastProvider>{children}</ToastProvider>
          </AppProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
