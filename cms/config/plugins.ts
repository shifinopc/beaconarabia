import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedExecutableTypes = [
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'users-permissions': {
    config: {
      jwtManagement: 'refresh',
      sessions: {
        httpOnly: true,
      },
    },
  },
  upload: {
    config: {
      security: {
        allowedTypes: allowedMediaTypes,
        deniedTypes: deniedExecutableTypes,
      },
    },
  },
  /**
   * Google Analytics 4 dashboard in the admin (Settings -> Google Analytics).
   *
   * ---------------------------------------------------------------------------
   * SECURITY: this plugin publishes whatever credentials you give it.
   * ---------------------------------------------------------------------------
   * At v0.0.2 (the latest release; only 0.0.1 and 0.0.2 exist) it declares
   * `auth: false` on all three of its routes. Verified against a local instance
   * with no credentials of any kind:
   *
   *   PUT /api/strapi-google-analytics-dashboard/settings -> 200 {"success":true}
   *   GET /api/strapi-google-analytics-dashboard/settings -> full settings
   *                                                          returned, key included
   *
   * So anyone can read the stored service-account key from the public CMS, and
   * anyone can overwrite the settings.
   *
   * It cannot be fixed here: the plugin's admin UI calls those endpoints with a
   * plain `fetch()` carrying no Authorization header, so enforcing auth
   * server-side would break the panel. The public routes are the design.
   *
   * Enabled at the owner's request. To keep the blast radius survivable, the
   * service account entered in that screen MUST be:
   *
   *   1. a NEW, dedicated service account — never one already used for anything
   *      else in the Google Cloud project;
   *   2. granted NO project-level IAM roles at all;
   *   3. added only as a "Viewer" on the single GA4 property, in GA Admin ->
   *      Property Access Management.
   *
   * Configured that way, a leaked key exposes read-only access to this one
   * property's analytics — bad, but bounded. Any broader grant, and the key in
   * that box is a public key to the rest of the project.
   *
   * Better still, put Cloudflare Access (Zero Trust, free tier) in front of
   * /admin and /api/strapi-google-analytics-dashboard/*, which closes the hole
   * entirely without touching the plugin.
   *
   * Revisit if a release ever adds route auth.
   */
  'strapi-google-analytics-dashboard': {
    enabled: true,
  },
});

export default config;
