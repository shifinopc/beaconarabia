import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WhyRegionPage from "@/components/pages/WhyRegionPage";
import { REGIONS, WHY_PAGES, regionUrl } from "@/lib/regions";

type Params = { region: string };

const SLUG = WHY_PAGES.ae!.slug;

/** UAE only — the Saudi equivalent lives at /sa/why-saudi. */
export async function generateStaticParams(): Promise<Params[]> {
  return [{ region: REGIONS.ae.segment }];
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
  if (segment !== REGIONS.ae.segment) return {};

  return {
    title: "Why Dubai — Gateway to Limitless Potential",
    description:
      "Why start a business in the UAE: the D33 economic agenda, mainland, freezone and offshore jurisdictions, Dubai's startup ecosystem and the setup process step by step.",
    // Plain canonical, not alternatesFor(): this page exists in one region only.
    alternates: { canonical: regionUrl(REGIONS.ae, SLUG) },
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { region: segment } = await params;
  if (segment !== REGIONS.ae.segment) notFound();

  return <WhyRegionPage region={REGIONS.ae} />;
}
