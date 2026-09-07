import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CareersPage from "@/components/pages/CareersPage";
import { REGIONS, SUB_REGIONS, isRegionSegment } from "@/lib/regions";
import { regionPageMetadata } from "@/lib/region-page-meta";

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
  return regionPageMetadata(segment, "careers");
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { region: segment } = await params;
  if (!isRegionSegment(segment)) notFound();

  return <CareersPage region={REGIONS[segment]} />;
}
