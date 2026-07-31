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

export const dynamicParams = false;

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
