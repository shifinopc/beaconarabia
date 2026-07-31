import type { Metadata } from "next";
import "./globals.css";
import { sora } from "./fonts";
import { SITE_URL } from "@/lib/regions";
import { validateEnv } from "@/lib/env";
import { loadSiteInfo } from "@/lib/site";
import { organisationSchema, websiteSchema, jsonLdProps } from "@/lib/structured-data";
import Analytics from "@/components/Analytics";

// Runs once at module load, i.e. when the server boots — so a production
// deployment missing STRAPI_URL or NEXT_PUBLIC_SITE_URL fails immediately and
// visibly, rather than serving fallback content and localhost canonicals.
validateEnv();

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
  /**
   * Site-wide social card.
   *
   * Until now only blog posts carried any Open Graph data, so every share of
   * the homepage or a service page rendered as a bare text link — the legacy
   * site had a share image and it was lost in the migration. Declaring these on
   * the root layout means every route inherits them, and any page that sets its
   * own openGraph block (articles do) overrides rather than merges.
   *
   * The image path is relative on purpose: metadataBase above resolves it to an
   * absolute URL, which is what crawlers require and what the previous sites got
   * wrong by leaving metadataBase unset.
   */
  openGraph: {
    type: "website",
    siteName: "Beacon",
    locale: "en",
    title: "Beacon — Your Global Advisory Partner For Business Growth",
    description:
      "Business incorporation, consultation, accounting, audit and technology services across the GCC.",
    url: SITE_URL,
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Beacon — your global advisory partner for business growth",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Beacon — Your Global Advisory Partner For Business Growth",
    description:
      "Business incorporation, consultation, accounting, audit and technology services across the GCC.",
    images: ["/og-default.png"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Contact details and social profiles come from the CMS, so the structured
  // data describing the company can't drift from what the footer renders.
  const site = await loadSiteInfo();

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
        {/* Site-wide identity, emitted once. Page-level schemas (breadcrumbs,
            articles) reference the organisation by @id rather than repeating
            it. */}
        <script {...jsonLdProps([organisationSchema(site), websiteSchema()])} />
        <Analytics />
        {children}
      </body>
    </html>
  );
}
