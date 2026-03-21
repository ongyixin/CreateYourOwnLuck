import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FitCheck — AI Brand Intelligence",
  description:
    "AI-powered brand perception and ideal customer profile analysis, grounded in live web data.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
