import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Predora | The Future of Prediction Markets",
  description: "AI-powered prediction markets on BNB Chain. Bet on anything, earn yield, and let Gemini settle the score.",
  icons: {
    icon: "https://res.cloudinary.com/djslxbghy/image/upload/IMG_4551_e9bv2x.jpg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased selection:bg-sky-500 selection:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
