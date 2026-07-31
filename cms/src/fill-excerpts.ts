import type { Core } from '@strapi/strapi';

/**
 * Populates the `excerpt` field on any post that doesn't have one.
 *
 * All 21 migrated posts came across from Sanity with `subtitle` set to a copy
 * of the title (not a real standfirst) and `excerpt` empty, so search-result
 * descriptions were falling back to the article body at render time
 * (frontend/lib/seo.ts's postDescription). That fallback still exists for any
 * future post an editor leaves blank, but there's no reason today's 21 should
 * ship with an empty CMS field when the source text to fill it from is right
 * there in the article — an editor opening one in the admin should see a real
 * excerpt, not a blank box.
 *
 * The truncation logic mirrors postDescription() in the frontend deliberately:
 * they solve the same problem in two different runtimes (Strapi vs. Next) that
 * don't share a package, so this is a deliberate duplication, not a drift.
 *
 * Idempotent: only touches posts where `excerpt` is empty.
 */
const EXCERPT_LIMIT = 155;

function truncate(text: string, limit = EXCERPT_LIMIT): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 40 ? cut.slice(0, lastSpace) : cut).replace(/[.,;:]$/, '')}…`;
}

interface PostForExcerpt {
  documentId: string;
  title: string;
  excerpt?: string | null;
  contentBlocks?: { type?: string; content?: string }[] | null;
}

export async function fillBlogExcerpts(strapi: Core.Strapi) {
  if (process.env.SEED_CONTENT !== 'true') return;

  const posts = (await strapi.documents('api::post.post').findMany({
    status: 'published',
    fields: ['title', 'excerpt', 'contentBlocks'],
    pagination: { pageSize: 200 },
  })) as PostForExcerpt[];

  let filled = 0;

  for (const post of posts) {
    if (post.excerpt?.trim()) continue;

    const blocks = post.contentBlocks ?? [];
    const firstProse = blocks.find(
      (b) => b?.type === 'content' && typeof b.content === 'string' && b.content.trim().length > 40,
    );

    const excerpt = firstProse?.content
      ? truncate(firstProse.content)
      : truncate(`${post.title} — insights from Beacon, your global advisory partner.`);

    await strapi.documents('api::post.post').update({
      documentId: post.documentId,
      data: { excerpt },
      status: 'published',
    });
    filled += 1;
  }

  strapi.log.info(`[seed] blog excerpts: filled ${filled} of ${posts.length} post(s)`);
}
