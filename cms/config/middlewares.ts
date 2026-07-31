import type { Core } from '@strapi/strapi';

/**
 * `strapi::cors` defaults to `origin: '*'` — allowing any site to call this
 * API from a browser — unless given an explicit list. Nothing in this app
 * currently makes a browser-side request to Strapi (every content read goes
 * through the Next server, and images load as plain `<img>`/`next/image`
 * tags, neither of which is subject to CORS), so this is defence-in-depth
 * rather than a fix for a live bug — but there's no reason to leave the API
 * open to arbitrary origins once a real production domain exists.
 *
 * CORS_ORIGINS is a comma-separated list; defaults cover local dev (both
 * possible frontend ports) plus the CMS's own admin panel origin, which needs
 * to reach its own API. Add the production frontend origin via env in
 * production rather than editing this file, since it differs per environment.
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      /**
       * Strapi's default CSP restricts `img-src`/`media-src` to 'self' plus a
       * few provider hosts. That is correct for the API but breaks the admin
       * panel's own previews once media is served from a different origin than
       * the admin is loaded from — which is the case in production, where the
       * panel runs on cms.beaconarabia.com behind Cloudflare.
       *
       * `https:` rather than a named host: the media origin is env-driven
       * (PUBLIC_URL) and changes between local, staging and production, so
       * pinning a hostname here would silently break previews on whichever
       * environment wasn't the one it was written for. Restricting to HTTPS
       * still rules out plaintext and data-exfiltration over other schemes,
       * and this policy governs the admin panel — not the public site, which
       * sets its own headers in frontend/next.config.ts.
       */
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', 'https:'],
          'media-src': ["'self'", 'data:', 'blob:', 'https:'],
          // Left null deliberately: with Cloudflare terminating TLS, emitting
          // upgrade-insecure-requests can cause redirect loops on hosts that
          // talk plain HTTP to the origin.
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      origin: env.array('CORS_ORIGINS', ['http://localhost:3000', 'http://localhost:1337']),
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  /**
   * Counts anonymous /api traffic and, far more strictly, attempts against the
   * admin login — see src/middlewares/rate-limit.ts for why authenticated
   * requests are exempt.
   *
   * Sits after `strapi::body` so a request is fully parsed before being
   * counted; ordering it earlier saves nothing worth the surprise.
   */
  {
    name: 'global::rate-limit',
    config: {
      max: env.int('RATE_LIMIT_MAX', 120),
      windowMs: env.int('RATE_LIMIT_WINDOW_MS', 60_000),
      authMax: env.int('RATE_LIMIT_AUTH_MAX', 10),
      authWindowMs: env.int('RATE_LIMIT_AUTH_WINDOW_MS', 300_000),
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
