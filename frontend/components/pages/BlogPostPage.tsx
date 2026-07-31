import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "@/styles/blogList.module.css";
import type { Region } from "@/lib/regions";
import {
  getAllPosts,
  getPostBySlug,
  getSections,
  mediaUrl,
  postPath,
  sectionByKey,
} from "@/lib/strapi";
import PageShell from "../PageShell";
import BlogContentBlock, { type ContentBlock } from "../BlogContentBlock";
import BlogTeaser from "../BlogTeaser";
import ContactCta from "../ContactCta";

/**
 * How many posts the "You may also like" sidebar shows.
 *
 * The legacy component mapped over every post with no limit and no filter — so
 * it listed all 21, including the article being read, producing a sidebar as
 * tall as the article. Since the column is `position: sticky`, being taller
 * than the viewport also stopped it sticking. Same-category posts come first.
 */
const RELATED_LIMIT = 5;

/** Social links shown beside the article title. */
const SOCIALS = [
  { href: "https://www.instagram.com/beaconconsultants", icon: "/Blogs/icons/1.svg" },
  {
    href: "https://www.facebook.com/people/Beacon-Management-Consultants/100086432425064/",
    icon: "/Blogs/icons/2.svg",
  },
  {
    href: "https://www.linkedin.com/company/beacon-management-consultants/",
    icon: "/Blogs/icons/3.svg",
  },
  { href: "https://wa.me/+971568352250", icon: "/Blogs/icons/4.svg" },
];

/**
 * Article page.
 *
 * Ported from bg-Beacon/src/app/pages/blog/[slug]/BlgComponent.js: a hero band
 * with category/date, title and social links beside the cover image, then a
 * two-column body — article content on one side, a "You may also like" list of
 * every other post on the other.
 *
 * The legacy version fetched both the article and the sidebar list from Sanity
 * in the browser and rendered "Loading..." until they arrived; both are now
 * server-rendered from Strapi.
 */
export default async function BlogPostPage({
  region,
  slug,
}: {
  region: Region;
  slug: string;
}) {
  const post = await getPostBySlug(region.strapiValue, slug);
  if (!post) notFound();

  // Related posts are drawn from every region, each linking to its own URL.
  const [allPosts, sections] = await Promise.all([
    getAllPosts(),
    getSections(region.strapiValue),
  ]);
  const candidates = allPosts.filter((p) => p.slug !== post.slug);
  const sameCategory = candidates.filter((p) => p.category && p.category === post.category);
  const others = [
    ...sameCategory,
    ...candidates.filter((p) => !sameCategory.includes(p)),
  ].slice(0, RELATED_LIMIT);

  const cover = mediaUrl(post.cover);
  const base = region.segment ? `/${region.segment}` : "";
  const blocks = (post.contentBlocks ?? []) as ContentBlock[];
  const date = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("en-US")
    : null;

  return (
    <PageShell region={region}>
      <div className={styles.bgContainer}>
        <div className={styles.topInnerContainer}>
          <div className={styles.leftContainer}>
            <div className={styles.dateContainer}>
              <span className={styles.location}>{post.category}</span>
              <div className={styles.dot} />
              <span className={styles.date}>{date}</span>
            </div>

            <h1 className={styles.titleContainer}>{post.title}</h1>

            <div className={styles.socialContainer}>
              <span className={styles.share}>Follow us on:</span>
              {SOCIALS.map((s) => (
                <a key={s.href} href={s.href} target="_blank" rel="noreferrer">
                  <Image src={s.icon} alt="" width={32} height={32} unoptimized />
                </a>
              ))}
            </div>
          </div>

          <div className={styles.rightContainer}>
            {cover && (
              <Image
                src={cover}
                alt={post.cover?.alternativeText ?? post.title}
                width={600}
                height={400}
                sizes="(max-width: 768px) 90vw, 600px"
                priority
              />
            )}
          </div>
        </div>
      </div>

      <div className={styles.container2}>
        <div className={styles.container2RightContainer}>
          {blocks.map((block, i) => (
            <BlogContentBlock key={i} block={block} />
          ))}
        </div>

        <div className={styles.container2LeftContainer}>
          <div className={styles.alsoLike}>You may also like:</div>
          {others.map((other) => {
            const otherCover = mediaUrl(other.cover);
            return (
              <Link key={other.documentId} href={postPath(other)}>
                <div className={styles.allBlogsContainer}>
                  {otherCover && (
                    <Image
                      src={otherCover}
                      alt=""
                      width={300}
                      height={208}
                      unoptimized
                    />
                  )}
                  <div className={styles.allBlogsContainerTitle}>
                    {other.subtitle || other.title}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* The legacy [slug] route closed with a blog teaser and the contact CTA
          before the footer — both inside `top110Margin` spacers. */}
      <div className={styles.top110Margin}>
        <BlogTeaser region={region} section={sectionByKey(sections, "blog-heading")} />
      </div>
      <div className={styles.top110Margin}>
        <ContactCta region={region} section={sectionByKey(sections, "contact-cta")} />
      </div>
    </PageShell>
  );
}
