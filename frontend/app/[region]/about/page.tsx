import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AboutPage from "@/components/pages/AboutPage";
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
    title: "About Us",
    description: `About Beacon — your global advisory partner. In ${region.label}.`,
    alternates: alternatesFor(region, "about"),
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { region: segment } = await params;
  if (!isRegionSegment(segment)) notFound();

  return <AboutPage region={REGIONS[segment]} />;
}
