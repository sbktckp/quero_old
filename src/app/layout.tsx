import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Quero — NEET UG & PG Exam Prep",
  description:
    "Master NEET UG & PG with daily PYQ challenges, mock tests, and personalized study plans.",
  openGraph: {
    title: "Quero — NEET UG & PG Exam Prep",
    description: "Daily PYQs, mock tests and personalized dashboards for NEET aspirants.",
    type: "website",
  },
  themeColor: "#6C4FF0",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
