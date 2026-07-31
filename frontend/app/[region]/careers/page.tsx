import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CareersPage from "@/components/pages/CareersPage";
import { REGIONS, SUB_REGIONS, alternatesFor, isRegionSegment } from "@/lib/regions";

type Params = { region: string };

export async function generateStaticParams(): Promise<Params[]> {
  return SUB_REGIONS.map((r) => ({ region: r.segment }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { region: segment } = await params;
  if (!isRegionSegment(segment)) return {};
  const region = REGIONS[segment];

  return {
    title: "Careers",
    description: `Join the Beacon team in ${region.label}.`,
    alternates: alternatesFor(region, "careers"),
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { region: segment } = await params;
  if (!isRegionSegment(segment)) notFound();

  return <CareersPage region={REGIONS[segment]} />;
}
