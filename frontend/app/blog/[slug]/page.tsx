import type { Metadata } from "next";
import BlogPostPage from "@/components/pages/BlogPostPage";
import { REGIONS } from "@/lib/regions";
import { articleMetadata } from "@/lib/seo";
import { getAllPosts } from "@/lib/strapi";

type Params = { slug: string };

/**
 * Prerenders every global article.
 *
 * Without this the route rendered per request, which meant the Node server had
 * to reach the CMS while answering — and on this deployment it cannot, so every
 * article timed out. All 21 posts were listed in the sitemap and none of them
 * loaded. Every other page is prerendered, which is exactly why they serve in
 * ~130ms while these hung.
 *
 * Building them removes the runtime dependency: the fetch happens once, at
 * build time, from a machine that can reach the CMS.
 */
export async function generateStaticParams(): Promise<Params[]> {
  try {
    const posts = await getAllPosts();
    return posts
      .filter((post) => post.region === "global" && post.slug)
      .map((post) => ({ slug: post.slug }));
  } catch {
    // A CMS outage during the build shouldn't take the whole build down; the
    // rest of the site still ships and the next build picks the articles up.
    return [];
  }
}

/**
 * An unknown slug 404s rather than being rendered on demand.
 *
 * The default (`true`) would send anything unrecognised down the same
 * request-time path that was hanging, so a mistyped URL would hold a connection
 * open instead of failing fast. The cost is that a newly published article
 * needs a rebuild to appear — acceptable, since deploys already ship prebuilt
 * output.
 */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  return articleMetadata(REGIONS.global.strapiValue, slug);
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  return <BlogPostPage region={REGIONS.global} slug={slug} />;
}
