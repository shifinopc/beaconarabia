import type { Metadata } from "next";
import "./globals.css";
import { sora } from "./fonts";
import { SITE_URL } from "@/lib/regions";

export const metadata: Metadata = {
  // Unset on all three of the previous sites, which made Open Graph and
  // Twitter image URLs resolve against localhost.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Beacon — Your Global Advisory Partner For Business Growth",
    template: "%s | Beacon",
  },
  description:
    "Business incorporation, consultation, accounting, audit and technology services across the GCC.",
  keywords: [
    "business consulting",
    "management consulting",
    "company formation",
    "business setup UAE",
    "company formation saudi arabia",
    "business consultants GCC",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sora.variable} h-full antialiased`}>
      {/*
        suppressHydrationWarning is scoped to <body>'s own attributes, not its
        children. Browser extensions — Grammarly in particular — inject
        attributes such as `data-new-gr-c-s-check-loaded` and
        `data-gr-ext-installed` onto <body> before React hydrates, which React
        otherwise reports as a hydration mismatch. Nothing in our markup causes
        it and there is no way to prevent the injection, so the warning is
        suppressed at exactly the element affected.
      */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
