import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WhyRegionPage from "@/components/pages/WhyRegionPage";
import { REGIONS, WHY_PAGES, regionUrl } from "@/lib/regions";

type Params = { region: string };

const SLUG = WHY_PAGES.sa!.slug;

/**
 * Saudi only — unlike the other [region] routes this does not map over
 * SUB_REGIONS. The UAE equivalent lives at /ae/why-dubai, so /ae/why-saudi must
 * 404 rather than render Saudi content under an Emirati URL.
 */
export async function generateStaticParams(): Promise<Params[]> {
  return [{ region: REGIONS.sa.segment }];
}

/**
 * true, not false, even though the only valid segments are prerendered.
 *
 * With false, Next 16 cannot regenerate these pages after an on-demand
 * revalidation: a site-wide /api/revalidate (which the Strapi webhook sends on
 * every publish) left every one of them returning 404 with NoFallbackError
 * until the app restarted, as it did on 18 Sep 2026. Unknown segments still
 * 404 — the page calls notFound() for them itself.
 */
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { region: segment } = await params;
  if (segment !== REGIONS.sa.segment) return {};

  return {
    title: "Why Saudi Arabia — Vision 2030",
    description:
      "Why establish your business in the Kingdom: Vision 2030, market access, government incentives and the giga-projects reshaping Saudi Arabia.",
    // A plain canonical, not alternatesFor(): this page exists in one region
    // only, so advertising en-AE and x-default variants would point hreflang at
    // URLs that 404.
    alternates: { canonical: regionUrl(REGIONS.sa, SLUG) },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { region: segment } = await params;
  if (segment !== REGIONS.sa.segment) notFound();

  return <WhyRegionPage region={REGIONS.sa} />;
}
