import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: "CrypDo - NFT Linked Real Cash | Crypto Cards",
  description: "Experience the future of money with CrypDo - NFT-linked real hard cash pegged with USDT and internationally usable crypto cards. Physical crypto for the modern world.",
  keywords: "crypto, NFT, USDT, physical cash, crypto cards, blockchain, decentralized finance",
  authors: [{ name: "CrypDo Team" }],
  openGraph: {
    title: "CrypDo - NFT Linked Real Cash",
    description: "NFT-linked real hard cash pegged with USDT and internationally usable crypto cards.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} scroll-smooth`}
    >
      <body className="min-h-screen bg-black text-white overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
