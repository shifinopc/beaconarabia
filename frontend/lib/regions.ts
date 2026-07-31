/**
 * Single source of truth for Beacon's regional sites.
 *
 * Replaces the previous architecture of three separate repos/domains
 * (bmcglobal.co, uae.bmcglobal.co, ksa.bmcglobal.co) with one app serving
 * subdirectories on one domain. This consolidates SEO authority and removes
 * the duplicate-content problem those subdomains created.
 */

export const REGION_KEYS = ["global", "ae", "sa"] as const;

export type RegionKey = (typeof REGION_KEYS)[number];

export interface Region {
  key: RegionKey;
  /** URL segment. Empty for global, which lives at the site root. */
  segment: string;
  /** Value used in <link rel="alternate" hreflang="..."> */
  hreflang: string;
  label: string;
  /** Matches the `region` enum on every Strapi content type. */
  strapiValue: RegionKey;
}

export const REGIONS: Record<RegionKey, Region> = {
  global: {
    key: "global",
    segment: "",
    hreflang: "x-default",
    label: "Global",
    strapiValue: "global",
  },
  ae: {
    key: "ae",
    segment: "ae",
    hreflang: "en-AE",
    label: "United Arab Emirates",
    strapiValue: "ae",
  },
  sa: {
    key: "sa",
    segment: "sa",
    hreflang: "en-SA",
    label: "Saudi Arabia",
    strapiValue: "sa",
  },
};

/** Regions that live under a URL segment — i.e. everything except global. */
export const SUB_REGIONS = [REGIONS.ae, REGIONS.sa];

/**
 * Remembers which region a visitor is browsing, so the geo redirect in
 * proxy.ts fires at most once and never overrides a deliberate choice.
 */
export const REGION_COOKIE = "beacon-region";

/**
 * ISO 3166-1 alpha-2 country -> URL segment, for the geo redirect.
 *
 * Only countries with their own regional site belong here. Anything absent
 * (including Cloudflare's `XX` for unknown and `T1` for Tor) falls through to
 * the global site, which is the correct destination for every other market —
 * so adding a region later means one line here plus the usual REGIONS entry.
 */
export const COUNTRY_TO_SEGMENT: Record<string, string> = {
  AE: "ae",
  SA: "sa",
};

/**
 * The "why <place>" landing page each region has.
 *
 * Both legacy regional sites had one (/pages/WhyDubai, /pages/WhySaudi) with a
 * keyword-rich slug worth keeping, so these are two routes rather than one
 * shared /why. Global has none. Single source of truth for the route, the nav
 * item and the sitemap entry, so they cannot drift apart.
 */
export const WHY_PAGES: Partial<Record<RegionKey, { slug: string; label: string }>> = {
  ae: { slug: "why-dubai", label: "Why Dubai" },
  sa: { slug: "why-saudi", label: "Why Saudi" },
};

export function isRegionSegment(value: string): value is "ae" | "sa" {
  return SUB_REGIONS.some((r) => r.segment === value);
}

export function regionFromSegment(segment?: string): Region {
  if (!segment) return REGIONS.global;
  return isRegionSegment(segment) ? REGIONS[segment] : REGIONS.global;
}

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Absolute URL for a region + optional path, e.g. ("ae", "about") -> /ae/about */
export function regionUrl(region: Region, path = ""): string {
  const parts = [region.segment, path].filter(Boolean).join("/");
  return parts ? `${SITE_URL}/${parts}` : SITE_URL;
}

/**
 * Builds the `alternates` block for Next's Metadata API.
 *
 * This is the piece missing from all three of the current sites: they are
 * three English sites targeting overlapping queries with no hreflang and no
 * canonical, which invites keyword cannibalisation. Emitting both here tells
 * Google these are regional variants rather than duplicates.
 */
export function alternatesFor(region: Region, path = "") {
  const languages: Record<string, string> = {};
  for (const key of REGION_KEYS) {
    const r = REGIONS[key];
    languages[r.hreflang] = regionUrl(r, path);
  }
  return {
    canonical: regionUrl(region, path),
    languages,
  };
}
