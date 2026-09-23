import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RegionHome from "@/components/RegionHome";
import { REGIONS, SUB_REGIONS, alternatesFor, isRegionSegment } from "@/lib/regions";

type Params = { region: string };

/** Prerenders /ae and /sa at build time. */
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
    /*
     * Saudi targets "business setup consultants in saudi arabia" (23 Sep 2026).
     * That phrase and its variants drew 414 impressions in 90 days at position
     * 25, 339 of them to the retiring ksa.beaconarabia.com; Google otherwise
     * prefers the global homepage for it, in the thirties. The page's H1 and
     * body were rewritten for it the same day — this is the title tag.
     * UAE is deliberately untouched: no equivalent keyword work yet.
     */
    sa: {
      title: "Business Setup Consultants in Saudi Arabia",
      description:
        // 154 characters: the brief's wording ran to 168, past the 155 this
        // codebase truncates descriptions at. "PRO services" gave way to the
        // three cities, which the H1 and body already lean on.
        "Beacon sets up companies in Saudi Arabia: MISA licensing, commercial registration, ZATCA and GOSI, then accounting, audit and tax. Riyadh, Jeddah, Dammam.",
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
