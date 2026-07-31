import fs from 'fs';
import path from 'path';
import type { Core } from '@strapi/strapi';
import { seedContent } from './seed';
import { optimiseMedia, pruneUnusedFormats } from './optimise-media';
import { ensureMobileHeroCrops } from './mobile-hero';
import { fillBlogExcerpts } from './fill-excerpts';
import { migrateInlineImages } from './migrate-inline-images';

/** Content types the public (unauthenticated) role may read. */
const PUBLIC_READABLE = [
  'page',
  'service',
  'post',
  'faq',
  'homepage',
  'client',
  'job',
  'career-highlight',
  'office',
  'stat',
  'testimonial',
  'site-setting',
  'partner-benefit',
  'section',
] as const;
const READ_ACTIONS = ['find', 'findOne'] as const;

/**
 * Grants or revokes public (unauthenticated) read access to the site's content
 * types, in code rather than by clicking through Settings -> Roles -> Public,
 * so the configuration is versioned and reproduces identically on every
 * environment.
 *
 * Off by default. Anyone on the internet could otherwise read every field on
 * every entry — draft included, since `find`/`findOne` is not draft-aware —
 * with no rate limit and no audit trail. The frontend authenticates instead
 * with the read-only API token `ensureApiToken` provisions below, which is
 * exactly as capable for our read-only access pattern and costs nothing extra
 * to use.
 *
 * Set STRAPI_PUBLIC_READ=true to opt back in — e.g. for a quick local check
 * with curl, without wiring up a token. Whichever state you're in, existing
 * permissions/grants of the other kind are left alone rather than force-reset
 * on every boot, so a manual change in the admin UI survives a restart.
 */
async function ensurePublicReadAccess(strapi: Core.Strapi) {
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });

  if (!publicRole) {
    strapi.log.warn('[bootstrap] public role not found; skipping permissions');
    return;
  }

  const wantPublic = process.env.STRAPI_PUBLIC_READ === 'true';
  const changed: string[] = [];

  for (const type of PUBLIC_READABLE) {
    for (const action of READ_ACTIONS) {
      const permission = `api::${type}.${type}.${action}`;

      const existing = await strapi
        .query('plugin::users-permissions.permission')
        .findOne({ where: { action: permission, role: publicRole.id } });

      if (wantPublic && !existing) {
        await strapi.query('plugin::users-permissions.permission').create({
          data: { action: permission, role: publicRole.id },
        });
        changed.push(permission);
      } else if (!wantPublic && existing) {
        await strapi.query('plugin::users-permissions.permission').delete({
          where: { id: existing.id },
        });
        changed.push(permission);
      }
    }
  }

  if (changed.length) {
    strapi.log.info(
      `[bootstrap] ${wantPublic ? 'granted' : 'revoked'} ${changed.length} public read permission(s): ${changed.join(', ')}`,
    );
  } else if (!wantPublic) {
    strapi.log.info('[bootstrap] public read access is off (STRAPI_PUBLIC_READ not set)');
  }
}

/**
 * Provisions a read-only content-API token for the frontend, if one doesn't
 * already exist, and writes it straight into the frontend's .env.local.
 *
 * Strapi only ever reveals a token's raw value at the moment of creation —
 * afterwards only its hash is stored, even to the admin who created it — so
 * this has to both create it and capture it in the same step, or the value is
 * gone. A `type: 'read-only'` token can find/findOne every content type with
 * no per-type permission rows to maintain, which is exactly our access
 * pattern and the reason ensurePublicReadAccess can default to off.
 *
 * Idempotent by name: if "Frontend (read-only)" already exists, this only logs
 * that it's present — it never rotates it or touches .env.local again, so a
 * value you've since deployed elsewhere is never silently replaced.
 *
 * The .env.local write only happens when NODE_ENV !== 'production', since in
 * production the token belongs in whatever secret store the host uses, not in
 * a file this process can reach.
 */
interface TokenSpec {
  name: string;
  description: string;
  /** Env var the frontend reads this token from. */
  envVar: string;
  /** `read-only` for reads; `custom` narrows to the listed permissions. */
  type: 'read-only' | 'custom';
  /** Required for `custom`, e.g. ['api::enquiry.enquiry.create']. */
  permissions?: string[];
}

async function provisionToken(strapi: Core.Strapi, spec: TokenSpec) {
  const existing = await strapi.db
    .query('admin::api-token')
    .findOne({ where: { name: spec.name } });

  if (existing) {
    strapi.log.info(`[bootstrap] API token "${spec.name}" already exists`);
    return;
  }

  const apiTokenService = strapi.service('admin::api-token') as {
    create: (attrs: Record<string, unknown>) => Promise<{ accessKey: string }>;
  };

  let created: { accessKey: string };
  try {
    created = await apiTokenService.create({
      name: spec.name,
      description: spec.description,
      type: spec.type,
      kind: 'content-api',
      lifespan: null,
      ...(spec.permissions ? { permissions: spec.permissions } : {}),
    });
  } catch (error) {
    strapi.log.warn(
      `[bootstrap] could not create API token "${spec.name}": ${
        error instanceof Error ? error.message : error
      }`,
    );
    return;
  }

  strapi.log.info(`[bootstrap] created API token "${spec.name}"`);

  if (process.env.NODE_ENV === 'production') {
    strapi.log.warn(
      `[bootstrap] ${spec.envVar}=${created.accessKey} — save this now, it will not be shown again. ` +
        'Not writing it to .env.local in production; put it in your host’s secret store.',
    );
    return;
  }

  const envPath = path.join(__dirname, '..', '..', '..', 'frontend', '.env.local');
  try {
    const env = fs.readFileSync(envPath, 'utf8');
    const line = `${spec.envVar}=${created.accessKey}`;
    const pattern = new RegExp(`^${spec.envVar}=.*$`, 'm');
    const updated = pattern.test(env)
      ? env.replace(pattern, line)
      : `${env.trimEnd()}\n${line}\n`;
    fs.writeFileSync(envPath, updated);
    strapi.log.info(
      `[bootstrap] wrote ${spec.envVar} to frontend/.env.local — restart the Next.js dev server to pick it up`,
    );
  } catch (error) {
    strapi.log.warn(
      `[bootstrap] created "${spec.name}" but could not write frontend/.env.local: ${
        error instanceof Error ? error.message : error
      }. ${spec.envVar}=${created.accessKey}`,
    );
  }
}

