import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Core } from '@strapi/strapi';

/**
 * Loads sharp on demand rather than at module load.
 *
 * sharp reaches us transitively (via @strapi/strapi -> @strapi/upload), carries
 * a platform-specific native binary, and is only needed by the opt-in routines
 * below — which return early unless their env flag is set, so on a normal
 * production boot it is never called at all. Importing it at the top of the
 * file meant a host where that binary failed to link took the whole CMS down on
 * startup, for a code path that was never going to run there.
 */
type Sharp = typeof import('sharp');

async function loadSharp(): Promise<Sharp> {
  const mod = await import('sharp');
  // sharp is CommonJS; depending on interop the callable lands on `default`.
  return ((mod as unknown as { default?: Sharp }).default ?? mod) as Sharp;
}

/**
 * Re-encodes oversized images already in the Media Library.
 *
 * Blog covers migrated from Sanity came across at their source resolution — one
 * is a 2560x1445 JPEG at 987 KB — and Strapi generates large/medium/small
 * derivatives from each, so a single cover can occupy several megabytes. They
 * are served straight to the browser, so this is transfer weight, not just
 * storage.
 *
 * Opt-in via OPTIMISE_MEDIA=true so it never runs by accident, and idempotent:
 * anything already under the threshold, or already WebP, is skipped. Re-running
 * after the first pass is a no-op.
 *
 * Files are replaced rather than edited in place: the new asset is uploaded,
 * every entry referencing the old one is repointed, then the old file and its
 * derivatives are deleted. Editing bytes in place would leave the stored
 * width/height/size/mime wrong and break the admin preview.
 */

/** Anything above this is re-encoded. */
const MAX_KB = 250;

/** Covers are displayed at most ~600px wide; 1600 leaves room for retina. */
const MAX_WIDTH = 1600;

interface MediaFile {
  id: number;
  name: string;
  url: string;
  ext?: string | null;
  mime?: string | null;
  size: number;
  width?: number | null;
  height?: number | null;
}

/**
 * Formats worth keeping. `thumbnail` is what the admin media grid previews
 * with; everything else existed only to serve responsive images, which
 * next/image now does from the original.
 */
const KEEP_FORMATS = new Set(['thumbnail']);

/**
 * Deletes the large/medium/small copies left over from before responsive
 * formats were switched off, and drops them from each file's `formats` JSON so
 * the database does not point at files that are gone.
 */
export async function pruneUnusedFormats(strapi: Core.Strapi) {
  if (process.env.OPTIMISE_MEDIA !== 'true') return;

  const uploadsDir = path.join(strapi.dirs.static.public, 'uploads');
  const files = (await strapi.db.query('plugin::upload.file').findMany({})) as (MediaFile & {
    formats?: Record<string, { url?: string }> | string | null;
  })[];

  let rowsUpdated = 0;
  let filesDeleted = 0;
  let freedKb = 0;

  for (const file of files) {
    let formats = file.formats;
    if (typeof formats === 'string') {
      try {
        formats = JSON.parse(formats);
      } catch {
        continue;
      }
    }
    if (!formats || typeof formats !== 'object') continue;

    const drop = Object.keys(formats).filter((k) => !KEEP_FORMATS.has(k));
    if (!drop.length) continue;

    const kept: Record<string, unknown> = {};
    for (const key of Object.keys(formats)) {
      if (KEEP_FORMATS.has(key)) kept[key] = (formats as Record<string, unknown>)[key];
    }

    // Update the row first: a leftover file on disk is harmless, a row pointing
    // at a deleted file is not.
    await strapi.db.query('plugin::upload.file').update({
      where: { id: file.id },
      data: { formats: Object.keys(kept).length ? kept : null },
    });
    rowsUpdated += 1;

    for (const key of drop) {
      const url = (formats as Record<string, { url?: string }>)[key]?.url;
      if (!url) continue;
      const onDisk = path.join(uploadsDir, path.basename(url));
      if (!fs.existsSync(onDisk)) continue;
      freedKb += fs.statSync(onDisk).size / 1024;
      fs.rmSync(onDisk, { force: true });
      filesDeleted += 1;
    }
  }

  strapi.log.info(
    `[media] pruned ${filesDeleted} responsive copy/copies across ${rowsUpdated} file(s), freed ${(
      freedKb / 1024
    ).toFixed(1)} MB`,
  );
}

export async function optimiseMedia(strapi: Core.Strapi) {
  if (process.env.OPTIMISE_MEDIA !== 'true') return;

  const uploadService = strapi.plugin('upload').service('upload');
  const files = (await strapi.db.query('plugin::upload.file').findMany({
    where: { mime: { $startsWith: 'image/' } },
  })) as MediaFile[];

  const heavy = files
    .filter((f) => f.size > MAX_KB && f.mime !== 'image/webp' && f.mime !== 'image/svg+xml')
    .sort((a, b) => b.size - a.size);

  if (!heavy.length) {
    strapi.log.info('[media] nothing over the size threshold; skipping');
    return;
  }

  const sharp = await loadSharp();
  const uploadsDir = path.join(strapi.dirs.static.public, 'uploads');
  let converted = 0;
  let savedKb = 0;

  for (const file of heavy) {
    const source = path.join(uploadsDir, path.basename(file.url));
    if (!fs.existsSync(source)) {
      strapi.log.warn(`[media] file missing on disk, skipping: ${file.name}`);
      continue;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '');
    const tmp = path.join(os.tmpdir(), `beacon-opt-${file.id}-${baseName}.webp`);

    try {
      const info = await sharp(source)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(tmp);

      const [uploaded] = await uploadService.upload({
        data: {},
        files: {
          filepath: tmp,
          originalFilename: `${baseName}.webp`,
          mimetype: 'image/webp',
          size: info.size,
        },
      });

      if (!uploaded?.id) {
        strapi.log.warn(`[media] upload returned nothing for ${file.name}`);
        continue;
      }

      const repointed = await repointReferences(strapi, file.id, uploaded.id);

      // Only drop the original once every reference points at the replacement,
      // otherwise a cover would silently become null.
      await strapi.plugin('upload').service('upload').remove({ id: file.id });

      converted += 1;
      savedKb += file.size - info.size / 1024;
      strapi.log.info(
        `[media] ${file.name}: ${Math.round(file.size)} KB -> ${Math.round(
          info.size / 1024,
        )} KB (${info.width}x${info.height}), ${repointed} reference(s) repointed`,
      );
    } catch (error) {
      strapi.log.warn(
        `[media] could not optimise ${file.name}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  }

  strapi.log.info(
    `[media] optimised ${converted} of ${heavy.length} file(s), saved ${(savedKb / 1024).toFixed(1)} MB`,
  );
}

/**
 * Moves every relation pointing at `oldId` onto `newId`.
 *
 * The upload plugin stores media links in a polymorphic join table rather than
 * on the owning row, so this updates the link directly instead of walking every
 * content type looking for media fields.
 */
async function repointReferences(
  strapi: Core.Strapi,
  oldId: number,
  newId: number,
): Promise<number> {
  const knex = strapi.db.connection;
  const result = await knex('files_related_mph')
    .where({ file_id: oldId })
    .update({ file_id: newId });
  return typeof result === 'number' ? result : 0;
}
