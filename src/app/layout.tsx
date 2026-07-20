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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  ),
  title: "The Odyssey Voyage — an unofficial fan tribute",
  description:
    "An immersive night-sea voyage made by fans to celebrate the excitement around Christopher Nolan's The Odyssey. Sail freely by wind and constellation, discover islands and ruins, and leave a reflection alongside travellers around the world. Independent and unofficial — not affiliated with the filmmakers or studio.",
  keywords: [
    "The Odyssey",
    "fan tribute",
    "Homer",
    "immersive experience",
    "sailing",
    "voyage",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    title: "The Odyssey Voyage — an unofficial fan tribute",
    description:
      "Take the helm on an open night sea. Discover, dive, brave the storm — a fan-made celebration for fellow movie lovers.",
    type: "website",
    siteName: "The Odyssey Voyage (fan-made)",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Odyssey Voyage — an unofficial fan tribute",
    description:
      "An immersive fan-made night-sea voyage celebrating the excitement around The Odyssey.",
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