async function ensureApiToken(strapi: Core.Strapi) {
  await provisionToken(strapi, {
    name: 'Frontend (read-only)',
    description: 'Read-only access for the Next.js frontend (auto-provisioned).',
    envVar: 'STRAPI_API_TOKEN',
    type: 'read-only',
  });

  /**
   * A second, deliberately tiny token that can create enquiries and nothing
   * else.
   *
   * The alternative — granting the public role create access, as the sibling
   * project does — would let anyone POST straight to Strapi and skip the
   * honeypot, rate limit and Turnstile check that the frontend's /api/contact
   * applies. Requiring a token that only ever lives on the Next server keeps
   * those checks on the only path in.
   */
  await provisionToken(strapi, {
    name: 'Frontend (submissions)',
    description: 'Creates enquiries from the website forms. No read access.',
    envVar: 'STRAPI_WRITE_TOKEN',
    type: 'custom',
    permissions: ['api::enquiry.enquiry.create'],
  });
}

/**
 * Turns off the upload plugin's responsive formats.
 *
 * Strapi generates large/medium/small copies of every image on upload. The
 * frontend never requests them: next/image resizes from the original and serves
 * WebP at the exact breakpoint each layout needs, so the copies were pure
 * storage — 360 files and 14.5 MB against 150 originals.
 *
 * Thumbnails are unaffected. `generateThumbnail` is a separate call in the
 * plugin and is not gated by this flag, so the admin media grid keeps its
 * previews instead of falling back to loading full-size images.
 *
 * This lives here rather than in config/plugins.ts because it is a runtime
 * setting in the plugin store (Settings → Media Library → "Responsive friendly
 * upload"), not file config. Doing it in bootstrap means every environment gets
 * it rather than relying on someone remembering the toggle. Idempotent, and it
 * only writes when the value is actually wrong, so turning it back on in the
 * admin is not silently undone on the next restart... except at boot, which is
 * the trade for reproducibility — flip it here if you want it back.
 */
async function ensureUploadSettings(strapi: Core.Strapi) {
  try {
    const store = strapi.store({ type: 'plugin', name: 'upload', key: 'settings' });
    const settings = ((await store.get({})) ?? {}) as Record<string, unknown>;

    if (settings.responsiveDimensions === false) return;

    await store.set({ value: { ...settings, responsiveDimensions: false } });
    strapi.log.info('[bootstrap] upload: responsive formats disabled (next/image resizes instead)');
  } catch (error) {
    strapi.log.warn(
      `[bootstrap] could not update upload settings: ${
        error instanceof Error ? error.message : error
      }`,
    );
  }
}

/**
 * Registers the Next.js revalidation webhook so CMS edits appear immediately
 * instead of waiting out the frontend's 60s cache.
 *
 * Created in code rather than clicked into Settings → Webhooks so every
 * environment gets it automatically. Idempotent: an existing webhook with the
 * same name is left alone, so URL or header changes made in the admin survive
 * a restart.
 *
 * Configure via env:
 *   REVALIDATE_URL     - the Next endpoint, e.g. http://localhost:3000/api/revalidate
 *   REVALIDATE_SECRET  - shared secret, must match the frontend
 */
async function ensureRevalidationWebhook(strapi: Core.Strapi) {
  const url = process.env.REVALIDATE_URL;
  const secret = process.env.REVALIDATE_SECRET;

  if (!url || !secret) {
    strapi.log.warn(
      '[bootstrap] REVALIDATE_URL / REVALIDATE_SECRET not set — frontend revalidation webhook not registered',
    );
    return;
  }

  const NAME = 'nextjs-revalidate';

  try {
    // webhookStore lives in the DI container, not as a property on strapi.
    const store = strapi.get('webhookStore') as {
      findWebhooks: () => Promise<{ name?: string }[] | null>;
      createWebhook: (data: Record<string, unknown>) => Promise<unknown>;
    };

    const existing = await store.findWebhooks();
    if (existing?.some((w) => w.name === NAME)) {
      strapi.log.info(`[bootstrap] webhook "${NAME}" already registered`);
      return;
    }

    await store.createWebhook({
      name: NAME,
      url,
      headers: { Authorization: `Bearer ${secret}` },
      events: [
        'entry.create',
        'entry.update',
        'entry.delete',
        'entry.publish',
        'entry.unpublish',
        'media.create',
        'media.update',
        'media.delete',
      ],
      isEnabled: true,
    });

    strapi.log.info(`[bootstrap] registered webhook "${NAME}" -> ${url}`);
  } catch (error) {
    strapi.log.warn(
      `[bootstrap] could not register revalidation webhook: ${
        error instanceof Error ? error.message : error
      }`,
    );
  }
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await ensureApiToken(strapi);
    await ensurePublicReadAccess(strapi);
    await ensureUploadSettings(strapi);
    await ensureRevalidationWebhook(strapi);
    await seedContent(strapi);
    await ensureMobileHeroCrops(strapi);
    await fillBlogExcerpts(strapi);
    await migrateInlineImages(strapi);
    await optimiseMedia(strapi);
    await pruneUnusedFormats(strapi);
  },
};
