import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gentanala - Luxury Watches with Digital Identity",
  description: "Premium timepieces with embedded NFC technology. Each watch carries a unique digital identity.",
  keywords: ["luxury watches", "NFC watches", "digital identity", "phygital", "gentanala"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased bg-white text-zinc-900`}>
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}

