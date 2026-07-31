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
  /*
   * NOT INSTALLED: strapi-google-analytics-dashboard
   *
   * It was installed, tested and removed. At v0.0.2 it declares `auth: false`
   * on all three of its routes, which makes the settings endpoint — where its
   * Google Cloud service-account key is stored — world-readable and
   * world-writable. Verified against a local instance with no credentials of
   * any kind:
   *
   *   PUT /api/strapi-google-analytics-dashboard/settings  -> 200 {"success":true}
   *   GET /api/strapi-google-analytics-dashboard/settings  -> the full settings,
   *                                                           private key included
   *
   * It cannot be fixed from this side. Its admin UI calls those endpoints with
   * a plain `fetch()` and sends no Authorization header, so requiring auth
   * server-side would simply break the panel — the routes being public is how
   * the plugin is designed to work, not a misconfiguration.
   *
   * The exposure is not limited to analytics: a GCP service-account key grants
   * whatever that account can reach in the project.
   *
   * Nothing is lost by leaving it out. Collection is the gtag snippet in the
   * frontend (components/Analytics.tsx); this plugin only displays data back,
   * which analytics.google.com already does. Revisit if a release fixes the
   * route auth.
   */
});

export default config;
