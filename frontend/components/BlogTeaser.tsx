import styles from "@/styles/personalBlog.module.css";
import type { Region } from "@/lib/regions";
import { getAllPosts, getPosts } from "@/lib/strapi";
import BlogCards from "./BlogCards";
import BlogLearnMore from "./BlogLearnMore";

/**
 * Homepage blog teaser — three most recent posts.
 *
 * Ported from bg-Beacon/src/app/components/PersonalBlog.js, which fetched from
 * Sanity in a client-side useEffect and rendered a "Loading..." block until the
 * request resolved. Content now comes from Strapi during SSR, so the cards are
 * in the initial HTML and are indexable.
 *
 * Shares BlogCards with the blog index, matching how the legacy component
 * served both via its `isInnerPage` flag.
 */
export default async function BlogTeaser({
  region,
  section,
}: {
  region: Region;
  /** Optional `blog-heading` Section. */
  section?: { eyebrow?: string | null; title: string; description?: string | null; ctaLabel?: string | null };
}) {
  const all =
    region.key === "global" ? await getAllPosts() : await getPosts(region.strapiValue);
  const posts = all.slice(0, 3);
  if (!posts.length) return null;

  const base = region.segment ? `/${region.segment}` : "";

  return (
    <div className={styles.companyBlog}>
      <p className={styles.text1}>{section?.eyebrow ?? "Blogs"}</p>
      <h2 className={styles.text2}>
        {section?.title ?? "Read Through Our Perspectives & Latest Updates"}
      </h2>

      <BlogCards posts={posts} />

      <BlogLearnMore href={`${base}/blog`} />
    </div>
  );
}
