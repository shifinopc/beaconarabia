import type { MetadataRoute } from "next";
import { REGIONS, REGION_KEYS, WHY_PAGES, SITE_URL, regionUrl } from "@/lib/regions";
import {
  getAllPosts,
  getAllServices,
  getOffices,
  officeSlug,
  postPath,
  servicePath,
} from "@/lib/strapi";

/**
 * Generated sitemap with hreflang alternates.
 *
 * Replaces the hand-written sitemap.xml files in the legacy repos, which were
 * stale (they listed beaconarabia.com URLs while the metadata pointed at
 * bmcglobal.co) and were never served at all — they sat in src/app/ instead of
 * public/, so /sitemap.xml returned 404 in production.
 */

/**
 * Rebuilt hourly rather than frozen at build time, so a newly published article
 * appears without a redeploy. Publishing already triggers the revalidation
 * webhook; this covers the case where that fires but the sitemap is a static
 * artifact from whenever the site was last built.
 */
export const revalidate = 3600;

/** Paths every region serves. */
const SHARED_PATHS = ["", "about", "services", "contact", "blog", "careers", "partners"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const lastModified = new Date();

  const staticEntries = REGION_KEYS.flatMap((key) => {
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

  // Legal pages exist once, globally — no regional counterparts, no hreflang.
  const legalEntries: MetadataRoute.Sitemap = ["privacy-policy", "terms"].map((slug) => ({
    url: `${SITE_URL}/${slug}`,
    lastModified,
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));

  /**
   * Office pages — the index plus one per city.
   *
   * Priority 0.7, below the section pages but above articles: these target
   * transactional local queries ("business setup consultants in Riyadh") and
   * are the pages a Google Business Profile points at.
   *
   * The index is listed unconditionally; the city pages come from the CMS. See
   * the articles block below for why neither fetch is wrapped in try/catch.
   */
  const offices = await getOffices();
  const officeEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/offices`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    ...offices.map((office) => ({
      url: `${SITE_URL}/offices/${officeSlug(office)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  /**
   * Service detail pages — six offerings in each of the three regions.
   *
   * Priority 0.8, matching the section pages: these are the commercial pages
   * the business actually sells from. servicePath derives the regional prefix
   * from the service itself, so each URL is listed once, at the one address it
   * lives at.
   */
  const services = await getAllServices();
  const serviceEntries: MetadataRoute.Sitemap = services
    .filter((service) => service.slug)
    .map((service) => ({
      url: `${SITE_URL}${servicePath(service)}`,
      lastModified,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

  /**
   * Articles.
   *
   * Previously omitted entirely, so every post was reachable only by crawling
   * the blog index — 21 pages left to be discovered by chance. Each post
   * belongs to exactly one region and lives at exactly one URL (postPath
   * derives the regional prefix), so like the "why" pages these carry no
   * hreflang alternates: there is no counterpart to point at.
   *
   * The fetch is deliberately not wrapped in try/catch. getAllPosts already
   * distinguishes the two failures that matter — see lib/strapi.ts — and
   * catching here defeated it: a CMS blip during an hourly rebuild published a
   * sitemap with every article and service missing, then cached that for an
   * hour. Letting the failure propagate makes Next discard the rebuild and keep
   * serving the last good sitemap, which is what "a CMS outage must not take
   * the sitemap down" should have meant.
   */
  const posts = await getAllPosts();
  const postEntries: MetadataRoute.Sitemap = posts
    .filter((post) => post.slug)
    .map((post) => ({
      url: `${SITE_URL}${postPath(post)}`,
      lastModified: post.publishedAt ? new Date(post.publishedAt) : lastModified,
      changeFrequency: "yearly" as const,
      // Below the section pages: articles are the long tail, and an
      // undifferentiated sitemap tells search engines nothing about which
      // pages matter.
      priority: 0.6,
    }));

  return [
    ...staticEntries,
    ...serviceEntries,
    ...officeEntries,
    ...legalEntries,
    ...postEntries,
  ];
}
