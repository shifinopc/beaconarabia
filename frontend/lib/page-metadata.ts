import type { Metadata } from "next";
import { alternatesFor, REGIONS, type Region } from "./regions";
import { getPageBySlug } from "./strapi";

/**
 * Builds a page's metadata from the CMS, falling back to the values compiled
 * into the route.
 *
 * The `Page` content type has carried `seoTitle` and `seoDescription` since the
 * beginning and nothing read them, so changing a page's search snippet meant a
 * code edit and a deploy — on a host where deploying is the riskiest thing we
 * do. Editors can now change the title and description that appear in search
 * results from the admin panel.
 *
 * The compiled values stay as the fallback rather than being deleted: an empty
 * CMS field, an unpublished entry or an unreachable CMS then costs nothing,
 * where reading only from the CMS would silently strip a page's metadata. The
 * fallbacks are also what a fresh clone gets before any content exists.
 *
 * Note this resolves at build time along with the rest of the page, so a change
 * in the CMS appears on the next build or revalidation, not instantly.
 */
export async function pageMetadata({
  region,
  slug,
  title,
  description,
}: {
  region: Region;
  /** Slug of the `Page` entry, e.g. "about". */
  slug: string;
  /** Used when the CMS has no seoTitle. */
  title: string;
  /** Used when the CMS has no seoDescription. */
  description: string;
}): Promise<Metadata> {
  let cmsTitle: string | undefined;
  let cmsDescription: string | undefined;

  try {
    const page = await getPageBySlug(region.strapiValue, slug);
    // Trimmed, because a field containing only whitespace is not an override —
    // it is an empty field someone tabbed through.
    cmsTitle = page?.seoTitle?.trim() || undefined;
    cmsDescription = page?.seoDescription?.trim() || undefined;
  } catch {
    // A CMS outage should cost the override, not the page's metadata.
  }

  return {
    title: cmsTitle ?? title,
    description: cmsDescription ?? description,
    alternates: alternatesFor(region, slug),
  };
}

/** Convenience for the global-region routes, which are the common case. */
export function globalPageMetadata(args: {
  slug: string;
  title: string;
  description: string;
}): Promise<Metadata> {
  return pageMetadata({ region: REGIONS.global, ...args });
}
