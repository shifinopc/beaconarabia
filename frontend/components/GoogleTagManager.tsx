import Script from "next/script";

/**
 * Google Tag Manager container GTM-KZ8GPMCB.
 *
 * GTM replaces the hardcoded gtag.js block in Analytics.tsx: the GA4 property
 * is configured as a tag inside the container instead, so measurement changes
 * become a GTM edit rather than a deploy. Both are deliberately live at once
 * for the moment — see the note in Analytics.tsx — because pageviews must be
 * confirmed arriving through the container before the direct tag is removed.
 *
 * The container ID is not a secret: it ships in the client bundle by design.
 * It is hardcoded as a default for the same reason the measurement ID is — a
 * missing env var would silently mean no analytics — with NEXT_PUBLIC_GTM_ID
 * available to point a deployment at a different container.
 *
 * Google's published snippet goes in <head> and runs as early as possible.
 * `afterInteractive` is a deliberate departure: it loads the container once the
 * page is interactive, which records the visit without competing with
 * rendering. The alternative, `beforeInteractive`, blocks hydration on a
 * third-party script — the cost that made this site slow on the legacy stack.
 *
 * Development is excluded so local page views don't contaminate the reports.
 */

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-KZ8GPMCB";

const enabled = () => process.env.NODE_ENV === "production" && !!GTM_ID;

export default function GoogleTagManager() {
  if (!enabled()) return null;

  return (
    // An `id` is required on inline scripts for Next to track and dedupe them
    // across client-side navigations — without one it can be injected twice.
    <Script id="gtm-init" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
    </Script>
  );
}

/**
 * The <noscript> half of Google's snippet, which belongs immediately after the
 * opening <body> tag.
 *
 * It counts visitors with JavaScript disabled, which is a small number here but
 * also the crawlers and privacy-blocked browsers that never run the tag above.
 * Nothing renders: the iframe is hidden and zero-sized.
 */
export function GoogleTagManagerNoScript() {
  if (!enabled()) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  );
}
