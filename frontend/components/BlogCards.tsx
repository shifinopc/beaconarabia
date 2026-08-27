import Image from "next/image";
import Link from "next/link";
import styles from "@/styles/personalBlog.module.css";
import { mediaUrl, postPath, type Post } from "@/lib/strapi";

/**
 * The blog card grid, shared by the homepage teaser and the blog index.
 *
 * Mirrors PersonalBlog.js, which served both via an `isInnerPage` flag: the
 * index shows every post and gives every 5th card the wider `companyBlogCard2`
 * treatment, while the homepage shows three standard cards.
 */
export default function BlogCards({
  posts,
  featureEveryFifth = false,
}: {
  posts: Post[];
  featureEveryFifth?: boolean;
}) {
  return (
    <div className={styles.companyBlogCards}>
      {posts.map((post, index) => {
        const cover = mediaUrl(post.cover);
        const date = post.publishedAt
          ? new Date(post.publishedAt).toLocaleDateString("en-US")
          : null;
        const cardClass =
          featureEveryFifth && index % 5 === 0
            ? styles.companyBlogCard2
            : styles.companyBlogCard;

        return (
          <div className={cardClass} key={post.documentId}>
            <Link href={postPath(post)}>
              {/* Optimized, not `unoptimized`: covers are CMS uploads up to
                  1600px wide rendering into a ~350px card, so leaving it off
                  makes the browser download every cover at full size. */}
              {cover && (
                <Image
                  src={cover}
                  width={350}
                  height={250}
                  alt={post.cover?.alternativeText ?? post.title}
                  className={styles.blogImage}
                  sizes="(max-width: 600px) 90vw, (max-width: 1024px) 45vw, 350px"
                />
              )}

              {/*
                These were all h6, which is why the page reported a broken
                heading hierarchy: an h2 section heading followed by h6 cards,
                skipping h3 to h5 entirely. A category label, a date and a
                "Read More" affordance are not headings at all — a screen
                reader listing the page's headings was getting "Business
                Incorporation", "8/18/2026", "Read More" as structure.

                The card's own title is a real heading and becomes h3, one
                level under the h2 that introduces the list. The rest are
                spans. Appearance is unchanged: .text3/.text4/.text5 set their
                own font-size, weight and colour, so nothing was inheriting
                h6 defaults.
              */}
              <div className={styles.dateAndLocationContainer}>
                <div className={styles.dateTextContainer}>
                  <span className={styles.text4}>{post.category}</span>
                  <div className={styles.blogDot} />
                  <span className={styles.text3}>{date}</span>
                </div>
              </div>

              <div className={styles.companyBlogContent}>
                <h3 className={styles.text5}>{post.subtitle || post.title}</h3>
                <div className={styles.readmore}>
                  <span>Read More</span>
                  <Image
                    src="/blackArrow.svg"
                    width={23}
                    height={23}
                    alt=""
                    className={styles.blogArrow}
                    unoptimized
                  />
                </div>
              </div>
            </Link>
          </div>
        );
      })}
    </div>
  );
}
