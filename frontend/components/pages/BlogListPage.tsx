import personal from "@/styles/personalBlog.module.css";
import styles from "@/styles/blogList.module.css";
import type { Region } from "@/lib/regions";
import { getAllPosts, getPosts, getSections, sectionByKey } from "@/lib/strapi";
import PageShell from "../PageShell";
import BlogCards from "../BlogCards";
import ContactCta from "../ContactCta";

/**
 * Blog index.
 *
 * Ported from bg-Beacon/src/app/pages/blog/page.js, which wrapped
 * `<PersonalBlog isInnerPage />` in `blogsMainInnerPage` and followed it with
 * the Contact CTA inside `top110Margin`. Same structure here, with posts coming
 * from Strapi rather than a client-side Sanity fetch.
 */
export default async function BlogListPage({ region }: { region: Region }) {
  // The global blog is the hub: it lists every article and links each to its
  // own regional URL. Regional blogs show only their own posts.
  const [posts, sections] = await Promise.all([
    region.key === "global" ? getAllPosts() : getPosts(region.strapiValue),
    getSections(region.strapiValue),
  ]);
  const blogSection = sectionByKey(sections, "blog-heading");

  return (
    <PageShell region={region}>
      <div className={styles.blogsMainInnerPage}>
        <div className={personal.companyBlog}>
          <p className={personal.text1}>{blogSection?.eyebrow ?? "Blogs"}</p>
          <h1 className={personal.text2}>
            Read Through Our Perspectives &amp; Latest Updates
          </h1>

          {posts.length === 0 ? (
            <p style={{ padding: "3rem 0", textAlign: "center" }}>
              No posts published for this region yet.
            </p>
          ) : (
            <BlogCards posts={posts} featureEveryFifth />
          )}
        </div>
      </div>

      <div className={styles.top110Margin}>
        <ContactCta region={region} section={sectionByKey(sections, "contact-cta")} />
      </div>
    </PageShell>
  );
}
