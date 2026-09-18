import type { Post } from "./strapi";

/**
 * When an article was first published, and when it last changed.
 *
 * Strapi's `publishedAt` is neither. It is reset every time a post is
 * republished, so an article from August showed `datePublished` 17 Sep 2026
 * after a routine edit — and a publication date that keeps moving forward is
 * the pattern search engines treat as date manipulation. `createdAt` is stable,
 * so it is the first-publish date for anything written in Strapi.
 *
 * It is wrong for the 21 posts migrated from the old Sanity sites: they were all
 * imported on 29 Jul 2026, so their `createdAt` is the import, not the article.
 * Their real dates are below. This list cannot grow — every post created since
 * the migration has a meaningful `createdAt` — so it lives in code rather than
 * as a CMS field nobody would ever fill in again.
 */
const LEGACY_FIRST_PUBLISHED: Record<string, string> = {
  // `publishedAt` from Sanity project l1v9kmrc, the date the old sites showed
  // on each article. Read on 21 Sep 2026.
  "business-incorporation": "2024-04-10",
  "premium-residency-in-ksa": "2024-10-20",
  "freezone-vs-mainland": "2024-11-01",
  "saudi-arabia-s-growing-business-sector": "2024-11-04",
  "transforming-the-economy-beyondoil": "2024-11-04",
  "saudi-arabia-s-booming-events-industry": "2024-11-05",
  "the-e-commerce-boom-in-the-uae": "2024-11-05",
  "updated-commercial-registration-and-trade-name-laws": "2024-11-05",
  "venture-capital-driven-growth-in-the-gcc": "2024-11-06",
  "how-e-commerce-is-transforming-the-retail-landscape": "2024-11-10",
  "understanding-free-zones-in-qatar-benefits-for-foreign-investors": "2024-11-10",
  "how-to-choose-the-right-business-structure-in-saudi-arabia": "2024-11-11",
  "dubais-ambitious-2025-2027-budget": "2024-11-12",
  "is-the-line-project-in-neom-reduced": "2024-11-12",
  "how-technology-is-transforming-business-operations-in-the-uae": "2024-11-13",
  "riyadh-to-be-among-top-15-fastest-growing-cities-by-2033": "2024-11-13",
  "top-benefits-of-incorporating-your-business-in-saudi-arabia": "2024-11-13",
  "the-role-of-pro-and-gro-services-in-saudi-business-setup-for-foreign-investors":
    "2024-11-14",
  "navigating-saudi-arabia-s-market-opportunities-and-updates-for-2025": "2024-11-22",
  "oman-vision-2040": "2024-11-25",
  "why-auditing-and-accounting-are-vital-for-businesses-in-saudi-arabia": "2024-11-25",
};

export interface PostDates {
  /** ISO string for schema.org `datePublished`. */
  published: string | null;
  /** ISO string for `dateModified`; never earlier than `published`. */
  modified: string | null;
}

export function postDates(
  post: Pick<Post, "slug" | "createdAt" | "updatedAt" | "publishedAt">,
): PostDates {
  const published =
    LEGACY_FIRST_PUBLISHED[post.slug] ?? post.createdAt ?? post.publishedAt ?? null;
  const modified = post.updatedAt ?? null;

  // An update cannot predate the article. Only a malformed record could do it,
  // but a dateModified before datePublished is an error Google reports.
  if (published && modified && new Date(modified) < new Date(published)) {
    return { published, modified: published };
  }
  return { published, modified };
}

/**
 * "17 September 2026".
 *
 * Pinned to Gulf time: pages render on the server, whose clock is UTC, and an
 * article published at 1am in Dubai would otherwise show the previous day.
 */
export function formatPostDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Dubai",
  });
}
