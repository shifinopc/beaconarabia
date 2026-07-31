import fs from 'fs';
import os from 'os';
import path from 'path';
import type { Core } from '@strapi/strapi';
import seedData from './seed-data.json';

const REGIONS = ['global', 'ae', 'sa'] as const;

/** Frontend public/ folder — source for icons and logos carried over from the legacy repo. */
const PUBLIC_DIR = path.join(__dirname, '..', '..', '..', 'frontend', 'public');

/**
 * Uploads a file from the frontend's public folder into Strapi Media.
 * Returns the media id, or null if the file is missing or the upload fails —
 * never throws, so a bad asset cannot stop the server booting.
 */
async function uploadPublicAsset(
  strapi: Core.Strapi,
  relativePath: string,
  mimetype: string,
): Promise<number | null> {
  const filePath = path.join(PUBLIC_DIR, relativePath);
  try {
    if (!fs.existsSync(filePath)) {
      strapi.log.warn(`[seed] asset not found: ${filePath}`);
      return null;
    }
    const stat = fs.statSync(filePath);
    const uploaded = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        data: {},
        files: {
          filepath: filePath,
          originalFilename: path.basename(filePath),
          mimetype,
          size: stat.size,
        },
      });
    return Array.isArray(uploaded) ? (uploaded[0]?.id ?? null) : null;
  } catch (error) {
    strapi.log.warn(
      `[seed] asset upload failed for ${relativePath}: ${
        error instanceof Error ? error.message : error
      }`,
    );
    return null;
  }
}

/**
 * One block of a migrated article body.
 * The index signature is required for Strapi's JSON field type (JSONObject).
 */
interface SeedContentBlock {
  [key: string]: string | string[] | null;
  type: string | null;
  content: string | null;
  ul: string[] | null;
  hyperLink: string | null;
  imageUrl: string | null;
}

/**
 * Seeds the Services extracted from the legacy repos' hardcoded arrays.
 *
 * Opt-in via SEED_CONTENT=true so it never runs by accident in production.
 * Skips any region that already has services, so re-running is safe and will
 * not duplicate or overwrite content edited in the admin UI.
 *
 * The same six services are seeded for every region as an editable starting
 * point. Where a legacy site worded them differently, seedRegionalCopy replaces
 * the summary afterwards — see there.
 */
export async function seedContent(strapi: Core.Strapi) {
  if (process.env.SEED_CONTENT !== 'true') return;

  for (const region of REGIONS) {
    const existing = await strapi.documents('api::service.service').count({
      filters: { region },
    });

    // Backfill fields added after the first seed (details, icon) onto existing
    // services, without touching anything an editor has changed.
    if (existing > 0) {
      let details1 = 0;
      let icons = 0;

      for (const service of seedData.services) {
        const entry = service as { details?: string[]; icon?: string };

        const [found] = await strapi.documents('api::service.service').findMany({
          filters: { title: service.title, region },
          status: 'published',
          populate: ['icon'],
        });
        if (!found) continue;

        const data: Record<string, unknown> = {};

        if (entry.details?.length && !found.details) {
          data.details = entry.details;
          details1 += 1;
        }

        if (entry.icon && !found.icon) {
          const iconId = await uploadPublicAsset(strapi, entry.icon, 'image/svg+xml');
          if (iconId) {
            data.icon = iconId;
            icons += 1;
          }
        }

        if (Object.keys(data).length === 0) continue;

        await strapi.documents('api::service.service').update({
          documentId: found.documentId,
          data,
          status: 'published',
        });
      }

      strapi.log.info(
        `[seed] ${region}: ${existing} service(s) present; backfilled details on ${details1}, icons on ${icons}`,
      );
      continue;
    }

    for (const service of seedData.services) {
      const iconPath = (service as { icon?: string }).icon;
      const iconId = iconPath
        ? await uploadPublicAsset(strapi, iconPath, 'image/svg+xml')
        : null;

      await strapi.documents('api::service.service').create({
        data: {
          title: service.title,
          ...(iconId ? { icon: iconId } : {}),
          slug: service.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, ''),
          summary: service.summary,
          order: service.order,
          details: (service as { details?: string[] }).details ?? [],
          region,
        },
        status: 'published',
      });
    }

    strapi.log.info(`[seed] ${region}: created ${seedData.services.length} services`);
  }

  await seedFaqs(strapi);
  await seedAboutPages(strapi);
  await seedClients(strapi);
  await seedPosts(strapi);
  await seedCareers(strapi);
  await seedPartnerBenefits(strapi);
  await seedHomepages(strapi);
  await seedBusinessData(strapi);
  await seedRegionalCopy(strapi);
  await seedSections(strapi);
}

