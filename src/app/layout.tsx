import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Asuntoräätäli – Remonttitarjousten vertailu",
  description:
    "Vertaile remonttitarjouksia standardoidulla määräluettelolla. Tee tarjouksista 100% vertailukelpoisia.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi">
      <body className={cn("min-h-screen bg-background antialiased", inter.variable, "font-sans")}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
