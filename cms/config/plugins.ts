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
   * Installed and tested twice, removed both times. Three independent failures
   * at v0.0.2 — which is the newest release; only 0.0.1 and 0.0.2 have ever
   * shipped:
   *
   * 1. It publishes its own credentials. All three routes declare
   *    `auth: false`, so the settings endpoint holding the Google Cloud
   *    service-account key is world-readable and world-writable. Verified with
   *    no credentials of any kind:
   *
   *      PUT /api/strapi-google-analytics-dashboard/settings -> 200
   *      GET /api/strapi-google-analytics-dashboard/settings -> key returned
   *
   *    Not fixable from here: its admin UI calls those routes with a plain
   *    fetch() and no Authorization header, so requiring auth breaks the panel.
   *
   * 2. It takes this deployment down. `@google-analytics/data` pulls in
   *    gRPC/protobuf, whose native threads pushed the CMS past the shared
   *    host's LVE limit — Strapi could no longer fork and every request 503'd.
   *
   * 3. Its dashboard does not work. It bundles chart.js@4 but never calls
   *    ChartJS.register(), so the page dies on load with `"category" is not a
   *    registered scale`. Chart.js v3+ requires explicit registration; this is
   *    broken for everyone, not just here.
   *
   * Nothing is lost. Collection is the gtag snippet in the frontend
   * (components/Analytics.tsx) — that is what records visits. This plugin only
   * displayed data back, which analytics.google.com does properly.
   */
});

export default config;
