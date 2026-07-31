import type { Core } from '@strapi/strapi';

/**
 * `url` and `proxy` are left unset in development on purpose: Strapi then
 * stores upload URLs as relative paths (`/uploads/...`), which is what
 * lib/strapi.ts's mediaUrl() on the frontend is built to prefix with whichever
 * STRAPI_URL it's given — so media references stay portable across hosts
 * rather than getting baked in as absolute URLs pointing at today's domain.
 *
 * In production, behind a reverse proxy (nginx, a load balancer, etc.)
 * terminating TLS in front of Strapi, set PUBLIC_URL to the public HTTPS
 * origin (e.g. https://www.cms.beaconarabia.com) and enable proxy trust so
 * Strapi reads the real scheme/host from X-Forwarded-* instead of assuming
 * plain HTTP on whatever port it's actually bound to — needed for the admin
 * panel's own links and for secure cookies to work correctly behind TLS
 * termination that happens somewhere else.
 */
const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  ...(env('PUBLIC_URL') ? { url: env('PUBLIC_URL') } : {}),
  proxy: env.bool('IS_PROXIED', false),
  app: {
    keys: env.array('APP_KEYS')!,
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;
