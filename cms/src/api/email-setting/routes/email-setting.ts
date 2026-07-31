import { factories } from '@strapi/strapi';

/**
 * Default routes only. These are never granted to the public role
 * (see PUBLIC_READABLE in src/index.ts, which deliberately omits this type):
 * the entry holds an SMTP password, and is edited through the admin panel.
 */
export default factories.createCoreRouter('api::email-setting.email-setting');
