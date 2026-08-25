import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "@/styles/blogList.module.css";
import { SITE_URL } from "@/lib/regions";
import { STRAPI_URL } from "@/lib/strapi";

/**
 * Matches an HTML anchor, a markdown link, or a bare URL.
 *
 * All three appear in this CMS: migrated articles carry HTML, generated ones
 * carry markdown, and authors paste bare URLs. Handling only one syntax leaves
 * the others printed to the page as raw characters.
 *
 * The bare-URL branch stops before trailing punctuation so that a sentence
 * ending "...see https://www.moci.gov.qa." does not put the full stop inside
 * the href.
 */
const INLINE_LINK =
  /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>|\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)|(https?:\/\/[^\s<>()]*[^\s<>().,;:!?'"])/g;

const SITE_HOST = (() => {
  try {
    return new URL(SITE_URL).host;
  } catch {
    return "";
  }
})();

/**
 * The in-site path for a URL, or null when it points somewhere else.
 *
 * cms.beaconarabia.com is deliberately excluded: it shares the apex domain but
 * is the CMS, not a page on this site.
 */
function internalPath(raw: string): string | null {
  if (raw.startsWith("/")) return raw;
  try {
    const u = new URL(raw);
    if (u.host.startsWith("cms.")) return null;
    if (u.host === SITE_HOST || u.host === "beaconarabia.com" || u.host === "www.beaconarabia.com") {
      return `${u.pathname}${u.search}${u.hash}` || "/";
    }
  } catch {
    // not a parseable absolute URL — treat as plain text
  }
  return null;
}

/**
 * Turns link syntax inside body text into real anchors.
 *
 * Body text used to be interpolated straight into JSX, so React escaped it and
 * any `[text](url)` or `<a>` an author wrote was printed to the page as literal
 * characters. That reached production once. Parsing here — rather than reaching
 * for dangerouslySetInnerHTML — keeps CMS content unable to inject markup.
 *
 * Internal targets render as `<Link>` for client-side navigation; anything
 * external opens in a new tab.
 */
function renderInline(text: string): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;

  INLINE_LINK.lastIndex = 0;
  while ((m = INLINE_LINK.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));

    const href = m[1] ?? m[4] ?? m[5];
    // An HTML label can wrap further tags; show its text, never the markup.
    const label = (m[2] ?? m[3] ?? m[5]).replace(/<[^>]*>/g, "").trim() || href;
    const path = internalPath(href);

    out.push(
      path ? (
        <Link key={m.index} href={path} className={styles.link}>
          {label}
        </Link>
      ) : (
        <a
          key={m.index}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.link}
        >
          {label}
        </a>
      ),
    );
    last = m.index + m[0].length;
  }

  if (!out.length) return text;
  if (last < text.length) out.push(text.slice(last));
  return out;
}

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
        <div className={styles.description}>{renderInline(block.content)}</div>
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
              <p className={styles.description}>{renderInline(item)}</p>
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
