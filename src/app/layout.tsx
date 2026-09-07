import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import { MotionConfig } from "framer-motion";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Harmony · Outil de chiffrage",
  description: "Outil de chiffrage Harmony — du référentiel d'exigences au prix de vente.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-app text-primary">
        <div className="grain-overlay" aria-hidden="true" />
        <MotionConfig reducedMotion="user">{children}</MotionConfig>
      </body>
    </html>
  );
}
