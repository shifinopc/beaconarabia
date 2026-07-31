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
  'strapi::security',
  {
    name: 'strapi::cors',
    config: {
      origin: env.array('CORS_ORIGINS', ['http://localhost:3000', 'http://localhost:1337']),
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
