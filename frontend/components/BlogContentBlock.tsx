import Image from "next/image";
import styles from "@/styles/blogList.module.css";
import { STRAPI_URL } from "@/lib/strapi";

export interface ContentBlock {
  type?: string | null;
  content?: string | null;
  ul?: string[] | null;
  hyperLink?: string | null;
  imageUrl?: string | null;
}

/**
 * Renders one block of a migrated article body.
 *
 * Ported from the `Card` component inside BlgComponent.js. One deliberate
 * difference: the original matched `type === "contentImage"`, but the Sanity
 * documents actually store image blocks as `type: "image"` — so image blocks
 * never rendered on the live site. This keys off the image URL instead, which
 * makes those two images appear.
 *
 * `imageUrl` is resolved the same way lib/strapi.ts's mediaUrl() resolves every
 * other media reference: absolute URLs pass through, a Strapi-relative path
 * (`/uploads/...`) gets STRAPI_URL prefixed. Two inline images in this field
 * used to be hardcoded absolute Sanity CDN URLs; migrating them to Strapi's own
 * library rewrote them to relative paths, so this can't assume everything here
 * is already absolute.
 */
export default function BlogContentBlock({ block }: { block: ContentBlock }) {
  const imageSrc = block.imageUrl
    ? block.imageUrl.startsWith("http")
      ? block.imageUrl
      : `${STRAPI_URL}${block.imageUrl}`
    : null;

  return (
    <div className={styles.cardContainer}>
      {block.type === "mainHeading" && block.content && (
        <div className={styles.mainHeading}>{block.content}</div>
      )}

      {block.type === "subheading" && block.content && (
        <div className={styles.subHeading}>{block.content}</div>
      )}

      {block.type === "content" && block.content && (
        <div className={styles.description}>{block.content}</div>
      )}

      {imageSrc && (
        <div className={styles.imageContainer}>
          <Image
            src={imageSrc}
            alt=""
            width={550}
            height={350}
            unoptimized
            style={{ width: "100%", height: "auto" }}
          />
        </div>
      )}

      {block.ul && block.ul.length > 0 && (
        <ul className={styles.ul}>
          {block.ul.map((item, i) => (
            <li key={i}>
              <p className={styles.description}>{item}</p>
            </li>
          ))}
        </ul>
      )}

      {block.hyperLink && (
        <a
          href={
            block.hyperLink.startsWith("http://") || block.hyperLink.startsWith("https://")
              ? block.hyperLink
              : `https://${block.hyperLink}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className={`${styles.link} ${styles.description}`}
        >
          {block.hyperLink}
        </a>
      )}
    </div>
  );
}
