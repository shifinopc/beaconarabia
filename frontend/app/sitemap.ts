import type { MetadataRoute } from "next";
import { REGIONS, REGION_KEYS, WHY_PAGES, SITE_URL, regionUrl } from "@/lib/regions";
import { getAllPosts, postPath } from "@/lib/strapi";

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

  /**
   * Articles.
   *
   * Previously omitted entirely, so every post was reachable only by crawling
   * the blog index — 21 pages left to be discovered by chance. Each post
   * belongs to exactly one region and lives at exactly one URL (postPath
   * derives the regional prefix), so like the "why" pages these carry no
   * hreflang alternates: there is no counterpart to point at.
   *
   * A CMS outage must not take the sitemap down with it, so a failed fetch
   * degrades to the static routes rather than throwing.
   */
  let postEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await getAllPosts();
    postEntries = posts
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
  } catch {
    // Static routes still ship.
  }

  return [...staticEntries, ...postEntries];
}
