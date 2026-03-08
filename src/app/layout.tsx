import type { Metadata } from "next";
import { Hedvig_Letters_Serif, Rethink_Sans, Space_Mono } from "next/font/google";
import "./globals.css";

const hedvigLettersSerif = Hedvig_Letters_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
});

const rethinkSans = Rethink_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "WareOS",
  description: "Warehouse Intelligence for Modern Operations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${hedvigLettersSerif.variable} ${rethinkSans.variable} ${spaceMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
