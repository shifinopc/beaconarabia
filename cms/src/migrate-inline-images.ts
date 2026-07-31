import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Core } from '@strapi/strapi';

/**
 * Downloads any inline article image still pointing at Sanity's CDN and
 * re-hosts it in Strapi's own media library.
 *
 * The Sanity migration moved every post's text and cover image, but two inline
 * images inside "Understanding the Premium Residency Program in Saudi Arabia"
 * (contentBlocks[6] and [16], both `type: "image"`) were missed — their
 * `imageUrl` is a raw string field inside the JSON body, not a media relation,
 * so the earlier migration's relation-based approach never saw them. The site
 * now depends on Sanity for nothing else; leaving these live is one dead
 * project deletion away from two broken images inside an otherwise-complete
 * article.
 *
 * Written as a Strapi-relative path (e.g. `/uploads/xyz.webp`), resolved by the
 * frontend the same way every other media reference is (lib/strapi.ts's
 * mediaUrl), rather than a URL hardcoded to today's STRAPI_URL — so it survives
 * a host move without another migration.
 *
 * Idempotent: only touches an imageUrl that still points at cdn.sanity.io.
 */
/**
 * Matches SeedContentBlock in seed.ts — the index signature is required for
 * Strapi's JSON field type (JSONObject), and fields are required-but-nullable
 * rather than optional because JSONValue has no `undefined` member.
 */
interface InlineBlock {
  [key: string]: string | string[] | null;
  type: string | null;
  imageUrl: string | null;
}

export async function migrateInlineImages(strapi: Core.Strapi) {
  if (process.env.SEED_CONTENT !== 'true') return;

  const posts = await strapi.documents('api::post.post').findMany({
    status: 'published',
    fields: ['title', 'contentBlocks'],
    pagination: { pageSize: 200 },
  });

  let migrated = 0;

  for (const post of posts) {
    const blocks = (post.contentBlocks ?? []) as InlineBlock[];

    const sanityIndexes = blocks
      .map((b, i) => ({ b, i }))
      .filter(({ b }) => typeof b.imageUrl === 'string' && b.imageUrl.includes('cdn.sanity.io'));

    if (!sanityIndexes.length) continue;

    let changed = false;

    for (const { b, i } of sanityIndexes) {
      const sourceUrl = b.imageUrl as string;
      const ext = path.extname(new URL(sourceUrl).pathname) || '.jpg';
      const tmp = path.join(os.tmpdir(), `beacon-inline-${post.documentId}-${i}${ext}`);

      try {
        const res = await fetch(sourceUrl);
        if (!res.ok) {
          strapi.log.warn(`[seed] inline image fetch failed (${res.status}): ${sourceUrl}`);
          continue;
        }
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(tmp, buf);

        const mimetype =
          ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

        const uploadService = strapi.plugin('upload').service('upload');
        const [uploaded] = await uploadService.upload({
          data: {},
          files: {
            filepath: tmp,
            originalFilename: `inline-${post.documentId}-${i}${ext}`,
            mimetype,
            size: buf.length,
          },
        });

        if (!uploaded?.url) {
          strapi.log.warn(`[seed] inline image upload returned nothing for ${sourceUrl}`);
          continue;
        }

        blocks[i] = { ...b, imageUrl: uploaded.url };
        changed = true;
        migrated += 1;
      } catch (error) {
        strapi.log.warn(
          `[seed] could not migrate inline image ${sourceUrl}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      } finally {
        fs.rmSync(tmp, { force: true });
      }
    }

    if (changed) {
      await strapi.documents('api::post.post').update({
        documentId: post.documentId,
        data: { contentBlocks: blocks },
        status: 'published',
      });
      strapi.log.info(`[seed] "${post.title}": re-hosted ${sanityIndexes.length} inline image(s)`);
    }
  }

  if (migrated === 0) {
    strapi.log.info('[seed] inline images: nothing left pointing at Sanity');
  }
}
