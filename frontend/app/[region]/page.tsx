import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RegionHome from "@/components/RegionHome";
import { REGIONS, SUB_REGIONS, alternatesFor, isRegionSegment } from "@/lib/regions";

type Params = { region: string };

/** Prerenders /ae and /sa at build time. */
export async function generateStaticParams(): Promise<Params[]> {
  return SUB_REGIONS.map((r) => ({ region: r.segment }));
}

/** Any segment that is not a known region 404s rather than rendering. */
export const dynamicParams = false;

// Next 16: `params` is a Promise and must be awaited.
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { region: segment } = await params;
  if (!isRegionSegment(segment)) return {};

  const region = REGIONS[segment];
  const titles: Record<string, string> = {
    ae: "Launch and Expand Your Business In UAE",
    sa: "Setup Your Business in Saudi Arabia",
  };

  return {
    title: titles[segment],
    description: `Beacon business setup, incorporation and advisory services in ${region.label}.`,
    alternates: alternatesFor(region),
  };
}

export default async function RegionHomePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { region: segment } = await params;
  if (!isRegionSegment(segment)) notFound();

  return <RegionHome region={REGIONS[segment]} />;
}
