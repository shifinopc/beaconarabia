import type { MetadataRoute } from "next";
import { REGIONS, REGION_KEYS, WHY_PAGES, regionUrl } from "@/lib/regions";

/**
 * Generated sitemap with hreflang alternates.
 *
 * Replaces the hand-written sitemap.xml files in the legacy repos, which were
 * stale (they listed beaconarabia.com URLs while the metadata pointed at
 * bmcglobal.co) and were never served at all — they sat in src/app/ instead of
 * public/, so /sitemap.xml returned 404 in production.
 */
/** Paths every region serves. */
const SHARED_PATHS = ["", "about", "services", "contact", "blog", "careers", "partners"];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return REGION_KEYS.flatMap((key) => {
    const region = REGIONS[key];

    const shared = SHARED_PATHS.map((path) => ({
      url: regionUrl(region, path),
      lastModified,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.8,
      alternates: {
        languages: Object.fromEntries(
          REGION_KEYS.map((k) => [REGIONS[k].hreflang, regionUrl(REGIONS[k], path)]),
        ),
      },
    }));

    // "Why Dubai" / "Why Saudi" exist in one region each, so they carry no
    // hreflang alternates — there is no counterpart URL to point at.
    const why = WHY_PAGES[key];
    const only = why
      ? [
          {
            url: regionUrl(region, why.slug),
            lastModified,
            changeFrequency: "monthly" as const,
            priority: 0.8,
          },
        ]
      : [];

    return [...shared, ...only];
  });
}
