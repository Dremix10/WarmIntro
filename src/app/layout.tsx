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
  title: "Alma - Email-first recruiting for investment banking",
  description:
    "Alma helps students find the right bankers, draft outreach in their voice, mirror it into Gmail, and track replies through the investment banking pipeline.",
  metadataBase: new URL("https://alma.careers"),
  openGraph: {
    title: "Alma - Email-first recruiting for investment banking",
    description:
      "Start networking into investment banking without already speaking finance.",
    url: "https://alma.careers",
    siteName: "Alma",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Alma - coffee chats, not cold sweat",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Alma - Email-first recruiting for investment banking",
    description:
      "Start networking into investment banking without already speaking finance.",
    images: ["/opengraph-image"],
  },
};

export const viewport: import("next").Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
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
