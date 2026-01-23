import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXTAUTH_URL || "https://srei.sk"),
  title: {
    default: "SRIA - Slovenská Realitná Investičná Aplikácia",
    template: "%s | SRIA",
  },
  description: "Prémiová platforma pre investovanie do nehnuteľností na slovenskom trhu",
  keywords: [
    "investície do nehnuteľností",
    "slovensko",
    "real estate",
    "investičná platforma",
  ],
  authors: [{ name: "SRIA Team" }],
  creator: "SRIA",
  publisher: "SRIA",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sk" className="dark">
      <body className={inter.className}>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
