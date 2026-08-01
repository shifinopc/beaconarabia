import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlogPostPage from "@/components/pages/BlogPostPage";
import { REGIONS, isRegionSegment } from "@/lib/regions";
import { articleMetadata } from "@/lib/seo";
import { getAllPosts } from "@/lib/strapi";

type Params = { region: string; slug: string };

/**
 * Prerenders every regional article — see the global route for why this
 * matters: without it these rendered per request, which requires the server to
 * reach the CMS mid-response, and on this deployment that hangs.
 *
 * Each post belongs to exactly one region, so the pairing comes from the post's
 * own `region` rather than a cross product of regions and slugs, which would
 * build /ae/blog/<a-saudi-post> and other URLs that should not exist.
 */
export async function generateStaticParams(): Promise<Params[]> {
  try {
    const posts = await getAllPosts();
    return posts
      .filter((post) => post.slug && post.region !== "global")
      .map((post) => ({ region: post.region, slug: post.slug }));
  } catch {
    return [];
  }
}

/** Unknown region/slug pairs 404 rather than being rendered on demand. */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { region: segment, slug } = await params;
  if (!isRegionSegment(segment)) return {};
  return articleMetadata(REGIONS[segment].strapiValue, slug);
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { region: segment, slug } = await params;
  if (!isRegionSegment(segment)) notFound();

  return <BlogPostPage region={REGIONS[segment]} slug={slug} />;
}
