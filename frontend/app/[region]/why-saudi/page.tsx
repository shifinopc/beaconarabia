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

export const dynamicParams = false;

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
