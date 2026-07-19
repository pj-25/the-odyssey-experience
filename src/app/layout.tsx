import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Odyssey — A Voyage Before the Film",
  description:
    "An immersive night-sea voyage celebrating Christopher Nolan's The Odyssey. Cross five chapters of an epic journey, leave a reflection in the global voyage log, and count down to the premiere with travellers around the world.",
  keywords: [
    "The Odyssey",
    "Christopher Nolan",
    "Homer",
    "immersive experience",
    "film premiere",
    "voyage",
  ],
  openGraph: {
    title: "The Odyssey — A Voyage Before the Film",
    description:
      "Board the ship. Cross the night sea. Count down to the premiere with travellers around the world.",
    type: "website",
    siteName: "The Odyssey Experience",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Odyssey — A Voyage Before the Film",
    description:
      "An immersive night-sea voyage celebrating Christopher Nolan's The Odyssey.",
  },
};

export const viewport: Viewport = {
  themeColor: "#050a14",
  width: "device-width",
  initialScale: 1,
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
      className={`${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
