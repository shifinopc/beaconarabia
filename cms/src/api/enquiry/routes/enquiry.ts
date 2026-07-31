import { factories } from '@strapi/strapi';

/**
 * Enquiry routes.
 *
 * Creation is rate-limited per IP on top of the global limiter, which exempts
 * authenticated callers — and the frontend authenticates, so without this a
 * token holder could write without bound. A contact form is the one endpoint on
 * this API that accepts writes, so it gets its own ceiling regardless of who is
 * calling.
 *
 * Reading is not exposed publicly: enquiries contain personal data and are read
 * through the admin panel, which authenticates separately.
 */
export default factories.createCoreRouter('api::enquiry.enquiry', {
  config: {
    create: {
      middlewares: [
        {
          name: 'global::rate-limit',
          config: { max: 10, windowMs: 60_000, bucket: 'enquiry-create' },
        },
      ],
    },
  },
});
