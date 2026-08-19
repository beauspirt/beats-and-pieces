import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { AudioProvider } from "@/lib/audio-context";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Beats & Pieces - Beat Battle Platform",
  description: "The home of Romanian beatmakers. Beat battles, public rating, releases, and beats discovery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-[#121212] text-foreground min-h-screen flex flex-col`}>
        <AuthProvider>
          <AudioProvider>
            <Navbar />
            <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-8 py-8">
              {children}
            </main>
            <Footer />
          </AudioProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
