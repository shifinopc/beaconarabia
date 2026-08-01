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
   * Installed, made to work, then removed to reduce this deployment's process
   * footprint. Its @google-analytics/data dependency pulls in gRPC and
   * protobuf — native code that spawns its own threads — on a shared host that
   * has repeatedly run out of them (pthread_create / fork: Resource
   * temporarily unavailable, taking both apps down). It is the largest single
   * saving available on the CMS side.
   *
   * Nothing measurable is lost. The plugin only *displayed* analytics; it never
   * collected any. Collection is the gtag snippet in the frontend
   * (components/Analytics.tsx) and is untouched — the same numbers are on
   * analytics.google.com.
   *
   * Two other reasons not to reinstate it casually. At v0.0.2 (still the newest
   * release) all three of its routes declare auth: false, so the settings
   * endpoint holding a Google Cloud service-account key is world-readable and
   * world-writable — verified against the published package. And on Strapi 5.51
   * its dashboard only renders if the host app registers Chart.js itself, which
   * is why chart.js and react-chartjs-2 were direct dependencies here.
   */
});

export default config;
