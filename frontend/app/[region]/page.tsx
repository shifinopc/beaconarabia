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

  /**
   * Titles and descriptions are written per region, not generated from a
   * template.
   *
   * The previous description was `...advisory services in ${region.label}` for
   * both, which produced two near-identical snippets competing for the same
   * queries — the keyword cannibalisation these regional editions exist to
   * avoid. Each now leads with what that market actually searches for: mainland
   * and free zone routes in the UAE, MISA registration and Vision 2030 in the
   * Kingdom.
   *
   * Titles gain the service term alongside the place. "Setup Your Business in
   * Saudi Arabia" named the country but not the job; "company formation" and
   * "business setup" are the phrases with the volume behind them.
   *
   * Length is tuned against the root layout's `%s | Beacon` template, which
   * does apply here because these are nested segments — unlike the global
   * homepage, which has to spell the brand out itself.
   */
  const meta: Record<string, { title: string; description: string }> = {
    ae: {
      title: "Business Setup & Company Formation in Dubai, UAE",
      description:
        "Set up a business in the UAE with Beacon. Mainland, free zone and offshore incorporation, licensing, accounting, audit and tax, from our Dubai office.",
    },
    sa: {
      title: "Business Setup & Company Formation in Saudi Arabia",
      description:
        "Enter the Saudi market with Beacon. MISA registration, company formation, licensing, accounting, audit and tax, from offices in Riyadh, Jeddah and Dammam.",
    },
  };

  return {
    title: meta[segment].title,
    description: meta[segment].description,
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
