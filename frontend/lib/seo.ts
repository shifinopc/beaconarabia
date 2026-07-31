import type { Metadata } from "next";
import { SITE_URL } from "./regions";
import { getPostBySlug, mediaUrl, postPath, type Post } from "./strapi";
import type { RegionKey } from "./regions";

/** Google truncates around 155–160 characters. */
const DESCRIPTION_LIMIT = 155;

/** Trims to a whole word rather than mid-word, then adds an ellipsis. */
function truncate(text: string, limit = DESCRIPTION_LIMIT): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:]$/, "")}…`;
}

/**
 * A description for an article.
 *
 * The migrated posts have no excerpt, and `subtitle` is a copy of the title on
 * all 21 of them, so neither is usable. This falls back to the opening prose of
 * the body — the first `content` block with actual text.
 */
export function postDescription(post: Post): string {
  if (post.excerpt?.trim()) return truncate(post.excerpt);

  const blocks = (post.contentBlocks ?? []) as { type?: string; content?: string }[];
  const firstProse = blocks.find(
    (b) => b?.type === "content" && typeof b.content === "string" && b.content.trim().length > 40,
  );
  if (firstProse?.content) return truncate(firstProse.content);

  // Last resort — better than inheriting the site-wide default.
  return truncate(`${post.title} — insights from Beacon, your global advisory partner.`);
}

/**
 * Metadata for a blog article.
 *
 * Without this every article inherited the root layout's title and had no
 * canonical, so all 21 shared one title in search results. Shared by the global
 * and [region] article routes so the two cannot drift.
 *
 * No hreflang alternates: a post is assigned to exactly one region and exists at
 * exactly one URL, so there is no counterpart to point at. The global blog index
 * lists every post but links each to its own regional URL, which is why the
 * canonical here is derived from the post rather than the requested path.
 */
export async function articleMetadata(
  region: RegionKey,
  slug: string,
): Promise<Metadata> {
  const post = await getPostBySlug(region, slug);
  if (!post) return {};

  const url = `${SITE_URL}${postPath(post)}`;
  const description = postDescription(post);
  const cover = mediaUrl(post.cover);

  return {
    title: post.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url,
      publishedTime: post.publishedAt,
      ...(cover ? { images: [{ url: cover }] } : {}),
    },
    twitter: {
      card: cover ? "summary_large_image" : "summary",
      title: post.title,
      description,
      ...(cover ? { images: [cover] } : {}),
    },
  };
}