/**
 * Seeds the keyed page sections that exist on only one region.
 *
 * The Saudi site carried several blocks the global and UAE sites never had —
 * an investment-potential panel, KSA city cards, and a whole "Why Saudi" page
 * (benefits, Vision 2030, key factors, giga-projects). They were hardcoded in
 * bg-beaconSaudi and were lost in the consolidation; this brings them back as
 * editable content.
 *
 * Card and section images are uploaded to the Media Library rather than left as
 * public paths, so an editor can swap a photo without a deploy. Skips any
 * section that already exists, so re-running never overwrites CMS edits.
 */
async function seedSections(strapi: Core.Strapi) {
  const sections = (
    seedData as unknown as {
      sections?: {
        key: string;
        region: 'global' | 'ae' | 'sa';
        eyebrow?: string;
        title: string;
        description?: string;
        bullets?: string[];
        ctaLabel?: string;
        ctaHref?: string;
        image?: string;
        order?: number;
        cards?: { title: string; description?: string; badge?: string; image?: string }[];
      }[];
    }
  ).sections;

  if (!sections?.length) return;

  let created = 0;
  let reordered = 0;
  let replaced = 0;

  /**
   * Keys to rebuild from seed data rather than skip, as `key:region` pairs in
   * SEED_REPLACE_SECTIONS. The normal rule protects editor changes, which also
   * makes it impossible to correct a section that was seeded from the wrong
   * source. This is the escape hatch — it discards CMS edits for those keys, so
   * name them explicitly and only for as long as the fix takes.
   */
  const replaceKeys = new Set(
    (process.env.SEED_REPLACE_SECTIONS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

  if (replaceKeys.size > 0) {
    strapi.log.warn(
      `[seed] SEED_REPLACE_SECTIONS is set — any CMS edits to [${[...replaceKeys].join(
        ', ',
      )}] will be DISCARDED and rebuilt from seed-data.json this run. Unset it once the fix has landed.`,
    );
  }

  for (const section of sections) {
    const [found] = await strapi.documents('api::section.section').findMany({
      filters: { key: section.key, region: section.region },
      status: 'published',
    });

    if (found && replaceKeys.has(`${section.key}:${section.region}`)) {
      await strapi.documents('api::section.section').delete({ documentId: found.documentId });
      replaced += 1;
    } else if (found) {
      // Content is never overwritten, but `order` is: inserting a section
      // between two existing ones is otherwise impossible without editing every
      // row by hand. The trade-off is that reordering in the admin UI does not
      // survive a re-seed — change the order in seed-data.json instead.
      const wanted = section.order ?? 0;
      if (found.order !== wanted) {
        await strapi.documents('api::section.section').update({
          documentId: found.documentId,
          data: { order: wanted },
          status: 'published',
        });
        reordered += 1;
      }
      continue;
    }

    const imageId = section.image ? await uploadSectionImage(strapi, section.image) : null;

    const cards = [];
    for (const card of section.cards ?? []) {
      const cardImageId = card.image ? await uploadSectionImage(strapi, card.image) : null;
      cards.push({
        title: card.title,
        description: card.description,
        badge: card.badge,
        ...(cardImageId ? { image: cardImageId } : {}),
      });
    }

    await strapi.documents('api::section.section').create({
      data: {
        key: section.key,
        region: section.region,
        eyebrow: section.eyebrow,
        title: section.title,
        description: section.description,
        bullets: section.bullets ?? null,
        ctaLabel: section.ctaLabel,
        ctaHref: section.ctaHref,
        order: section.order ?? 0,
        ...(imageId ? { image: imageId } : {}),
        ...(cards.length ? { cards } : {}),
      },
      status: 'published',
    });

    created += 1;
  }

  strapi.log.info(
    `[seed] sections: created ${created} of ${sections.length}, reordered ${reordered}, replaced ${replaced}`,
  );
}

/** Uploads a section/card image, picking the mime type from its extension. */
function uploadSectionImage(strapi: Core.Strapi, relativePath: string) {
  const ext = path.extname(relativePath).toLowerCase();
  const mimetype =
    ext === '.svg'
      ? 'image/svg+xml'
      : ext === '.png'
        ? 'image/png'
        : ext === '.jpg' || ext === '.jpeg'
          ? 'image/jpeg'
          : 'image/webp';
  return uploadPublicAsset(strapi, relativePath, mimetype);
}

/**
 * Replaces the global copy with the region's own, where the legacy site had one.
 *
 * The seeds above give every region the same starting content, which is right
 * for most collections but wrong for Saudi: bg-beaconSaudi shipped its own
 * service descriptions and an entirely different set of client testimonials,
 * and ksa.beaconarabia.com still serves them. Seeding the global copy over the
 * top flattened a real difference between the sites.
 *
 * Only overwrites a value that still matches the global seed, so anything
 * edited in the admin UI is left alone and re-running is safe.
 */
async function seedRegionalCopy(strapi: Core.Strapi) {
  const overrides = (
    seedData as unknown as {
      regionalOverrides?: Record<
        string,
        {
          services?: { title: string; summary: string }[];
          testimonials?: {
            message: string;
            name: string;
            designation: string;
            order: number;
          }[];
          stats?: { label: string; value: number; suffix?: string; order: number }[];
        }
      >;
    }
  ).regionalOverrides;

  if (!overrides) return;

  const globalServices = new Map(
    (seedData as { services: { title: string; summary: string }[] }).services.map((s) => [
      s.title,
      s.summary,
    ]),
  );
  const globalTestimonialNames = new Set(
    (seedData as { testimonials?: { name: string }[] }).testimonials?.map((t) => t.name) ?? [],
  );
  const globalStatLabels = new Set(
    (seedData as { stats?: { label: string }[] }).stats?.map((s) => s.label) ?? [],
  );

  for (const region of REGIONS) {
    const override = overrides[region];
    if (!override) continue;

    let servicesUpdated = 0;

    for (const service of override.services ?? []) {
      const [found] = await strapi.documents('api::service.service').findMany({
        filters: { title: service.title, region },
        status: 'published',
      });
      // Untouched since seeding means the summary still equals the global copy.
      if (!found || found.summary !== globalServices.get(service.title)) continue;

      await strapi.documents('api::service.service').update({
        documentId: found.documentId,
        data: { summary: service.summary },
        status: 'published',
      });
      servicesUpdated += 1;
    }

    let testimonialsReplaced = 0;

    if (override.testimonials?.length) {
      const current = await strapi.documents('api::testimonial.testimonial').findMany({
        filters: { region },
        status: 'published',
      });
      // Replace only a pristine set — every entry still one of the global seeds.
      const pristine =
        current.length > 0 && current.every((t) => globalTestimonialNames.has(t.name ?? ''));

      if (pristine) {
        for (const t of current) {
          await strapi
            .documents('api::testimonial.testimonial')
            .delete({ documentId: t.documentId });
        }
        for (const t of override.testimonials) {
          await strapi.documents('api::testimonial.testimonial').create({
            data: { ...t, region },
            status: 'published',
          });
        }
        testimonialsReplaced = override.testimonials.length;
      }
    }

    let statsReplaced = 0;

    if (override.stats?.length) {
      const current = await strapi.documents('api::stat.stat').findMany({
        filters: { region },
        status: 'published',
      });
      // Replace only a pristine set — every row still one of the global labels.
      // The UAE site's own figures (Projects Completed, and different values
      // for Happy Clients / Years of Experience) were flattened onto global's
      // during the initial seed; this restores them without clobbering any
      // stat an editor has since customised.
      const pristine =
        current.length > 0 && current.every((s) => globalStatLabels.has(s.label ?? ''));

      if (pristine) {
        for (const s of current) {
          await strapi.documents('api::stat.stat').delete({ documentId: s.documentId });
        }
        for (const s of override.stats) {
          await strapi.documents('api::stat.stat').create({
            data: { ...s, region },
            status: 'published',
          });
        }
        statsReplaced = override.stats.length;
      }
    }

    strapi.log.info(
      `[seed] ${region}: regional copy — ${servicesUpdated} service summaries, ${testimonialsReplaced} testimonials, ${statsReplaced} stats`,
    );
  }
}

/**
 * Seeds one Homepage entry per region — the hero headline, description and CTA.
 *
 * Without these the Hero component silently falls back to copy hardcoded in the
 * component, so the CMS fields exist but changing them does nothing. Seeding
 * them makes the hero genuinely editable. Hero images stay in public/ for now;
 * upload them in the CMS to override.
 */
async function seedHomepages(strapi: Core.Strapi) {
  const homepages = (seedData as {
    homepages?: {
      region: 'global' | 'ae' | 'sa';
      heroTitle: string;
      heroDescription: string;
      heroCtaLabel: string;
      heroCtaHref: string;
      heroImage?: string;
      heroImageMobile?: string;
    }[];
  }).homepages;
  if (!homepages?.length) return;

  /** Guesses the mimetype from the file extension for the upload service. */
  const mimeOf = (file: string) =>
    file.endsWith('.png')
      ? 'image/png'
      : file.endsWith('.jpg') || file.endsWith('.jpeg')
        ? 'image/jpeg'
        : 'image/webp';

  for (const entry of homepages) {
    const [found] = await strapi.documents('api::homepage.homepage').findMany({
      filters: { region: entry.region },
      status: 'published',
      populate: ['heroImage', 'heroImageMobile'],
    });

    // Backfill hero images onto entries seeded before they were included.
    if (found) {
      const data: Record<string, unknown> = {};

      if (entry.heroImage && !found.heroImage) {
        const id = await uploadPublicAsset(strapi, entry.heroImage, mimeOf(entry.heroImage));
        if (id) data.heroImage = id;
      }
      if (entry.heroImageMobile && !found.heroImageMobile) {
        const id = await uploadPublicAsset(
          strapi,
          entry.heroImageMobile,
          mimeOf(entry.heroImageMobile),
        );
        if (id) data.heroImageMobile = id;
      }

      if (Object.keys(data).length === 0) {
        strapi.log.info(`[seed] ${entry.region}: homepage already present, skipping`);
        continue;
      }

      await strapi.documents('api::homepage.homepage').update({
        documentId: found.documentId,
        data,
        status: 'published',
      });
      strapi.log.info(
        `[seed] ${entry.region}: homepage hero images uploaded (${Object.keys(data).join(', ')})`,
      );
      continue;
    }

    const heroId = entry.heroImage
      ? await uploadPublicAsset(strapi, entry.heroImage, mimeOf(entry.heroImage))
      : null;
    const mobileId = entry.heroImageMobile
      ? await uploadPublicAsset(strapi, entry.heroImageMobile, mimeOf(entry.heroImageMobile))
      : null;

    await strapi.documents('api::homepage.homepage').create({
      data: {
        region: entry.region,
        heroTitle: entry.heroTitle,
        heroDescription: entry.heroDescription,
        heroCtaLabel: entry.heroCtaLabel,
        ...(entry.heroCtaHref ? { heroCtaHref: entry.heroCtaHref } : {}),
        ...(heroId ? { heroImage: heroId } : {}),
        ...(mobileId ? { heroImageMobile: mobileId } : {}),
      },
      status: 'published',
    });
    strapi.log.info(`[seed] ${entry.region}: created homepage entry with hero images`);
  }
}

/**
 * Seeds the business data that was previously hardcoded in the frontend —
 * offices, stats, testimonials and the site-wide contact block.
 *
 * These are the details most likely to change without a developer around
 * (a new office, a new phone number, an updated headcount), so they belong in
 * the CMS rather than in a TypeScript constant.
 *
 * Stats and testimonials are seeded per region; offices and site settings are
 * company-wide.
 */
async function seedBusinessData(strapi: Core.Strapi) {
  const data = seedData as unknown as {
    offices?: {
      city: string;
      country: 'ksa' | 'uae' | 'bahrain' | 'qatar';
      address: string;
      phones: string[];
      mapUrl: string;
      wide: boolean;
      order: number;
    }[];
    stats?: { label: string; value: number; suffix: string; order: number }[];
    testimonials?: {
      message: string;
      name: string;
      designation: string;
      order: number;
    }[];
    siteSettings?: {
      email: string;
      phones: string[];
      whatsapp: string;
      officeAddress: string;
      officeMapUrl: string;
      socials: { name: string; href: string; icon: string }[];
      copyrightHolder: string;
    };
  };

  if (data.offices?.length) {
    const existing = await strapi.documents('api::office.office').count({});
    if (existing > 0) {
      strapi.log.info(`[seed] ${existing} office(s) already present, skipping`);
    } else {
      for (const office of data.offices) {
        await strapi.documents('api::office.office').create({
          data: office,
          status: 'published',
        });
      }
      strapi.log.info(`[seed] created ${data.offices.length} offices`);
    }
  }

  for (const region of REGIONS) {
    if (data.stats?.length) {
      const existing = await strapi.documents('api::stat.stat').count({ filters: { region } });
      if (existing === 0) {
        for (const stat of data.stats) {
          await strapi.documents('api::stat.stat').create({
            data: { ...stat, region },
            status: 'published',
          });
        }
        strapi.log.info(`[seed] ${region}: created ${data.stats.length} stats`);
      }
    }

    if (data.testimonials?.length) {
      const existing = await strapi
        .documents('api::testimonial.testimonial')
        .count({ filters: { region } });
      if (existing === 0) {
        for (const t of data.testimonials) {
          await strapi.documents('api::testimonial.testimonial').create({
            data: { ...t, region },
            status: 'published',
          });
        }
        strapi.log.info(`[seed] ${region}: created ${data.testimonials.length} testimonials`);
      }
    }
  }

  if (data.siteSettings) {
    const current = await strapi.documents('api::site-setting.site-setting').findFirst({});
    if (!current) {
      await strapi.documents('api::site-setting.site-setting').create({
        data: data.siteSettings,
        status: 'published',
      });
      strapi.log.info('[seed] created site settings');
    } else {
      strapi.log.info('[seed] site settings already present, skipping');
    }
  }
}

/**
 * Seeds the careers page: open positions plus the values/perks highlights.
 *
 * Job titles, employment type and the detail bullets are carried over from the
 * legacy page — those were real. The values and perks descriptions were Lorem
 * Ipsum on the live site, so only their titles are seeded and the descriptions
 * are left empty for someone to write in the CMS rather than shipping filler.
 *
 * The legacy location read "Doaha"; corrected to "Doha" on the way in.
 * Seeded to the global region only.
 */
async function seedCareers(strapi: Core.Strapi) {
  const data = seedData as {
    jobs?: {
      title: string;
      employmentType: string;
      location: string;
      details: string[];
      order: number;
    }[];
    careerHighlights?: {
      kind: 'value' | 'perk';
      title: string;
      description: string;
      icon: string | null;
      order: number;
    }[];
  };

  if (data.jobs?.length) {
    const existing = await strapi.documents('api::job.job').count({
      filters: { region: 'global' },
    });
    if (existing > 0) {
      strapi.log.info(`[seed] global: ${existing} job(s) already present, skipping`);
    } else {
      for (const job of data.jobs) {
        await strapi.documents('api::job.job').create({
          data: { ...job, region: 'global' },
          status: 'published',
        });
      }
      strapi.log.info(`[seed] global: created ${data.jobs.length} jobs`);
    }
  }

  if (data.careerHighlights?.length) {
    const existing = await strapi.documents('api::career-highlight.career-highlight').count({
      filters: { region: 'global' },
    });

    // Backfill descriptions onto highlights seeded before the copy was written.
    // Only fills blanks — anything already written in the CMS is left alone.
    if (existing > 0) {
      let filled = 0;
      for (const item of data.careerHighlights) {
        if (!item.description) continue;

        const [found] = await strapi
          .documents('api::career-highlight.career-highlight')
          .findMany({ filters: { title: item.title, region: 'global' }, status: 'published' });
        if (!found || found.description) continue;

        await strapi.documents('api::career-highlight.career-highlight').update({
          documentId: found.documentId,
          data: { description: item.description },
          status: 'published',
        });
        filled += 1;
      }
      strapi.log.info(
        `[seed] global: ${existing} career highlight(s) present; filled ${filled} description(s)`,
      );
      return;
    }

    for (const item of data.careerHighlights) {
      const iconId = item.icon
        ? await uploadPublicAsset(strapi, item.icon, 'image/svg+xml')
        : null;

      await strapi.documents('api::career-highlight.career-highlight').create({
        data: {
          kind: item.kind,
          title: item.title,
          description: item.description,
          order: item.order,
          region: 'global',
          ...(iconId ? { icon: iconId } : {}),
        },
        status: 'published',
      });
    }
    strapi.log.info(
      `[seed] global: created ${data.careerHighlights.length} career highlights`,
    );
  }

}

/**
 * Seeds the partners page benefits.
 *
 * The legacy page had six cards but only three distinct titles — "Growth
 * Opportunities", "Make Money" and "Promote Your Business" each appeared twice
 * — with Lorem Ipsum in every description. Six distinct benefits with real copy
 * are seeded instead; edit them in the CMS.
 */
async function seedPartnerBenefits(strapi: Core.Strapi) {
  const benefits = (seedData as {
    partnerBenefits?: {
      title: string;
      description: string;
      icon: string;
      order: number;
    }[];
  }).partnerBenefits;
  if (!benefits?.length) return;

  const existing = await strapi.documents('api::partner-benefit.partner-benefit').count({
    filters: { region: 'global' },
  });
  if (existing > 0) {
    strapi.log.info(`[seed] global: ${existing} partner benefit(s) already present, skipping`);
    return;
  }

  for (const benefit of benefits) {
    const iconId = benefit.icon
      ? await uploadPublicAsset(strapi, benefit.icon, 'image/svg+xml')
      : null;

    await strapi.documents('api::partner-benefit.partner-benefit').create({
      data: {
        title: benefit.title,
        description: benefit.description,
        order: benefit.order,
        region: 'global',
        ...(iconId ? { icon: iconId } : {}),
      },
      status: 'published',
    });
  }

  strapi.log.info(`[seed] global: created ${benefits.length} partner benefits`);
}

/**
 * Migrates the blog out of Sanity.
 *
 * The legacy global site fetched posts from Sanity at runtime
 * (`*[_type == "blog"]`, project l1v9kmrc). Those 21 posts were exported from
 * the public dataset and are recreated here, with each cover image downloaded
 * from Sanity's CDN into Strapi Media — so once seeded, nothing depends on
 * Sanity any more.
 *
 * Posts are seeded to the `global` region only; the legacy UAE and Saudi sites
 * had no blog. Re-assign individual posts to a region in the admin UI.
 */
async function seedPosts(strapi: Core.Strapi) {
  const posts = (seedData as {
    posts?: {
      title: string;
      subtitle: string;
      slug: string;
      category: string;
      excerpt: string;
      publishedAt: string | null;
      coverUrl: string | null;
      contentBlocks: SeedContentBlock[];
    }[];
  }).posts;
  if (!posts?.length) return;

  const existing = await strapi.documents('api::post.post').count({
    filters: { region: 'global' },
  });

  // Posts already exist (seeded before contentBlocks was added) — backfill the
  // article bodies onto them instead of skipping, without touching anything an
  // editor may have changed.
  if (existing > 0) {
    let backfilled = 0;
    for (const post of posts) {
      const [found] = await strapi.documents('api::post.post').findMany({
        filters: { slug: post.slug, region: 'global' },
        status: 'published',
      });
      if (!found || found.contentBlocks) continue;

      await strapi.documents('api::post.post').update({
        documentId: found.documentId,
        data: { contentBlocks: post.contentBlocks },
        status: 'published',
      });
      backfilled += 1;
    }
    strapi.log.info(
      `[seed] global: ${existing} post(s) present; backfilled contentBlocks on ${backfilled}`,
    );
    return;
  }

  let created = 0;
  let withCover = 0;

  for (const post of posts) {
    let coverId: number | null = null;

    if (post.coverUrl) {
      try {
        const res = await fetch(post.coverUrl);
        if (res.ok) {
          const buffer = Buffer.from(await res.arrayBuffer());
          const ext = path.extname(new URL(post.coverUrl).pathname) || '.jpg';
          const tmp = path.join(os.tmpdir(), `beacon-cover-${post.slug}${ext}`);
          fs.writeFileSync(tmp, buffer);

          const uploaded = await strapi
            .plugin('upload')
            .service('upload')
            .upload({
              data: {},
              files: {
                filepath: tmp,
                originalFilename: `${post.slug}${ext}`,
                mimetype: res.headers.get('content-type') ?? 'image/jpeg',
                size: buffer.length,
              },
            });

          coverId = Array.isArray(uploaded) ? uploaded[0]?.id ?? null : null;
          if (coverId) withCover += 1;
          fs.unlinkSync(tmp);
        }
      } catch (error) {
        strapi.log.warn(
          `[seed] cover download failed for ${post.slug}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    await strapi.documents('api::post.post').create({
      data: {
        title: post.title,
        subtitle: post.subtitle,
        slug: post.slug,
        category: post.category,
        excerpt: post.excerpt,
        contentBlocks: post.contentBlocks,
        region: 'global',
        ...(coverId ? { cover: coverId } : {}),
      },
      status: 'published',
    });
    created += 1;
  }

  strapi.log.info(`[seed] global: created ${created} posts (${withCover} with covers)`);
}

/**
 * Seeds the client logo strip, uploading each logo into Strapi Media so the
 * strip becomes editable rather than a hardcoded array in the frontend.
 *
 * Logos are read from the frontend's public folder — the assets carried over
 * from the legacy repo. Upload failures are logged and skipped rather than
 * thrown, so a missing file can never stop the server booting.
 */
async function seedClients(strapi: Core.Strapi) {
  const clients = (seedData as { clients?: { file: string; name: string; order: number }[] })
    .clients;
  if (!clients?.length) return;


  for (const region of REGIONS) {
    const existing = await strapi.documents('api::client.client').count({ filters: { region } });
    if (existing > 0) {
      strapi.log.info(`[seed] ${region}: ${existing} client(s) already present, skipping`);
      continue;
    }

    let created = 0;
    for (const client of clients) {
      const logoId = await uploadPublicAsset(strapi, client.file, 'image/webp');

      await strapi.documents('api::client.client').create({
        data: {
          name: client.name,
          order: client.order,
          region,
          ...(logoId ? { logo: logoId } : {}),
        },
        status: 'published',
      });
      created += 1;
    }

    strapi.log.info(`[seed] ${region}: created ${created} clients`);
  }
}

/** An About page per region, so /about renders body copy out of the box. */
async function seedAboutPages(strapi: Core.Strapi) {
  const BODY: Record<string, { title: string; body: string }> = {
    global: {
      title: 'Who We Are',
      // The actual intro copy from the legacy About page.
      body: 'At Beacon Global, we are a team of dedicated professionals, including accountants, auditors, and financial analysts, committed to delivering exceptional business consultancy services. Recognizing the growing demand for reliable auditing and accounting services, we have established a strong reputation in the industry. Our services go beyond traditional auditing and accounting to encompass business consultancy, tax advisory, regulatory compliance, and digital marketing. With a presence across GCC, we uphold values of professionalism, integrity, and reliability in all our endeavors. Specializing in business incorporation services, we guide our clients through tax, auditing, and regulatory complexities with confidence. Our ultimate goal is to provide unmatched service and value, built on enduring partnerships and positive client relationships.',
    },
    ae: {
      title: 'Beacon in the United Arab Emirates',
      body: 'We help you fulfil your entrepreneurial journey and dream business setup in the UAE, with support spanning tax and accounting through to legal support and marketing.',
    },
    sa: {
      title: 'Beacon in Saudi Arabia',
      body: 'Starting a business in KSA can be challenging without proper assistance. From setting up your company to maintaining corporate governance, we provide reliable support to navigate these complexities and enter the largest market in the GCC.',
    },
  };

  for (const region of REGIONS) {
    const existing = await strapi.documents('api::page.page').count({
      filters: { region, slug: 'about' },
    });
    const content = BODY[region];

    // Replace the earlier placeholder copy with the real About text, but only
    // if it is still untouched — any editor change is left alone.
    if (existing > 0) {
      const PLACEHOLDER_PREFIX = 'Beacon is your global business advisory partner, offering';
      const [found] = await strapi.documents('api::page.page').findMany({
        filters: { region, slug: 'about' },
        status: 'published',
      });

      if (found?.body?.startsWith(PLACEHOLDER_PREFIX)) {
        await strapi.documents('api::page.page').update({
          documentId: found.documentId,
          data: { body: content.body },
          status: 'published',
        });
        strapi.log.info(`[seed] ${region}: about page body replaced with legacy copy`);
      } else {
        strapi.log.info(`[seed] ${region}: about page already present, skipping`);
      }
      continue;
    }
    await strapi.documents('api::page.page').create({
      data: {
        title: content.title,
        slug: 'about',
        body: content.body,
        region,
        seoTitle: content.title,
        seoDescription: content.body.slice(0, 160),
      },
      status: 'published',
    });
    strapi.log.info(`[seed] ${region}: created about page`);
  }
}

/** FAQs extracted from the legacy Faq.js, which held them in useState. */
async function seedFaqs(strapi: Core.Strapi) {
  for (const region of REGIONS) {
    const existing = await strapi.documents('api::faq.faq').count({ filters: { region } });
    if (existing > 0) {
      strapi.log.info(`[seed] ${region}: ${existing} faq(s) already present, skipping`);
      continue;
    }

    for (const faq of seedData.faqs ?? []) {
      await strapi.documents('api::faq.faq').create({
        data: { question: faq.question, answer: faq.answer, order: faq.order, region },
        status: 'published',
      });
    }

    strapi.log.info(`[seed] ${region}: created ${(seedData.faqs ?? []).length} faqs`);
  }
}
