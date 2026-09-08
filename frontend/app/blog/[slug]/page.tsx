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
 * Slugs not known at build time render on demand.
 *
 * This was `false`, and the comment here called the cost — "a newly published
 * article needs a rebuild to appear" — acceptable. It was not. An article
 * published in the CMS returned 404 until the next deploy, while the blog index
 * and the sitemap both linked to it, so the visible symptom was a working link
 * to a missing page. Editors have no way to know a deploy is required, and
 * requiring one to publish a post is not a workflow anyone would choose.
 *
 * The original reasoning was sound at the time: request-time rendering needs
 * the server to reach the CMS mid-response, and during the NPROC exhaustion
 * that hung. That condition is gone — the process ceiling was the cause, and
 * with it fixed the CMS answers in well under a second.
 *
 * Nothing is given up on unknown slugs: BlogPostPage calls notFound() when
 * getPostBySlug returns nothing, so a mistyped URL still 404s. The only change
 * is that a real, published article now resolves instead of being punished for
 * arriving after the last build.
 */
export const dynamicParams = true;

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
