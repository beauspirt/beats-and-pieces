import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AudioProvider } from "@/lib/audio-context";
import { AuthProvider } from "@/lib/auth-context";
import { SITE_URL, DEFAULT_OG_IMAGE } from "@/lib/metadata";

import { BottomFloatingPlayer } from "@/components/BottomFloatingPlayer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Beats & Pieces - Beat Battle Platform",
    template: "%s | Beats & Pieces",
  },
  description: "The home of Romanian beatmakers. Beat battles, public rating, releases, and beats discovery.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.png", type: "image/png" },
    ],
    apple: "/icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "Beats & Pieces",
    images: [{ url: DEFAULT_OG_IMAGE, alt: "Beats & Pieces" }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[#121212] text-foreground min-h-screen flex flex-col w-full`}>
        <AuthProvider>
          <AudioProvider>
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-12 sm:pb-16">
              {children}
            </main>
            <Footer />
            <BottomFloatingPlayer />
          </AudioProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
