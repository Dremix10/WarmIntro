import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { AppProvider } from "@/components/AppProvider";
import { NavHeader } from "@/components/NavHeader";
import { FeedbackButton } from "@/components/FeedbackButton";
import { TrackEvents } from "@/components/TrackEvents";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Alma — The warm-intro engine for Brown & Rice students",
  description:
    "Alma reads your resume, finds alumni at companies where you'd thrive, and drafts the outreach you'd actually send. One hour a week is enough.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased bg-[#EAE3D2]`}
    >
      <body className="min-h-full flex flex-col bg-[#EAE3D2] text-[#14182A]">
        <AppProvider>
          <NavHeader />
          {children}
          <FeedbackButton />
          <TrackEvents />
        </AppProvider>
      </body>
    </html>
  );
}
