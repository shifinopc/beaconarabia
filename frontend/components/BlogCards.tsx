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

              <div className={styles.dateAndLocationContainer}>
                <div className={styles.dateTextContainer}>
                  <h6 className={styles.text4}>{post.category}</h6>
                  <div className={styles.blogDot} />
                  <h6 className={styles.text3}>{date}</h6>
                </div>
              </div>

              <div className={styles.companyBlogContent}>
                <h6 className={styles.text5}>{post.subtitle || post.title}</h6>
                <div className={styles.readmore}>
                  <h6>Read More</h6>
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
