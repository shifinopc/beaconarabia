import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PartnersPage from "@/components/pages/PartnersPage";
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
    title: "Partners",
    description: `Partner with Beacon in ${region.label}.`,
    alternates: alternatesFor(region, "partners"),
  };
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { region: segment } = await params;
  if (!isRegionSegment(segment)) notFound();

  return <PartnersPage region={REGIONS[segment]} />;
}
