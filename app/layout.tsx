import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Seatway — your PKP seats, step by step",
  description:
    "A guided, step-by-step way to find and secure seats on PKP trains — including seats that free up before departure.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 md:px-6 md:py-10">
          <AppHeader />
          {children}
        </div>
      </body>
    </html>
  );
}
