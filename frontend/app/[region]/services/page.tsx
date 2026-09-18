import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ServicesPage from "@/components/pages/ServicesPage";
import { REGIONS, SUB_REGIONS, isRegionSegment } from "@/lib/regions";
import { regionPageMetadata } from "@/lib/region-page-meta";

type Params = { region: string };

export async function generateStaticParams(): Promise<Params[]> {
  return SUB_REGIONS.map((r) => ({ region: r.segment }));
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
  if (!isRegionSegment(segment)) return {};
  return regionPageMetadata(segment, "services");
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { region: segment } = await params;
  if (!isRegionSegment(segment)) notFound();

  return <ServicesPage region={REGIONS[segment]} />;
}
