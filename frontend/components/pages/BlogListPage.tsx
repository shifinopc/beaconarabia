import Link from "next/link";
import type { ReactNode } from "react";
import personal from "@/styles/personalBlog.module.css";
import styles from "@/styles/blogList.module.css";
import type { Region, RegionKey } from "@/lib/regions";
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
/**
 * Heading and introduction per edition.
 *
 * All three indexes used to share one heading and no text of their own, so
 * /ae/blog and /sa/blog read to a search engine as subsets of /blog — Search
 * Console reported /ae/blog as a duplicate. Each now says which market it
 * covers, and the intro names only topics the listed articles actually cover.
 * The links tie the three together: the hub points to both editions, each
 * edition back to the hub and across to the other.
 */
const INTRO: Record<RegionKey, { heading: string; body: ReactNode }> = {
  global: {
    heading: "Business Insights for the GCC",
    body: (
      <>
        Guides and analysis on company formation, licensing, tax and regulation across the
        Gulf, from market-entry routes in Qatar to Oman&rsquo;s Vision 2040. For articles
        written for a single market, see our{" "}
        <Link href="/ae/blog">UAE insights</Link> and{" "}
        <Link href="/sa/blog">Saudi Arabia insights</Link>.
      </>
    ),
  },
  ae: {
    heading: "UAE Business Setup Insights",
    body: (
      <>
        Practical guides for setting up and running a company in the United Arab Emirates:
        choosing between a mainland and a free zone licence, matching the legal structure to
        how you plan to operate, the licences, costs and documents a Dubai company needs, and
        what UAE corporate tax means for your business. Looking at Saudi Arabia instead? Read
        our <Link href="/sa/blog">Saudi Arabia insights</Link>, or browse{" "}
        <Link href="/blog">all insights</Link>.
      </>
    ),
  },
  sa: {
    heading: "Saudi Arabia Business Insights",
    body: (
      <>
        Guides for foreign companies entering the Kingdom: choosing the right business
        structure, the commercial registration reforms, PRO and GRO services, audit and
        accounting obligations, the Premium Residency programme, and how Vision 2030 and
        projects such as NEOM are reshaping the market. Setting up in the UAE instead? Read
        our <Link href="/ae/blog">UAE insights</Link>, or browse{" "}
        <Link href="/blog">all insights</Link>.
      </>
    ),
  },
};

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
          <h1 className={`${personal.text2} ${styles.introHeading}`}>
            {INTRO[region.key].heading}
          </h1>
          <p className={styles.intro}>{INTRO[region.key].body}</p>

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
