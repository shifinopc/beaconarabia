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
   * `chart.js` and `react-chartjs-2` are declared as direct dependencies of
   * this app even though nothing here imports them. The plugin registers its
   * Chart.js scales against whichever copy it resolves, and if npm nests a
   * second copy the chart renders against a different registry — which
   * surfaces as `"category" is not a registered scale` the moment the
   * dashboard loads. Hoisting them guarantees one instance. Do not remove them
   * as "unused".
   *
   * SECURITY, known and accepted: at v0.0.2 all three of the plugin's routes
   * declare `auth: false`, verified in the published package. The settings
   * endpoint that stores the Google Cloud service-account key is therefore
   * readable and writable by anyone who can reach the CMS:
   *
   *   PUT /api/strapi-google-analytics-dashboard/settings -> 200
   *   GET /api/strapi-google-analytics-dashboard/settings -> key returned
   *
   * It cannot be fixed here — the plugin's own admin UI calls those routes
   * with a plain fetch() and no Authorization header, so adding auth would
   * break the panel.
   *
   * Therefore the service account entered in that screen must be scoped to
   * survive disclosure: a NEW account, with NO project-level IAM roles, added
   * only as a Viewer on the single GA4 property. So scoped, a leaked key is
   * read-only access to one property's analytics. Cloudflare Access in front
   * of /admin and this plugin's routes closes it properly.
   *
   * Note this plugin only *displays* analytics. Collection is the gtag snippet
   * in the frontend (components/Analytics.tsx), which is independent of it.
   */
  'strapi-google-analytics-dashboard': {
    enabled: true,
  },
});

export default config;
