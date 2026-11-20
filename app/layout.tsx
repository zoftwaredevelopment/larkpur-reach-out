import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import { BrandChrome } from "@/components/BrandChrome";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Larkspur Reach Out",
  description: "WhatsApp outreach CRM for Nigerian SME recruitment leads",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${montserrat.className} antialiased`}>
        <div className="min-h-screen">
          <BrandChrome />
          {children}
        </div>
      </body>
    </html>
  );
}
