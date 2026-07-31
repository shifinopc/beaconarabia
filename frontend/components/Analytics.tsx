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
