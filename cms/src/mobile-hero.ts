import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Core } from '@strapi/strapi';

/** Loaded on demand — see the note in optimise-media.ts for why. */
type Sharp = typeof import('sharp');

async function loadSharp(): Promise<Sharp> {
  const mod = await import('sharp');
  return ((mod as unknown as { default?: Sharp }).default ?? mod) as Sharp;
}

/**
 * Generates a portrait mobile crop of each region's hero photo, for regions
 * that don't have one of their own.
 *
 * Neither the UAE nor the Saudi legacy site ever had a distinct mobile hero —
 * both always served the same wide desktop photo at every viewport, and that
 * carried over here (heroImageMobile was seeded to the same asset as
 * heroImage). Global is the exception: it ships a genuinely different 375x600
 * portrait photo. Since AE/SA have no equivalent source photograph to draw on,
 * this derives one from the existing wide photo with an attention-based smart
 * crop, rather than serving a 1512px landscape image squeezed into a phone
 * screen — an improvement on the legacy behaviour, not a restoration of it.
 *
 * Idempotent: skipped for any region whose heroImageMobile already differs
 * from heroImage, so a manually-uploaded crop is never replaced.
 */
const REGIONS_NEEDING_CROP = ['ae', 'sa'] as const;

/** Matches the aspect ratio of global's own MobileHero.webp (375x600). */
const TARGET_WIDTH = 375;
const TARGET_HEIGHT = 600;

interface HomepageWithHero {
  documentId: string;
  region: string;
  heroImage?: { id: number; url: string; width?: number | null; height?: number | null } | null;
  heroImageMobile?: { id: number; width?: number | null; height?: number | null } | null;
}

export async function ensureMobileHeroCrops(strapi: Core.Strapi) {
  if (process.env.SEED_CONTENT !== 'true') return;

  const sharp = await loadSharp();
  const uploadsDir = path.join(strapi.dirs.static.public, 'uploads');
  let generated = 0;

  for (const region of REGIONS_NEEDING_CROP) {
    const [homepage] = (await strapi.documents('api::homepage.homepage').findMany({
      filters: { region },
      populate: ['heroImage', 'heroImageMobile'],
      status: 'published',
    })) as HomepageWithHero[];

    if (!homepage?.heroImage) continue;

    // Seeding uploaded the same source file twice under two field names, which
    // gives heroImage and heroImageMobile different ids even though neither is
    // a real mobile crop — so id inequality can't be the "already has one"
    // signal. Same width/height is: a genuine crop has a different (portrait)
    // aspect ratio, so equal dimensions means it's still the desktop photo.
    const mobile = homepage.heroImageMobile;
    const hasOwnCrop =
      mobile && (mobile.width !== homepage.heroImage.width || mobile.height !== homepage.heroImage.height);
    if (hasOwnCrop) continue;

    const sourcePath = path.join(uploadsDir, path.basename(homepage.heroImage.url));
    if (!fs.existsSync(sourcePath)) {
      strapi.log.warn(`[seed] mobile hero crop: source file missing for ${region}: ${sourcePath}`);
      continue;
    }

    const tmp = path.join(os.tmpdir(), `beacon-mobile-hero-${region}-${Date.now()}.webp`);
    try {
      const info = await sharp(sourcePath)
        .resize({
          width: TARGET_WIDTH,
          height: TARGET_HEIGHT,
          fit: 'cover',
          position: sharp.strategy.attention,
        })
        .webp({ quality: 82 })
        .toFile(tmp);

      const uploadService = strapi.plugin('upload').service('upload');
      const [uploaded] = await uploadService.upload({
        data: {},
        files: {
          filepath: tmp,
          originalFilename: `hero-${region}-mobile.webp`,
          mimetype: 'image/webp',
          size: info.size,
        },
      });

      if (!uploaded?.id) {
        strapi.log.warn(`[seed] mobile hero crop: upload returned nothing for ${region}`);
        continue;
      }

      await strapi.documents('api::homepage.homepage').update({
        documentId: homepage.documentId,
        data: { heroImageMobile: uploaded.id },
        status: 'published',
      });

      // The old value was a second copy of the full desktop photo uploaded
      // under the mobile field name, not a real crop — drop it now that the
      // relation points at the actual crop, so it doesn't linger unreferenced.
      if (mobile?.id) {
        await strapi.plugin('upload').service('upload').remove({ id: mobile.id });
      }

      generated += 1;
      strapi.log.info(
        `[seed] ${region}: generated a ${info.width}x${info.height} mobile hero crop (was reusing the desktop image)`,
      );
    } catch (error) {
      strapi.log.warn(
        `[seed] could not generate mobile hero crop for ${region}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    } finally {
      fs.rmSync(tmp, { force: true });
    }
  }

  if (generated === 0) {
    strapi.log.info('[seed] mobile hero crops: nothing to do (all regions already have one)');
  }
}
