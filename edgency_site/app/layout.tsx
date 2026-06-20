import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Edgency — Emergency AI, On-Device",
  description:
    "Real-time emergency guidance for civilians and first responders. Powered by on-device AI with no cloud dependency — works even when cell towers are down.",
  keywords: ["emergency", "AI", "on-device", "offline", "first responder", "medical"],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
