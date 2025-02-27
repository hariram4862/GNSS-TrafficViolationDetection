import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google"; // Import Poppins
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["400", "700"], // Regular & Bold
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GNSS - TechTitans",
  description: "AI-Driven Traffic Violation Detection and Smart Enforcement",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
