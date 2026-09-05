import type { Metadata } from "next";
import { Geist, Geist_Mono, Cinzel } from "next/font/google";

import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const cinzel = Cinzel({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Cockfight Chronicles",
  description: "Breed. Fight. Rule.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-(--color-ink) text-(--foreground) md:flex">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <TopBar />
          {children}
        </div>
      </body>
    </html>
  );
}
