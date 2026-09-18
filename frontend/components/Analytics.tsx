import Script from "next/script";

/**
 * Google Analytics 4.
 *
 * The legacy site carried a GA tag (G-TFFRR5QM5E) that was not brought across
 * during the migration, so the site ran with no analytics at all from cutover
 * until this was added — a gap in the traffic history that cannot be
 * backfilled. This is a new property rather than the old one.
 *
 * The measurement ID is not a secret: it ships in the client bundle by design,
 * and knowing it lets someone send events to the property, nothing more. So it
 * is hardcoded as a default rather than made a required env var — a missing env
 * var here would silently mean no analytics again, which is exactly the failure
 * being fixed. NEXT_PUBLIC_GA_MEASUREMENT_ID still overrides it, so the
 * property can be changed without editing code.
 *
 * `afterInteractive` (next/script's default) loads the tag once the page is
 * interactive: early enough to record the visit, late enough not to compete
 * with rendering. `beforeInteractive` would block hydration for a script that
 * has no effect on what the user sees.
 *
 * Development is excluded so local page views don't contaminate the reports.
 *
 * TEMPORARY OVERLAP (16 Sep 2026): the same GA4 property is now also served
 * through Tag Manager (see GoogleTagManager.tsx). While both are live a visit
 * can be counted twice, so this component is to be deleted — along with its
 * <Analytics /> line in app/layout.tsx — as soon as GA4 Realtime and GTM
 * Preview confirm the container is reporting. Days, not weeks.
 *
 * DO NOT REMOVE YET (18 Sep 2026): GTM-KZ8GPMCB has never been published —
 * googletagmanager.com/gtm.js?id=GTM-KZ8GPMCB returns 404 — so this tag is
 * the only thing sending data to GA4. Deleting it now would stop analytics
 * entirely. Publish the container (with a GA4 tag for G-DWYWTG8VYD), confirm
 * it in Realtime, and only then remove this component. The conversion events
 * in lib/analytics-events.ts go through window.gtag/dataLayer and keep
 * working either way.
 */

const MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-CGZ6P2RNPN";

export default function Analytics() {
  if (process.env.NODE_ENV !== "production" || !MEASUREMENT_ID) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      {/*
        An `id` is required on inline scripts for Next to track and dedupe them
        across navigations — without one it can be injected more than once.
      */}
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
