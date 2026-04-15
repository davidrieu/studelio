import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { DM_Mono, DM_Sans, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SkipToContent } from "@/components/skip-to-content";
import { A11yColorVisionFilters } from "@/components/a11y-color-vision-filters";
import { A11Y_PREFERENCES_COOKIE, a11yHtmlDataProps, parseA11yCookie } from "@/lib/a11y-preferences";
import { cn } from "@/lib/utils";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

export const metadata: Metadata = {
  title: "Studelio",
  description: "Français collège & lycée avec André, professeur IA",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "Studelio",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#3063c8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const prefs = parseA11yCookie(cookies().get(A11Y_PREFERENCES_COOKIE)?.value);
  const htmlA11y = a11yHtmlDataProps(prefs);

  return (
    <html lang="fr" suppressHydrationWarning {...htmlA11y}>
      <body className={cn(dmSans.variable, dmMono.variable, playfair.variable, "min-h-screen font-sans antialiased")}>
        <A11yColorVisionFilters />
        <SkipToContent />
        <Providers a11y={prefs}>{children}</Providers>
      </body>
    </html>
  );
}
